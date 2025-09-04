import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, patients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get single appointment by ID
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const appointment = await db.select()
        .from(appointments)
        .where(eq(appointments.id, parseInt(id)))
        .limit(1);

      if (appointment.length === 0) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      return NextResponse.json(appointment[0]);
    } else {
      // List appointments with pagination, search, and filters
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');
      const search = searchParams.get('search');
      const status = searchParams.get('status');
      const patientId = searchParams.get('patientId');
      const sort = searchParams.get('sort') || 'createdAt';
      const order = searchParams.get('order') || 'desc';

      let query = db.select().from(appointments);
      let conditions = [];

      if (search) {
        conditions.push(
          or(
            like(appointments.doctorName, `%${search}%`),
            like(appointments.reason, `%${search}%`)
          )
        );
      }

      if (status) {
        conditions.push(eq(appointments.status, status));
      }

      if (patientId && !isNaN(parseInt(patientId))) {
        conditions.push(eq(appointments.patientId, parseInt(patientId)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting
      const sortColumn = appointments[sort as keyof typeof appointments] || appointments.createdAt;
      query = order === 'asc' 
        ? query.orderBy(asc(sortColumn))
        : query.orderBy(desc(sortColumn));

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
    const { patientId, doctorName, appointmentDate, appointmentTime, status, reason, notes } = requestBody;

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody || 'authorId' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!doctorName || !doctorName.trim()) {
      return NextResponse.json({ 
        error: "Doctor name is required",
        code: "MISSING_DOCTOR_NAME" 
      }, { status: 400 });
    }

    if (!appointmentDate) {
      return NextResponse.json({ 
        error: "Appointment date is required",
        code: "MISSING_APPOINTMENT_DATE" 
      }, { status: 400 });
    }

    if (!appointmentTime) {
      return NextResponse.json({ 
        error: "Appointment time is required",
        code: "MISSING_APPOINTMENT_TIME" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ 
        error: "Reason is required",
        code: "MISSING_REASON" 
      }, { status: 400 });
    }

    // Validate patientId is a valid integer
    if (isNaN(parseInt(patientId.toString()))) {
      return NextResponse.json({ 
        error: "Patient ID must be a valid number",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate patientId exists
    const patientExists = await db.select()
      .from(patients)
      .where(eq(patients.id, parseInt(patientId.toString())))
      .limit(1);

    if (patientExists.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 400 });
    }

    // Validate status values
    const validStatuses = ['scheduled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: "Status must be one of: scheduled, completed, cancelled",
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Validate date format (ISO date)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentDate)) {
      return NextResponse.json({ 
        error: "Appointment date must be in YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      return NextResponse.json({ 
        error: "Appointment time must be in HH:MM format",
        code: "INVALID_TIME_FORMAT" 
      }, { status: 400 });
    }

    // Validate date is not in the past
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    if (appointmentDateTime < new Date()) {
      return NextResponse.json({ 
        error: "Appointment date and time cannot be in the past",
        code: "PAST_APPOINTMENT" 
      }, { status: 400 });
    }

    const newAppointment = await db.insert(appointments)
      .values({
        patientId: parseInt(patientId.toString()),
        doctorName: doctorName.trim(),
        appointmentDate,
        appointmentTime,
        status,
        reason: reason.trim(),
        notes: notes?.trim() || null,
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newAppointment[0], { status: 201 });
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
    if ('userId' in requestBody || 'user_id' in requestBody || 'authorId' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if appointment exists
    const existingAppointment = await db.select()
      .from(appointments)
      .where(eq(appointments.id, parseInt(id)))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updates: any = {};

    // Validate and update fields if provided
    if (requestBody.patientId !== undefined) {
      if (isNaN(parseInt(requestBody.patientId.toString()))) {
        return NextResponse.json({ 
          error: "Patient ID must be a valid number",
          code: "INVALID_PATIENT_ID" 
        }, { status: 400 });
      }

      const patientExists = await db.select()
        .from(patients)
        .where(eq(patients.id, parseInt(requestBody.patientId.toString())))
        .limit(1);

      if (patientExists.length === 0) {
        return NextResponse.json({ 
          error: "Patient not found",
          code: "PATIENT_NOT_FOUND" 
        }, { status: 400 });
      }

      updates.patientId = parseInt(requestBody.patientId.toString());
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

    if (requestBody.appointmentDate !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(requestBody.appointmentDate)) {
        return NextResponse.json({ 
          error: "Appointment date must be in YYYY-MM-DD format",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
      updates.appointmentDate = requestBody.appointmentDate;
    }

    if (requestBody.appointmentTime !== undefined) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(requestBody.appointmentTime)) {
        return NextResponse.json({ 
          error: "Appointment time must be in HH:MM format",
          code: "INVALID_TIME_FORMAT" 
        }, { status: 400 });
      }
      updates.appointmentTime = requestBody.appointmentTime;
    }

    if (requestBody.status !== undefined) {
      const validStatuses = ['scheduled', 'completed', 'cancelled'];
      if (!validStatuses.includes(requestBody.status)) {
        return NextResponse.json({ 
          error: "Status must be one of: scheduled, completed, cancelled",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = requestBody.status;
    }

    if (requestBody.reason !== undefined) {
      if (!requestBody.reason.trim()) {
        return NextResponse.json({ 
          error: "Reason cannot be empty",
          code: "INVALID_REASON" 
        }, { status: 400 });
      }
      updates.reason = requestBody.reason.trim();
    }

    if (requestBody.notes !== undefined) {
      updates.notes = requestBody.notes?.trim() || null;
    }

    // Validate date/time combination is not in the past (if either is being updated)
    if (updates.appointmentDate || updates.appointmentTime) {
      const currentAppointment = existingAppointment[0];
      const newDate = updates.appointmentDate || currentAppointment.appointmentDate;
      const newTime = updates.appointmentTime || currentAppointment.appointmentTime;
      const appointmentDateTime = new Date(`${newDate}T${newTime}`);
      
      if (appointmentDateTime < new Date()) {
        return NextResponse.json({ 
          error: "Appointment date and time cannot be in the past",
          code: "PAST_APPOINTMENT" 
        }, { status: 400 });
      }
    }

    // Always update the updatedAt field (but appointments table doesn't have it in schema)
    // Only update if there are actual changes
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        error: "No valid fields to update",
        code: "NO_UPDATES" 
      }, { status: 400 });
    }

    const updated = await db.update(appointments)
      .set(updates)
      .where(eq(appointments.id, parseInt(id)))
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

    // Check if appointment exists
    const existingAppointment = await db.select()
      .from(appointments)
      .where(eq(appointments.id, parseInt(id)))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const deleted = await db.delete(appointments)
      .where(eq(appointments.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Appointment deleted successfully',
      deletedAppointment: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}