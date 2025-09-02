import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, appointments } from '@/db/schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fix timezone issues by using UTC dates consistently
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayStartISO = todayUTC.toISOString();
    const todayEndUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const todayEndISO = todayEndUTC.toISOString();
    
    const tomorrowUTC = new Date(todayEndUTC.getTime() + 1);
    const tomorrowStartISO = tomorrowUTC.toISOString();
    const next7DaysUTC = new Date(tomorrowUTC.getTime() + (7 * 24 * 60 * 60 * 1000));
    const next7DaysISO = next7DaysUTC.toISOString();
    
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const thisMonthStartISO = thisMonthStart.toISOString();
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthStartISO = lastMonthStart.toISOString();
    const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    const lastMonthEndISO = lastMonthEnd.toISOString();

    console.log('Date range for today:', { todayStartISO, todayEndISO });

    // 1. Total active patients
    const totalPatientsResult = await db.select({ count: count() })
      .from(patients)
      .where(eq(patients.active, true));
    const totalPatients = totalPatientsResult[0]?.count || 0;

    // 2. Today's appointments - fix date comparison to use date portion only
    const todayAppointmentsResult = await db.select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, todayStartISO),
        lte(appointments.appointmentDate, todayEndISO)
      ));
    const todayAppointments = todayAppointmentsResult[0]?.count || 0;

    // 3. Waiting patients (scheduled appointments today)
    const waitingPatientsResult = await db.select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, todayStartISO),
        lte(appointments.appointmentDate, todayEndISO),
        eq(appointments.status, 'scheduled')
      ));
    const waitingPatients = waitingPatientsResult[0]?.count || 0;

    // 4. Completed today
    const completedTodayResult = await db.select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, todayStartISO),
        lte(appointments.appointmentDate, todayEndISO),
        eq(appointments.status, 'completed')
      ));
    const completedToday = completedTodayResult[0]?.count || 0;

    // Debug logging
    console.log('Dashboard stats:', { 
      todayAppointments, 
      waitingPatients, 
      completedToday,
      dateRange: { todayStartISO, todayEndISO }
    });

    // 5. Recent activity (last 10 appointments with patient details)
    const recentActivityRaw = await db.select({
      id: appointments.id,
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
      reason: appointments.reason,
      firstName: patients.firstName,
      lastName: patients.lastName
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .orderBy(desc(appointments.appointmentDate))
    .limit(10);

    const recentActivity = recentActivityRaw.map(item => ({
      id: item.id,
      patientName: `${item.firstName} ${item.lastName}`,
      appointmentDate: item.appointmentDate,
      status: item.status as "scheduled" | "completed" | "cancelled" | "no_show",
      reason: item.reason || ''
    }));

    // 6. Upcoming appointments (next 7 days excluding today)
    const upcomingAppointmentsResult = await db.select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, tomorrowStartISO),
        lte(appointments.appointmentDate, next7DaysISO)
      ));
    const upcomingAppointments = upcomingAppointmentsResult[0]?.count || 0;

    // 7. Trends - New patients this month vs last month
    const thisMonthPatientsResult = await db.select({ count: count() })
      .from(patients)
      .where(gte(patients.createdAt, thisMonthStartISO));
    const thisMonthPatients = thisMonthPatientsResult[0]?.count || 0;

    const lastMonthPatientsResult = await db.select({ count: count() })
      .from(patients)
      .where(and(
        gte(patients.createdAt, lastMonthStartISO),
        lte(patients.createdAt, lastMonthEndISO)
      ));
    const lastMonthPatients = lastMonthPatientsResult[0]?.count || 0;

    // 8. Trends - Appointments this month vs last month
    const thisMonthAppointmentsResult = await db.select({ count: count() })
      .from(appointments)
      .where(gte(appointments.appointmentDate, thisMonthStartISO));
    const thisMonthAppointments = thisMonthAppointmentsResult[0]?.count || 0;

    const lastMonthAppointmentsResult = await db.select({ count: count() })
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, lastMonthStartISO),
        lte(appointments.appointmentDate, lastMonthEndISO)
      ));
    const lastMonthAppointments = lastMonthAppointmentsResult[0]?.count || 0;

    // Calculate percentage changes with proper zero handling
    const calculateGrowth = (current: number, previous: number): string => {
      if (previous === 0) {
        return current > 0 ? "+100.0%" : "0.0%";
      }
      const percentage = ((current - previous) / previous) * 100;
      const sign = percentage >= 0 ? '+' : '';
      return `${sign}${percentage.toFixed(1)}%`;
    };

    const patientGrowth = calculateGrowth(thisMonthPatients, lastMonthPatients);
    const appointmentGrowth = calculateGrowth(thisMonthAppointments, lastMonthAppointments);

    // Return comprehensive dashboard statistics
    return NextResponse.json({
      totalPatients,
      todayAppointments,
      waitingPatients,
      completedToday,
      recentActivity,
      upcomingAppointments,
      trends: {
        patientGrowth,
        appointmentGrowth
      }
    });

  } catch (error) {
    console.error('GET dashboard stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}