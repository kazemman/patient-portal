import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clinicAppointments, clinicPatients, staff, departments } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single appointment by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const appointment = await db.select({
        id: clinicAppointments.id,
        patientId: clinicAppointments.patientId,
        staffId: clinicAppointments.staffId,
        appointmentDate: clinicAppointments.appointmentDate,
        appointmentTime: clinicAppointments.appointmentTime,
        duration: clinicAppointments.duration,
        status: clinicAppointments.status,
        reason: clinicAppointments.reason,
        notes: clinicAppointments.notes,
        departmentId: clinicAppointments.departmentId,
        priority: clinicAppointments.priority,
        createdAt: clinicAppointments.createdAt,
        updatedAt: clinicAppointments.updatedAt,
        patient: {
          id: clinicPatients.id,
          firstName: clinicPatients.firstName,
          lastName: clinicPatients.lastName,
          email: clinicPatients.email,
          phone: clinicPatients.phone
        },
        staff: {
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          department: staff.department
        },
        department: {
          id: departments.id,
          name: departments.name
        }
      })
      .from(clinicAppointments)
      .leftJoin(clinicPatients, eq(clinicAppointments.patientId, clinicPatients.id))
      .leftJoin(staff, eq(clinicAppointments.staffId, staff.id))
      .leftJoin(departments, eq(clinicAppointments.departmentId, departments.id))
      .where(eq(clinicAppointments.id, parseInt(id)))
      .limit(1);

      if (appointment.length === 0) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      return NextResponse.json(appointment[0]);
    }

    // List appointments with filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const patientId = searchParams.get('patientId');
    const staffId = searchParams.get('staffId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sort = searchParams.get('sort') || 'appointmentDate';
    const order = searchParams.get('order') || 'desc';

    let query = db.select({
      id: clinicAppointments.id,
      patientId: clinicAppointments.patientId,
      staffId: clinicAppointments.staffId,
      appointmentDate: clinicAppointments.appointmentDate,
      appointmentTime: clinicAppointments.appointmentTime,
      duration: clinicAppointments.duration,
      status: clinicAppointments.status,
      reason: clinicAppointments.reason,
      notes: clinicAppointments.notes,
      departmentId: clinicAppointments.departmentId,
      priority: clinicAppointments.priority,
      createdAt: clinicAppointments.createdAt,
      updatedAt: clinicAppointments.updatedAt,
      patient: {
        id: clinicPatients.id,
        firstName: clinicPatients.firstName,
        lastName: clinicPatients.lastName,
        email: clinicPatients.email,
        phone: clinicPatients.phone
      },
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role,
        department: staff.department
      }
    })
    .from(clinicAppointments)
    .leftJoin(clinicPatients, eq(clinicAppointments.patientId, clinicPatients.id))
    .leftJoin(staff, eq(clinicAppointments.staffId, staff.id));

    // Build where conditions
    const whereConditions = [];

    if (patientId) {
      whereConditions.push(eq(clinicAppointments.patientId, parseInt(patientId)));
    }

    if (staffId) {
      whereConditions.push(eq(clinicAppointments.staffId, parseInt(staffId)));
    }

    if (date) {
      whereConditions.push(eq(clinicAppointments.appointmentDate, date));
    }

    if (status) {
      whereConditions.push(eq(clinicAppointments.status, status));
    }

    if (departmentId) {
      whereConditions.push(eq(clinicAppointments.departmentId, parseInt(departmentId)));
    }

    if (startDate && endDate) {
      whereConditions.push(
        and(
          gte(clinicAppointments.appointmentDate, startDate),
          lte(clinicAppointments.appointmentDate, endDate)
        )
      );
    } else if (startDate) {
      whereConditions.push(gte(clinicAppointments.appointmentDate, startDate));
    } else if (endDate) {
      whereConditions.push(lte(clinicAppointments.appointmentDate, endDate));
    }

    if (search) {
      whereConditions.push(
        or(
          like(clinicAppointments.reason, `%${search}%`),
          like(clinicAppointments.notes, `%${search}%`),
          like(clinicPatients.firstName, `%${search}%`),
          like(clinicPatients.lastName, `%${search}%`)
        )
      );
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Add sorting
    const sortField = sort === 'appointmentDate' ? clinicAppointments.appointmentDate :
                      sort === 'createdAt' ? clinicAppointments.createdAt :
                      sort === 'status' ? clinicAppointments.status :
                      sort === 'priority' ? clinicAppointments.priority :
                      clinicAppointments.appointmentDate;

    if (order === 'asc') {
      query = query.orderBy(asc(sortField));
    } else {
      query = query.orderBy(desc(sortField));
    }

    const results = await query.limit(limit).offset(offset);

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
    
    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      patientId, 
      staffId, 
      appointmentDate, 
      appointmentTime, 
      reason,
      duration = 30,
      notes,
      departmentId,
      priority = 'normal'
    } = requestBody;

    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!staffId) {
      return NextResponse.json({ 
        error: "Staff ID is required",
        code: "MISSING_STAFF_ID" 
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

    if (!reason) {
      return NextResponse.json({ 
        error: "Reason is required",
        code: "MISSING_REASON" 
      }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(appointmentDate)) {
      return NextResponse.json({ 
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      return NextResponse.json({ 
        error: "Invalid time format. Use HH:MM",
        code: "INVALID_TIME_FORMAT" 
      }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];
    const status = 'scheduled'; // Default status

    // Validate priority
    const validPriorities = ['high', 'normal', 'low'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ 
        error: "Priority must be one of: high, normal, low",
        code: "INVALID_PRIORITY" 
      }, { status: 400 });
    }

    // Validate patient exists
    const patient = await db.select()
      .from(clinicPatients)
      .where(eq(clinicPatients.id, parseInt(patientId)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate staff exists
    const staffMember = await db.select()
      .from(staff)
      .where(eq(staff.id, parseInt(staffId)))
      .limit(1);

    if (staffMember.length === 0) {
      return NextResponse.json({ 
        error: "Staff member not found",
        code: "STAFF_NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate department exists (if provided)
    if (departmentId) {
      const department = await db.select()
        .from(departments)
        .where(eq(departments.id, parseInt(departmentId)))
        .limit(1);

      if (department.length === 0) {
        return NextResponse.json({ 
          error: "Department not found",
          code: "DEPARTMENT_NOT_FOUND" 
        }, { status: 404 });
      }
    }

    // Check for scheduling conflicts
    const appointmentStart = new Date(`${appointmentDate}T${appointmentTime}`);
    const appointmentEnd = new Date(appointmentStart.getTime() + (duration * 60000));

    const conflicts = await db.select()
      .from(clinicAppointments)
      .where(
        and(
          eq(clinicAppointments.staffId, parseInt(staffId)),
          eq(clinicAppointments.appointmentDate, appointmentDate),
          or(
            eq(clinicAppointments.status, 'scheduled'),
            eq(clinicAppointments.status, 'checked-in'),
            eq(clinicAppointments.status, 'in-progress')
          )
        )
      );

    for (const conflict of conflicts) {
      const conflictStart = new Date(`${conflict.appointmentDate}T${conflict.appointmentTime}`);
      const conflictEnd = new Date(conflictStart.getTime() + ((conflict.duration || 30) * 60000));

      if ((appointmentStart < conflictEnd) && (appointmentEnd > conflictStart)) {
        return NextResponse.json({ 
          error: "Scheduling conflict detected",
          code: "SCHEDULING_CONFLICT" 
        }, { status: 400 });
      }
    }

    const now = new Date().toISOString();

    const newAppointment = await db.insert(clinicAppointments)
      .values({
        patientId: parseInt(patientId),
        staffId: parseInt(staffId),
        appointmentDate,
        appointmentTime,
        duration,
        status,
        reason: reason.trim(),
        notes: notes ? notes.trim() : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        priority,
        createdAt: now,
        updatedAt: now
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
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if appointment exists
    const existingAppointment = await db.select()
      .from(clinicAppointments)
      .where(eq(clinicAppointments.id, parseInt(id)))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const { 
      patientId, 
      staffId, 
      appointmentDate, 
      appointmentTime, 
      duration,
      status,
      reason,
      notes,
      departmentId,
      priority
    } = requestBody;

    const updates: any = { updatedAt: new Date().toISOString() };

    // Validate and update fields if provided
    if (patientId !== undefined) {
      const patient = await db.select()
        .from(clinicPatients)
        .where(eq(clinicPatients.id, parseInt(patientId)))
        .limit(1);

      if (patient.length === 0) {
        return NextResponse.json({ 
          error: "Patient not found",
          code: "PATIENT_NOT_FOUND" 
        }, { status: 404 });
      }
      updates.patientId = parseInt(patientId);
    }

    if (staffId !== undefined) {
      const staffMember = await db.select()
        .from(staff)
        .where(eq(staff.id, parseInt(staffId)))
        .limit(1);

      if (staffMember.length === 0) {
        return NextResponse.json({ 
          error: "Staff member not found",
          code: "STAFF_NOT_FOUND" 
        }, { status: 404 });
      }
      updates.staffId = parseInt(staffId);
    }

    if (appointmentDate !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(appointmentDate)) {
        return NextResponse.json({ 
          error: "Invalid date format. Use YYYY-MM-DD",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
      updates.appointmentDate = appointmentDate;
    }

    if (appointmentTime !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(appointmentTime)) {
        return NextResponse.json({ 
          error: "Invalid time format. Use HH:MM",
          code: "INVALID_TIME_FORMAT" 
        }, { status: 400 });
      }
      updates.appointmentTime = appointmentTime;
    }

    if (duration !== undefined) {
      updates.duration = duration;
    }

    if (status !== undefined) {
      const validStatuses = ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ 
          error: "Invalid status",
          code: "INVALID_STATUS" 
        }, { status: 400 });
      }
      updates.status = status;
    }

    if (reason !== undefined) {
      if (!reason.trim()) {
        return NextResponse.json({ 
          error: "Reason cannot be empty",
          code: "EMPTY_REASON" 
        }, { status: 400 });
      }
      updates.reason = reason.trim();
    }

    if (notes !== undefined) {
      updates.notes = notes ? notes.trim() : null;
    }

    if (departmentId !== undefined) {
      if (departmentId) {
        const department = await db.select()
          .from(departments)
          .where(eq(departments.id, parseInt(departmentId)))
          .limit(1);

        if (department.length === 0) {
          return NextResponse.json({ 
            error: "Department not found",
            code: "DEPARTMENT_NOT_FOUND" 
          }, { status: 404 });
        }
        updates.departmentId = parseInt(departmentId);
      } else {
        updates.departmentId = null;
      }
    }

    if (priority !== undefined) {
      const validPriorities = ['high', 'normal', 'low'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ 
          error: "Priority must be one of: high, normal, low",
          code: "INVALID_PRIORITY" 
        }, { status: 400 });
      }
      updates.priority = priority;
    }

    // Check for scheduling conflicts if date/time/staff changes
    if (appointmentDate !== undefined || appointmentTime !== undefined || staffId !== undefined || duration !== undefined) {
      const checkDate = appointmentDate || existingAppointment[0].appointmentDate;
      const checkTime = appointmentTime || existingAppointment[0].appointmentTime;
      const checkStaffId = updates.staffId || existingAppointment[0].staffId;
      const checkDuration = updates.duration || existingAppointment[0].duration || 30;

      const appointmentStart = new Date(`${checkDate}T${checkTime}`);
      const appointmentEnd = new Date(appointmentStart.getTime() + (checkDuration * 60000));

      const conflicts = await db.select()
        .from(clinicAppointments)
        .where(
          and(
            eq(clinicAppointments.staffId, checkStaffId),
            eq(clinicAppointments.appointmentDate, checkDate),
            or(
              eq(clinicAppointments.status, 'scheduled'),
              eq(clinicAppointments.status, 'checked-in'),
              eq(clinicAppointments.status, 'in-progress')
            )
          )
        );

      for (const conflict of conflicts) {
        // Skip the current appointment being updated
        if (conflict.id === parseInt(id)) continue;

        const conflictStart = new Date(`${conflict.appointmentDate}T${conflict.appointmentTime}`);
        const conflictEnd = new Date(conflictStart.getTime() + ((conflict.duration || 30) * 60000));

        if ((appointmentStart < conflictEnd) && (appointmentEnd > conflictStart)) {
          return NextResponse.json({ 
            error: "Scheduling conflict detected",
            code: "SCHEDULING_CONFLICT" 
          }, { status: 400 });
        }
      }
    }

    const updated = await db.update(clinicAppointments)
      .set(updates)
      .where(eq(clinicAppointments.id, parseInt(id)))
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
      .from(clinicAppointments)
      .where(eq(clinicAppointments.id, parseInt(id)))
      .limit(1);

    if (existingAppointment.length === 0) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Set status to cancelled instead of physically deleting
    const cancelled = await db.update(clinicAppointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })
      .where(eq(clinicAppointments.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Appointment cancelled successfully',
      appointment: cancelled[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}