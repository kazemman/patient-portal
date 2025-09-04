import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  clinicPatients, 
  clinicAppointments, 
  queue, 
  staff, 
  checkins, 
  departments 
} from '@/db/schema';
import { eq, and, gte, lte, count, avg, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get today's date range
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString().split('T')[0];

    // 1. Total Active Patients
    const totalPatientsResult = await db.select({ count: count() })
      .from(clinicPatients)
      .where(eq(clinicPatients.active, true));
    const totalPatients = totalPatientsResult[0]?.count || 0;

    // 2. Today's Appointments
    const todayAppointmentsResult = await db.select({ count: count() })
      .from(clinicAppointments)
      .where(eq(clinicAppointments.appointmentDate, todayStart));
    const todayAppointments = todayAppointmentsResult[0]?.count || 0;

    // 3. Waiting Patients (current queue)
    const waitingPatientsResult = await db.select({ count: count() })
      .from(queue)
      .where(eq(queue.status, 'waiting'));
    const waitingPatients = waitingPatientsResult[0]?.count || 0;

    // 4. Completed Appointments Today
    const completedTodayResult = await db.select({ count: count() })
      .from(clinicAppointments)
      .where(and(
        eq(clinicAppointments.appointmentDate, todayStart),
        eq(clinicAppointments.status, 'completed')
      ));
    const completedToday = completedTodayResult[0]?.count || 0;

    // 5. Staff On Duty
    const staffOnDutyResult = await db.select({ count: count() })
      .from(staff)
      .where(and(
        eq(staff.isActive, true),
        eq(staff.status, 'active')
      ));
    const staffOnDuty = staffOnDutyResult[0]?.count || 0;

    // 6. Check-ins Today
    const checkinsTodayResult = await db.select({ count: count() })
      .from(checkins)
      .where(gte(checkins.checkinTime, todayStart + 'T00:00:00.000Z'));
    const checkinsToday = checkinsTodayResult[0]?.count || 0;

    // 7. Average Wait Time for completed queue items today
    const avgWaitTimeResult = await db.select({ 
      avgWaitTime: avg(sql`CASE 
        WHEN ${queue.completedTime} IS NOT NULL AND ${queue.checkinTime} IS NOT NULL 
        THEN (julianday(${queue.completedTime}) - julianday(${queue.checkinTime})) * 24 * 60 
        ELSE NULL 
      END`) 
    })
      .from(queue)
      .where(and(
        eq(queue.status, 'completed'),
        gte(queue.checkinTime, todayStart + 'T00:00:00.000Z'),
        lte(queue.checkinTime, todayEnd + 'T00:00:00.000Z')
      ));
    const averageWaitTime = Math.round(Number(avgWaitTimeResult[0]?.avgWaitTime) || 0);

    // 8. Department Stats - Appointments by department for today
    const departmentStatsQuery = await db.select({
      departmentId: clinicAppointments.departmentId,
      departmentName: departments.name,
      appointmentCount: count()
    })
      .from(clinicAppointments)
      .leftJoin(departments, eq(clinicAppointments.departmentId, departments.id))
      .where(eq(clinicAppointments.appointmentDate, todayStart))
      .groupBy(clinicAppointments.departmentId, departments.name);

    const departmentStats = departmentStatsQuery.map(dept => ({
      departmentId: dept.departmentId,
      departmentName: dept.departmentName || 'Unknown',
      appointmentCount: dept.appointmentCount
    }));

    // Return dashboard metrics
    return NextResponse.json({
      totalPatients,
      todayAppointments,
      waitingPatients,
      completedToday,
      staffOnDuty,
      checkinsToday,
      averageWaitTime,
      departmentStats,
      date: todayStart,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Dashboard stats GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard statistics: ' + error,
      code: 'DASHBOARD_FETCH_ERROR'
    }, { status: 500 });
  }
}