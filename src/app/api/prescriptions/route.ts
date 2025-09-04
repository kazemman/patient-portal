import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prescriptions, patients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

const VALID_STATUSES = ['active', 'expired', 'discontinued'];

function validateDateFormat(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const prescription = await db.select()
        .from(prescriptions)
        .where(eq(prescriptions.id, parseInt(id)))
        .limit(1);

      if (prescription.length === 0) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
      }

      return NextResponse.json(prescription[0]);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? asc : desc;

    let query = db.select().from(prescriptions);
    let conditions = [];

    if (search) {
      conditions.push(like(prescriptions.medicationName, `%${search}%`));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ 
          error: "Invalid status. Must be one of: active, expired, discontinued",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      conditions.push(eq(prescriptions.status, status));
    }

    if (patientId) {
      if (isNaN(parseInt(patientId))) {
        return NextResponse.json({ 
          error: "Valid patient ID is required",
          code: "INVALID_PATIENT_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(prescriptions.patientId, parseInt(patientId)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(order(prescriptions[sort as keyof typeof prescriptions] || prescriptions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const requestBody = await request.json();
    
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const {
      patientId,
      medicationName,
      dosage,
      frequency,
      startDate,
      endDate,
      doctorName,
      status
    } = requestBody;

    // Validate required fields
    if (!patientId || !medicationName || !dosage || !frequency || !startDate || !doctorName || !status) {
      return NextResponse.json({ 
        error: "Missing required fields: patientId, medicationName, dosage, frequency, startDate, doctorName, status",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    // Validate patientId is number
    if (isNaN(parseInt(patientId))) {
      return NextResponse.json({ 
        error: "Patient ID must be a valid number",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be one of: active, expired, discontinued",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate start date format
    if (!validateDateFormat(startDate)) {
      return NextResponse.json({ 
        error: "Start date must be in ISO format (YYYY-MM-DD)",
        code: "INVALID_START_DATE" 
      }, { status: 400 });
    }

    // Validate end date format if provided
    if (endDate && !validateDateFormat(endDate)) {
      return NextResponse.json({ 
        error: "End date must be in ISO format (YYYY-MM-DD)",
        code: "INVALID_END_DATE" 
      }, { status: 400 });
    }

    // Validate patientId exists
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, parseInt(patientId)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 400 });
    }

    const insertData = {
      patientId: parseInt(patientId),
      medicationName: medicationName.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      startDate,
      endDate: endDate || null,
      doctorName: doctorName.trim(),
      status,
      createdAt: new Date().toISOString()
    };

    const newPrescription = await db.insert(prescriptions)
      .values(insertData)
      .returning();

    return NextResponse.json(newPrescription[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if prescription exists
    const existingPrescription = await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.id, parseInt(id)))
      .limit(1);

    if (existingPrescription.length === 0) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and update fields if provided
    if (requestBody.patientId !== undefined) {
      if (isNaN(parseInt(requestBody.patientId))) {
        return NextResponse.json({ 
          error: "Patient ID must be a valid number",
          code: "INVALID_PATIENT_ID" 
        }, { status: 400 });
      }

      // Validate patientId exists
      const patient = await db.select()
        .from(patients)
        .where(eq(patients.id, parseInt(requestBody.patientId)))
        .limit(1);

      if (patient.length === 0) {
        return NextResponse.json({ 
          error: "Patient not found",
          code: "PATIENT_NOT_FOUND" 
        }, { status: 400 });
      }

      updates.patientId = parseInt(requestBody.patientId);
    }

    if (requestBody.medicationName !== undefined) {
      if (!requestBody.medicationName.trim()) {
        return NextResponse.json({ 
          error: "Medication name cannot be empty",
          code: "INVALID_MEDICATION_NAME" 
        }, { status: 400 });
      }
      updates.medicationName = requestBody.medicationName.trim();
    }

    if (requestBody.dosage !== undefined) {
      if (!requestBody.dosage.trim()) {
        return NextResponse.json({ 
          error: "Dosage cannot be empty",
          code: "INVALID_DOSAGE" 
        }, { status: 400 });
      }
      updates.dosage = requestBody.dosage.trim();
    }

    if (requestBody.frequency !== undefined) {
      if (!requestBody.frequency.trim()) {
        return NextResponse.json({ 
          error: "Frequency cannot be empty",
          code: "INVALID_FREQUENCY" 
        }, { status: 400 });
      }
      updates.frequency = requestBody.frequency.trim();
    }

    if (requestBody.startDate !== undefined) {
      if (!validateDateFormat(requestBody.startDate)) {
        return NextResponse.json({ 
          error: "Start date must be in ISO format (YYYY-MM-DD)",
          code: "INVALID_START_DATE" 
        }, { status: 400 });
      }
      updates.startDate = requestBody.startDate;
    }

    if (requestBody.endDate !== undefined) {
      if (requestBody.endDate && !validateDateFormat(requestBody.endDate)) {
        return NextResponse.json({ 
          error: "End date must be in ISO format (YYYY-MM-DD)",
          code: "INVALID_END_DATE" 
        }, { status: 400 });
      }
      updates.endDate = requestBody.endDate || null;
    }

    if (requestBody.doctorName !== undefined) {
      if (!requestBody.doctorName.trim()) {
        return NextResponse.json({ 
          error: "Doctor name cannot be empty",
          code: "INVALID_DOCTOR_NAME" 
        }, { status: 400 });
      }
      updates.doctorName = requestBody.doctorName.trim();
    }

    if (requestBody.status !== undefined) {
      if (!VALID_STATUSES.includes(requestBody.status)) {
        return NextResponse.json({ 
          error: "Invalid status. Must be one of: active, expired, discontinued",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = requestBody.status;
    }

    const updated = await db.update(prescriptions)
      .set(updates)
      .where(eq(prescriptions.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if prescription exists
    const existingPrescription = await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.id, parseInt(id)))
      .limit(1);

    if (existingPrescription.length === 0) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    const deleted = await db.delete(prescriptions)
      .where(eq(prescriptions.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Prescription deleted successfully',
      prescription: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}