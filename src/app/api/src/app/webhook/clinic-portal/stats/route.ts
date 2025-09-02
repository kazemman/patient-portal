import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, appointments } from '@/db/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Today's patients count (appointments today)
    const todayPatientsResult = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, todayStart),
          lte(appointments.appointmentDate, todayEnd)
        )
      );
    const todayPatients = todayPatientsResult[0]?.count || 0;

    // New registrations today
    const newRegistrationsResult = await db
      .select({ count: count() })
      .from(patients)
      .where(
        and(
          eq(patients.active, true),
          gte(patients.createdAt, todayStart),
          lte(patients.createdAt, todayEnd)
        )
      );
    const newRegistrations = newRegistrationsResult[0]?.count || 0;

    // Total active patients
    const totalPatientsResult = await db
      .select({ count: count() })
      .from(patients)
      .where(eq(patients.active, true));
    const totalPatients = totalPatientsResult[0]?.count || 0;

    // Appointments today
    const appointmentsTodayResult = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, todayStart),
          lte(appointments.appointmentDate, todayEnd)
        )
      );
    const appointmentsToday = appointmentsTodayResult[0]?.count || 0;

    // Upcoming appointments (next 7 days, excluding today)
    const tomorrowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowStartISO = tomorrowStart.toISOString();
    
    const upcomingAppointmentsResult = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, tomorrowStartISO),
          lte(appointments.appointmentDate, next7Days),
          eq(appointments.status, 'scheduled')
        )
      );
    const upcomingAppointments = upcomingAppointmentsResult[0]?.count || 0;

    // Recent activity - Last 5 appointments with patient names and statuses
    const recentActivity = await db
      .select({
        id: appointments.id,
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        reason: appointments.reason
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(patients.active, true))
      .orderBy(desc(appointments.createdAt))
      .limit(5);

    const stats = {
      todayPatients,
      newRegistrations,
      totalPatients,
      appointmentsToday,
      upcomingAppointments,
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        patientName: activity.patientName,
        appointmentDate: activity.appointmentDate,
        status: activity.status,
        reason: activity.reason || 'No reason specified'
      }))
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('GET stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error,
      code: 'STATS_FETCH_ERROR'
    }, { status: 500 });
  }
}