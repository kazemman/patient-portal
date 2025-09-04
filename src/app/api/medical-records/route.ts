import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicalRecords, patients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

const VALID_RECORD_TYPES = ['lab_result', 'prescription', 'visit_note', 'imaging'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get single medical record by ID
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const record = await db.select()
        .from(medicalRecords)
        .where(eq(medicalRecords.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json({ error: 'Medical record not found' }, { status: 404 });
      }

      return NextResponse.json(record[0]);
    } else {
      // List medical records with pagination, search, and filters
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const search = searchParams.get('search');
      const recordType = searchParams.get('recordType');
      const patientId = searchParams.get('patientId');
      const sort = searchParams.get('sort') || 'createdAt';
      const order = searchParams.get('order') || 'desc';

      let query = db.select().from(medicalRecords);

      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(
          or(
            like(medicalRecords.title, `%${search}%`),
            like(medicalRecords.description, `%${search}%`)
          )
        );
      }

      if (recordType) {
        conditions.push(eq(medicalRecords.recordType, recordType));
      }

      if (patientId) {
        if (isNaN(parseInt(patientId))) {
          return NextResponse.json({ 
            error: "Valid patient ID is required",
            code: "INVALID_PATIENT_ID" 
          }, { status: 400 });
        }
        conditions.push(eq(medicalRecords.patientId, parseInt(patientId)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const orderBy = order === 'asc' ? asc : desc;
      if (sort === 'recordDate') {
        query = query.orderBy(orderBy(medicalRecords.recordDate));
      } else if (sort === 'title') {
        query = query.orderBy(orderBy(medicalRecords.title));
      } else {
        query = query.orderBy(orderBy(medicalRecords.createdAt));
      }

      const results = await query.limit(limit).offset(offset);
      return NextResponse.json(results);
    }
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
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { patientId, recordDate, recordType, title, description, doctorName } = requestBody;

    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!recordDate) {
      return NextResponse.json({ 
        error: "Record date is required",
        code: "MISSING_RECORD_DATE" 
      }, { status: 400 });
    }

    if (!recordType) {
      return NextResponse.json({ 
        error: "Record type is required",
        code: "MISSING_RECORD_TYPE" 
      }, { status: 400 });
    }

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ 
        error: "Title is required",
        code: "MISSING_TITLE" 
      }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ 
        error: "Description is required",
        code: "MISSING_DESCRIPTION" 
      }, { status: 400 });
    }

    if (!doctorName || typeof doctorName !== 'string' || doctorName.trim() === '') {
      return NextResponse.json({ 
        error: "Doctor name is required",
        code: "MISSING_DOCTOR_NAME" 
      }, { status: 400 });
    }

    // Validate patientId is valid integer
    if (isNaN(parseInt(patientId))) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate recordType
    if (!VALID_RECORD_TYPES.includes(recordType)) {
      return NextResponse.json({ 
        error: `Record type must be one of: ${VALID_RECORD_TYPES.join(', ')}`,
        code: "INVALID_RECORD_TYPE" 
      }, { status: 400 });
    }

    // Validate recordDate is valid ISO date
    const parsedDate = new Date(recordDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ 
        error: "Valid record date is required (ISO format)",
        code: "INVALID_RECORD_DATE" 
      }, { status: 400 });
    }

    // Validate patient exists
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

    // Create new medical record
    const newRecord = await db.insert(medicalRecords)
      .values({
        patientId: parseInt(patientId),
        recordDate: recordDate,
        recordType: recordType,
        title: title.trim(),
        description: description.trim(),
        doctorName: doctorName.trim(),
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newRecord[0], { status: 201 });
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
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if record exists
    const existingRecord = await db.select()
      .from(medicalRecords)
      .where(eq(medicalRecords.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 });
    }

    const { patientId, recordDate, recordType, title, description, doctorName } = requestBody;
    const updates: any = {};

    // Validate and set patientId if provided
    if (patientId !== undefined) {
      if (isNaN(parseInt(patientId))) {
        return NextResponse.json({ 
          error: "Valid patient ID is required",
          code: "INVALID_PATIENT_ID" 
        }, { status: 400 });
      }

      // Validate patient exists
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

      updates.patientId = parseInt(patientId);
    }

    // Validate and set recordDate if provided
    if (recordDate !== undefined) {
      const parsedDate = new Date(recordDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ 
          error: "Valid record date is required (ISO format)",
          code: "INVALID_RECORD_DATE" 
        }, { status: 400 });
      }
      updates.recordDate = recordDate;
    }

    // Validate and set recordType if provided
    if (recordType !== undefined) {
      if (!VALID_RECORD_TYPES.includes(recordType)) {
        return NextResponse.json({ 
          error: `Record type must be one of: ${VALID_RECORD_TYPES.join(', ')}`,
          code: "INVALID_RECORD_TYPE" 
        }, { status: 400 });
      }
      updates.recordType = recordType;
    }

    // Validate and set title if provided
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return NextResponse.json({ 
          error: "Title cannot be empty",
          code: "INVALID_TITLE" 
        }, { status: 400 });
      }
      updates.title = title.trim();
    }

    // Validate and set description if provided
    if (description !== undefined) {
      if (!description || typeof description !== 'string' || description.trim() === '') {
        return NextResponse.json({ 
          error: "Description cannot be empty",
          code: "INVALID_DESCRIPTION" 
        }, { status: 400 });
      }
      updates.description = description.trim();
    }

    // Validate and set doctorName if provided
    if (doctorName !== undefined) {
      if (!doctorName || typeof doctorName !== 'string' || doctorName.trim() === '') {
        return NextResponse.json({ 
          error: "Doctor name cannot be empty",
          code: "INVALID_DOCTOR_NAME" 
        }, { status: 400 });
      }
      updates.doctorName = doctorName.trim();
    }

    // If no updates provided, return error
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: "No valid fields provided for update",
        code: "NO_UPDATE_FIELDS" 
      }, { status: 400 });
    }

    // Always update updatedAt timestamp
    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(medicalRecords)
      .set(updates)
      .where(eq(medicalRecords.id, parseInt(id)))
      .returning();

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

    // Check if record exists before deleting
    const existingRecord = await db.select()
      .from(medicalRecords)
      .where(eq(medicalRecords.id, parseInt(id)))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ error: 'Medical record not found' }, { status: 404 });
    }

    const deleted = await db.delete(medicalRecords)
      .where(eq(medicalRecords.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Medical record deleted successfully',
      deletedRecord: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}