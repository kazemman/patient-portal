import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins, clinicPatients, clinicAppointments, staff, queue } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lte, max } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const patientId = searchParams.get('patientId');
    const date = searchParams.get('date');
    const sort = searchParams.get('sort') || 'checkinTime';
    const order = searchParams.get('order') || 'desc';

    // Default to today's check-ins
    const filterDate = date || new Date().toISOString().split('T')[0];
    
    let query = db.select({
      id: checkins.id,
      patientId: checkins.patientId,
      appointmentId: checkins.appointmentId,
      checkinTime: checkins.checkinTime,
      status: checkins.status,
      queueNumber: checkins.queueNumber,
      waitingTime: checkins.waitingTime,
      staffId: checkins.staffId,
      type: checkins.type,
      notes: checkins.notes,
      createdAt: checkins.createdAt,
      patient: {
        id: clinicPatients.id,
        firstName: clinicPatients.firstName,
        lastName: clinicPatients.lastName,
        phone: clinicPatients.phone,
        email: clinicPatients.email
      },
      appointment: {
        id: clinicAppointments.id,
        appointmentDate: clinicAppointments.appointmentDate,
        appointmentTime: clinicAppointments.appointmentTime,
        reason: clinicAppointments.reason,
        status: clinicAppointments.status
      },
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role
      }
    })
    .from(checkins)
    .leftJoin(clinicPatients, eq(checkins.patientId, clinicPatients.id))
    .leftJoin(clinicAppointments, eq(checkins.appointmentId, clinicAppointments.id))
    .leftJoin(staff, eq(checkins.staffId, staff.id));

    // Build where conditions
    const whereConditions = [];

    // Filter by date (check-ins for specific date)
    whereConditions.push(gte(checkins.checkinTime, `${filterDate} 00:00:00`));
    whereConditions.push(lte(checkins.checkinTime, `${filterDate} 23:59:59`));

    if (status) {
      whereConditions.push(eq(checkins.status, status));
    }

    if (type) {
      whereConditions.push(eq(checkins.type, type));
    }

    if (patientId) {
      whereConditions.push(eq(checkins.patientId, parseInt(patientId)));
    }

    if (search) {
      const searchCondition = or(
        like(clinicPatients.firstName, `%${search}%`),
        like(clinicPatients.lastName, `%${search}%`),
        like(clinicPatients.phone, `%${search}%`)
      );
      whereConditions.push(searchCondition);
    }

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Apply sorting
    const orderDirection = order === 'desc' ? desc : asc;
    if (sort === 'checkinTime') {
      query = query.orderBy(orderDirection(checkins.checkinTime));
    } else if (sort === 'queueNumber') {
      query = query.orderBy(orderDirection(checkins.queueNumber));
    } else if (sort === 'status') {
      query = query.orderBy(orderDirection(checkins.status));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET checkins error:', error);
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
    const { patientId, appointmentId, type, notes, staffId } = requestBody;

    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ 
        error: "Check-in type is required",
        code: "MISSING_TYPE" 
      }, { status: 400 });
    }

    if (type !== 'appointment' && type !== 'walk-in') {
      return NextResponse.json({ 
        error: "Type must be either 'appointment' or 'walk-in'",
        code: "INVALID_TYPE" 
      }, { status: 400 });
    }

    if (type === 'appointment' && !appointmentId) {
      return NextResponse.json({ 
        error: "Appointment ID is required for appointment check-ins",
        code: "MISSING_APPOINTMENT_ID" 
      }, { status: 400 });
    }

    // Validate patient exists
    const patient = await db.select()
      .from(clinicPatients)
      .where(eq(clinicPatients.id, parseInt(patientId)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    // Validate appointment exists (if provided)
    if (appointmentId) {
      const appointment = await db.select()
        .from(clinicAppointments)
        .where(and(
          eq(clinicAppointments.id, parseInt(appointmentId)),
          eq(clinicAppointments.patientId, parseInt(patientId))
        ))
        .limit(1);

      if (appointment.length === 0) {
        return NextResponse.json({ 
          error: 'Appointment not found or does not belong to patient',
          code: 'APPOINTMENT_NOT_FOUND' 
        }, { status: 404 });
      }
    }

    // Check for duplicate check-ins (same patient, same day)
    const today = new Date().toISOString().split('T')[0];
    const existingCheckin = await db.select()
      .from(checkins)
      .where(and(
        eq(checkins.patientId, parseInt(patientId)),
        gte(checkins.checkinTime, `${today} 00:00:00`),
        lte(checkins.checkinTime, `${today} 23:59:59`)
      ))
      .limit(1);

    if (existingCheckin.length > 0) {
      return NextResponse.json({ 
        error: 'Patient has already checked in today',
        code: 'DUPLICATE_CHECKIN' 
      }, { status: 400 });
    }

    // Generate next queue number for today
    const maxQueueResult = await db.select({ maxQueue: max(checkins.queueNumber) })
      .from(checkins)
      .where(and(
        gte(checkins.checkinTime, `${today} 00:00:00`),
        lte(checkins.checkinTime, `${today} 23:59:59`)
      ));

    const nextQueueNumber = (maxQueueResult[0]?.maxQueue || 0) + 1;
    const checkinTime = new Date().toISOString();

    // Create check-in record
    const newCheckin = await db.insert(checkins)
      .values({
        patientId: parseInt(patientId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        checkinTime,
        status: 'waiting',
        queueNumber: nextQueueNumber,
        staffId: staffId ? parseInt(staffId) : null,
        type,
        notes: notes || null,
        createdAt: checkinTime
      })
      .returning();

    // Create corresponding queue entry
    await db.insert(queue)
      .values({
        patientId: parseInt(patientId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        checkinId: newCheckin[0].id,
        queueNumber: nextQueueNumber,
        status: 'waiting',
        checkinTime,
        priority: type === 'appointment' ? 'high' : 'normal',
        staffId: staffId ? parseInt(staffId) : null,
        estimatedWaitTime: nextQueueNumber * 15, // 15 minutes per patient estimate
        createdAt: checkinTime,
        updatedAt: checkinTime
      });

    // Get full check-in details with patient and appointment info
    const checkinDetails = await db.select({
      id: checkins.id,
      patientId: checkins.patientId,
      appointmentId: checkins.appointmentId,
      checkinTime: checkins.checkinTime,
      status: checkins.status,
      queueNumber: checkins.queueNumber,
      waitingTime: checkins.waitingTime,
      staffId: checkins.staffId,
      type: checkins.type,
      notes: checkins.notes,
      createdAt: checkins.createdAt,
      patient: {
        firstName: clinicPatients.firstName,
        lastName: clinicPatients.lastName,
        phone: clinicPatients.phone
      },
      appointment: appointmentId ? {
        appointmentDate: clinicAppointments.appointmentDate,
        appointmentTime: clinicAppointments.appointmentTime,
        reason: clinicAppointments.reason
      } : null,
      queuePosition: nextQueueNumber,
      estimatedWaitTime: nextQueueNumber * 15
    })
    .from(checkins)
    .leftJoin(clinicPatients, eq(checkins.patientId, clinicPatients.id))
    .leftJoin(clinicAppointments, eq(checkins.appointmentId, clinicAppointments.id))
    .where(eq(checkins.id, newCheckin[0].id))
    .limit(1);

    return NextResponse.json(checkinDetails[0], { status: 201 });
  } catch (error) {
    console.error('POST checkins error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const requestBody = await request.json();
    const { status, staffId } = requestBody;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({ 
        error: "Status is required",
        code: "MISSING_STATUS" 
      }, { status: 400 });
    }

    const validStatuses = ['waiting', 'called', 'attended', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Check if check-in exists
    const existingCheckin = await db.select()
      .from(checkins)
      .where(eq(checkins.id, parseInt(id)))
      .limit(1);

    if (existingCheckin.length === 0) {
      return NextResponse.json({ 
        error: 'Check-in not found' 
      }, { status: 404 });
    }

    const currentCheckin = existingCheckin[0];
    const updateTime = new Date().toISOString();
    let waitingTime = currentCheckin.waitingTime;

    // Calculate waiting time for final statuses
    if (['attended', 'cancelled', 'no-show'].includes(status) && !waitingTime) {
      const checkinDate = new Date(currentCheckin.checkinTime);
      const currentDate = new Date();
      waitingTime = Math.floor((currentDate.getTime() - checkinDate.getTime()) / 60000); // minutes
    }

    // Update check-in
    const updated = await db.update(checkins)
      .set({
        status,
        waitingTime,
        staffId: staffId ? parseInt(staffId) : currentCheckin.staffId
      })
      .where(eq(checkins.id, parseInt(id)))
      .returning();

    // Update corresponding queue entry
    const queueStatus = status === 'called' ? 'called' : 
                       status === 'attended' ? 'completed' : 
                       ['cancelled', 'no-show'].includes(status) ? 'cancelled' : 'waiting';

    const queueUpdateData: any = {
      status: queueStatus,
      updatedAt: updateTime
    };

    if (status === 'called') {
      queueUpdateData.calledTime = updateTime;
    } else if (['attended', 'cancelled', 'no-show'].includes(status)) {
      queueUpdateData.completedTime = updateTime;
    }

    await db.update(queue)
      .set(queueUpdateData)
      .where(eq(queue.checkinId, parseInt(id)));

    // Get updated check-in with full details
    const updatedCheckin = await db.select({
      id: checkins.id,
      patientId: checkins.patientId,
      appointmentId: checkins.appointmentId,
      checkinTime: checkins.checkinTime,
      status: checkins.status,
      queueNumber: checkins.queueNumber,
      waitingTime: checkins.waitingTime,
      staffId: checkins.staffId,
      type: checkins.type,
      notes: checkins.notes,
      createdAt: checkins.createdAt,
      patient: {
        firstName: clinicPatients.firstName,
        lastName: clinicPatients.lastName,
        phone: clinicPatients.phone
      },
      appointment: {
        appointmentDate: clinicAppointments.appointmentDate,
        appointmentTime: clinicAppointments.appointmentTime,
        reason: clinicAppointments.reason
      },
      staff: {
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role
      }
    })
    .from(checkins)
    .leftJoin(clinicPatients, eq(checkins.patientId, clinicPatients.id))
    .leftJoin(clinicAppointments, eq(checkins.appointmentId, clinicAppointments.id))
    .leftJoin(staff, eq(checkins.staffId, staff.id))
    .where(eq(checkins.id, parseInt(id)))
    .limit(1);

    return NextResponse.json(updatedCheckin[0]);
  } catch (error) {
    console.error('PATCH checkins error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}