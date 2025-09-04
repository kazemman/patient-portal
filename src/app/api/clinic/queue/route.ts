import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { queue, clinicPatients, clinicAppointments, checkins, staff } from '@/db/schema';
import { eq, and, or, desc, asc, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const sort = searchParams.get('sort') || 'queueNumber';
    const order = searchParams.get('order') || 'asc';

    let query = db.select({
      id: queue.id,
      queueNumber: queue.queueNumber,
      status: queue.status,
      checkinTime: queue.checkinTime,
      calledTime: queue.calledTime,
      completedTime: queue.completedTime,
      priority: queue.priority,
      estimatedWaitTime: queue.estimatedWaitTime,
      createdAt: queue.createdAt,
      updatedAt: queue.updatedAt,
      patient: {
        id: clinicPatients.id,
        firstName: clinicPatients.firstName,
        lastName: clinicPatients.lastName,
        email: clinicPatients.email,
        phone: clinicPatients.phone
      },
      appointment: {
        id: clinicAppointments.id,
        appointmentDate: clinicAppointments.appointmentDate,
        appointmentTime: clinicAppointments.appointmentTime,
        reason: clinicAppointments.reason,
        status: clinicAppointments.status
      },
      checkin: {
        id: checkins.id,
        type: checkins.type,
        notes: checkins.notes
      },
      staff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.role
      }
    })
    .from(queue)
    .leftJoin(clinicPatients, eq(queue.patientId, clinicPatients.id))
    .leftJoin(clinicAppointments, eq(queue.appointmentId, clinicAppointments.id))
    .leftJoin(checkins, eq(queue.checkinId, checkins.id))
    .leftJoin(staff, eq(queue.staffId, staff.id));

    const conditions = [];

    // Filter by date
    conditions.push(gte(queue.checkinTime, `${date}T00:00:00`));
    conditions.push(lte(queue.checkinTime, `${date}T23:59:59`));

    // Filter by status
    if (!all && !status) {
      conditions.push(or(eq(queue.status, 'waiting'), eq(queue.status, 'called')));
    } else if (status) {
      conditions.push(eq(queue.status, status));
    }

    // Filter by priority
    if (priority) {
      conditions.push(eq(queue.priority, priority));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderFn = order === 'desc' ? desc : asc;
    let sortField;
    switch (sort) {
      case 'priority':
        sortField = queue.priority;
        break;
      case 'checkinTime':
        sortField = queue.checkinTime;
        break;
      case 'calledTime':
        sortField = queue.calledTime;
        break;
      case 'completedTime':
        sortField = queue.completedTime;
        break;
      default:
        sortField = queue.queueNumber;
    }

    // Special priority ordering: high priority first, then by queue number
    if (sort === 'queueNumber' || sort === 'priority') {
      query = query.orderBy(
        eq(queue.priority, 'high') ? asc(queue.queueNumber) : desc(queue.priority),
        asc(queue.queueNumber)
      );
    } else {
      query = query.orderBy(orderFn(sortField));
    }

    const results = await query;
    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, staffId, queueId, patientId, priority = 'normal' } = body;

    if (!action) {
      return NextResponse.json({ 
        error: "Action is required",
        code: "MISSING_ACTION" 
      }, { status: 400 });
    }

    switch (action) {
      case 'call-next':
        if (!staffId) {
          return NextResponse.json({ 
            error: "Staff ID is required for calling next patient",
            code: "MISSING_STAFF_ID" 
          }, { status: 400 });
        }

        // Find next patient by priority and queue number
        const nextPatient = await db.select({
          id: queue.id,
          queueNumber: queue.queueNumber,
          patientId: queue.patientId,
          priority: queue.priority,
          patient: {
            firstName: clinicPatients.firstName,
            lastName: clinicPatients.lastName
          }
        })
        .from(queue)
        .leftJoin(clinicPatients, eq(queue.patientId, clinicPatients.id))
        .where(eq(queue.status, 'waiting'))
        .orderBy(
          eq(queue.priority, 'high') ? asc(queue.queueNumber) : desc(queue.priority),
          asc(queue.queueNumber)
        )
        .limit(1);

        if (nextPatient.length === 0) {
          return NextResponse.json({ 
            error: "No patients waiting in queue",
            code: "NO_WAITING_PATIENTS" 
          }, { status: 404 });
        }

        const calledPatient = await db.update(queue)
          .set({
            status: 'called',
            calledTime: new Date().toISOString(),
            staffId: parseInt(staffId),
            updatedAt: new Date().toISOString()
          })
          .where(eq(queue.id, nextPatient[0].id))
          .returning();

        return NextResponse.json({
          message: "Patient called successfully",
          patient: calledPatient[0],
          patientInfo: nextPatient[0].patient
        }, { status: 200 });

      case 'complete':
        if (!queueId || !staffId) {
          return NextResponse.json({ 
            error: "Queue ID and Staff ID are required for completing patient",
            code: "MISSING_REQUIRED_FIELDS" 
          }, { status: 400 });
        }

        const completedPatient = await db.update(queue)
          .set({
            status: 'completed',
            completedTime: new Date().toISOString(),
            staffId: parseInt(staffId),
            updatedAt: new Date().toISOString()
          })
          .where(eq(queue.id, parseInt(queueId)))
          .returning();

        if (completedPatient.length === 0) {
          return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
        }

        return NextResponse.json({
          message: "Patient visit completed successfully",
          patient: completedPatient[0]
        }, { status: 200 });

      case 'add':
        if (!patientId) {
          return NextResponse.json({ 
            error: "Patient ID is required for adding to queue",
            code: "MISSING_PATIENT_ID" 
          }, { status: 400 });
        }

        // Generate next queue number
        const lastQueue = await db.select({ queueNumber: queue.queueNumber })
          .from(queue)
          .where(gte(queue.checkinTime, new Date().toISOString().split('T')[0] + 'T00:00:00'))
          .orderBy(desc(queue.queueNumber))
          .limit(1);

        const nextQueueNumber = lastQueue.length > 0 ? lastQueue[0].queueNumber + 1 : 1;

        // Calculate estimated wait time based on queue position
        const waitingCount = await db.select({ count: queue.id })
          .from(queue)
          .where(or(eq(queue.status, 'waiting'), eq(queue.status, 'called')));

        const estimatedWaitTime = waitingCount.length * 15; // 15 minutes per patient estimate

        const newQueueEntry = await db.insert(queue)
          .values({
            patientId: parseInt(patientId),
            queueNumber: nextQueueNumber,
            status: 'waiting',
            checkinTime: new Date().toISOString(),
            priority,
            estimatedWaitTime,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          .returning();

        return NextResponse.json(newQueueEntry[0], { status: 201 });

      default:
        return NextResponse.json({ 
          error: "Invalid action. Supported actions: call-next, complete, add",
          code: "INVALID_ACTION" 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid queue ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, estimatedWaitTime, staffId } = body;

    // Validate status if provided
    const validStatuses = ['waiting', 'called', 'in-progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Check if queue entry exists
    const existingEntry = await db.select()
      .from(queue)
      .where(eq(queue.id, parseInt(id)))
      .limit(1);

    if (existingEntry.length === 0) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      
      // Auto-set timestamps based on status
      if (status === 'called' && !existingEntry[0].calledTime) {
        updates.calledTime = new Date().toISOString();
      }
      if (status === 'completed' && !existingEntry[0].completedTime) {
        updates.completedTime = new Date().toISOString();
      }
    }

    if (estimatedWaitTime !== undefined) {
      updates.estimatedWaitTime = parseInt(estimatedWaitTime);
    }

    if (staffId !== undefined) {
      updates.staffId = parseInt(staffId);
    }

    const updatedEntry = await db.update(queue)
      .set(updates)
      .where(eq(queue.id, parseInt(id)))
      .returning();

    return NextResponse.json(updatedEntry[0], { status: 200 });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error }, { status: 500 });
  }
}