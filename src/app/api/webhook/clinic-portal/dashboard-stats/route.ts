import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, appointments } from '@/db/schema';
import { eq, and, gte, lte, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get today's date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const todayStartISO = todayStart.toISOString();
    const todayEndISO = todayEnd.toISOString();

    // Execute all queries in parallel for better performance
    const [
      totalPatientsResult,
      todayAppointmentsResult,
      waitingPatientsResult,
      completedTodayResult
    ] = await Promise.all([
      // Count all active patients
      db.select({ count: count() })
        .from(patients)
        .where(eq(patients.active, true)),

      // Count today's appointments
      db.select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, todayStartISO),
            lte(appointments.appointmentDate, todayEndISO)
          )
        ),

      // Count waiting patients (scheduled appointments for today)
      db.select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, todayStartISO),
            lte(appointments.appointmentDate, todayEndISO),
            eq(appointments.status, 'scheduled')
          )
        ),

      // Count completed appointments for today
      db.select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, todayStartISO),
            lte(appointments.appointmentDate, todayEndISO),
            eq(appointments.status, 'completed')
          )
        ),
    ]);

    // Extract counts from results
    const totalPatients = totalPatientsResult[0]?.count || 0;
    const todayAppointments = todayAppointmentsResult[0]?.count || 0;
    const waitingPatients = waitingPatientsResult[0]?.count || 0;
    const completedToday = completedTodayResult[0]?.count || 0;

    // Return dashboard statistics
    return NextResponse.json({
      totalPatients,
      todayAppointments,
      waitingPatients,
      completedToday
    }, { status: 200 });

  } catch (error) {
    console.error('GET dashboard stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}