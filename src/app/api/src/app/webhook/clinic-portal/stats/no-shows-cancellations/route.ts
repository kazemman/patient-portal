import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, patients } from '@/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate period parameter
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({
        error: "Invalid period. Must be 'daily', 'weekly', or 'monthly'",
        code: "INVALID_PERIOD"
      }, { status: 400 });
    }

    // Calculate date ranges
    const now = new Date();
    let currentPeriodStart: Date;
    let previousPeriodStart: Date;
    let currentPeriodEnd = new Date(now);
    
    if (startDate && endDate) {
      currentPeriodStart = new Date(startDate);
      currentPeriodEnd = new Date(endDate);
      
      if (currentPeriodStart >= currentPeriodEnd) {
        return NextResponse.json({
          error: "start_date must be before end_date",
          code: "INVALID_DATE_RANGE"
        }, { status: 400 });
      }
    } else {
      switch (period) {
        case 'daily':
          currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          previousPeriodStart = new Date(currentPeriodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
          break;
        case 'weekly':
          const dayOfWeek = now.getDay();
          currentPeriodStart = new Date(now);
          currentPeriodStart.setDate(now.getDate() - dayOfWeek);
          currentPeriodStart.setHours(0, 0, 0, 0);
          previousPeriodStart = new Date(currentPeriodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
          break;
        case 'monthly':
        default:
          currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
      }
    }

    const previousPeriodEnd = new Date(currentPeriodStart);

    // Get current period appointments
    const currentPeriodAppointments = await db.select()
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, currentPeriodStart.toISOString()),
        lte(appointments.appointmentDate, currentPeriodEnd.toISOString())
      ));

    // Get previous period appointments for comparison
    const previousPeriodAppointments = await db.select()
      .from(appointments)
      .where(and(
        gte(appointments.appointmentDate, previousPeriodStart.toISOString()),
        lte(appointments.appointmentDate, previousPeriodEnd.toISOString())
      ));

    // Get all appointments for historical analysis (last 12 months)
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const historicalAppointments = await db.select()
      .from(appointments)
      .where(gte(appointments.appointmentDate, twelveMonthsAgo.toISOString()));

    // Calculate current period statistics
    const currentScheduled = currentPeriodAppointments.length;
    const currentNoShows = currentPeriodAppointments.filter(apt => apt.status === 'no_show');
    const currentCancellations = currentPeriodAppointments.filter(apt => apt.status === 'cancelled');
    
    // Calculate previous period statistics
    const previousScheduled = previousPeriodAppointments.length;
    const previousNoShows = previousPeriodAppointments.filter(apt => apt.status === 'no_show');
    const previousCancellations = previousPeriodAppointments.filter(apt => apt.status === 'cancelled');

    // Calculate rates
    const currentNoShowRate = currentScheduled > 0 ? (currentNoShows.length / currentScheduled * 100).toFixed(1) : '0.0';
    const previousNoShowRate = previousScheduled > 0 ? (previousNoShows.length / previousScheduled * 100).toFixed(1) : '0.0';
    const currentCancellationRate = currentScheduled > 0 ? (currentCancellations.length / currentScheduled * 100).toFixed(1) : '0.0';
    const previousCancellationRate = previousScheduled > 0 ? (previousCancellations.length / previousScheduled * 100).toFixed(1) : '0.0';

    // Calculate trends
    const noShowTrend = previousNoShows.length > 0 
      ? ((currentNoShows.length - previousNoShows.length) / previousNoShows.length * 100).toFixed(0)
      : currentNoShows.length > 0 ? '100' : '0';
    
    const cancellationTrend = previousCancellations.length > 0 
      ? ((currentCancellations.length - previousCancellations.length) / previousCancellations.length * 100).toFixed(0)
      : currentCancellations.length > 0 ? '100' : '0';

    // Get historical data grouped by period
    const byPeriodData = [];
    const periodGroups = new Map();

    historicalAppointments.forEach(appointment => {
      const date = new Date(appointment.appointmentDate);
      let periodKey: string;
      
      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!periodGroups.has(periodKey)) {
        periodGroups.set(periodKey, {
          period: periodKey,
          scheduled: 0,
          noShows: 0,
          cancelled: 0
        });
      }

      const group = periodGroups.get(periodKey);
      group.scheduled++;
      
      if (appointment.status === 'no_show') group.noShows++;
      if (appointment.status === 'cancelled') group.cancelled++;
    });

    // Convert to array and calculate rates
    periodGroups.forEach((group) => {
      group.noShowRate = group.scheduled > 0 ? (group.noShows / group.scheduled * 100).toFixed(1) + '%' : '0.0%';
      group.cancellationRate = group.scheduled > 0 ? (group.cancelled / group.scheduled * 100).toFixed(1) + '%' : '0.0%';
      byPeriodData.push(group);
    });

    // Sort by period descending
    byPeriodData.sort((a, b) => b.period.localeCompare(a.period));

    // Get problem patients (patients with multiple no-shows or cancellations)
    const problemPatients = await db.select({
      patientId: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      noShows: sql<number>`COUNT(CASE WHEN ${appointments.status} = 'no_show' THEN 1 END)`,
      cancellations: sql<number>`COUNT(CASE WHEN ${appointments.status} = 'cancelled' THEN 1 END)`,
      totalMissed: sql<number>`COUNT(CASE WHEN ${appointments.status} IN ('no_show', 'cancelled') THEN 1 END)`
    })
    .from(patients)
    .leftJoin(appointments, eq(patients.id, appointments.patientId))
    .where(and(
      eq(patients.active, true),
      gte(appointments.appointmentDate, twelveMonthsAgo.toISOString())
    ))
    .groupBy(patients.id, patients.firstName, patients.lastName)
    .having(sql`COUNT(CASE WHEN ${appointments.status} IN ('no_show', 'cancelled') THEN 1 END) >= 2`)
    .orderBy(desc(sql`COUNT(CASE WHEN ${appointments.status} IN ('no_show', 'cancelled') THEN 1 END)`))
    .limit(10);

    // Determine trends
    const noShowTrendDirection = parseInt(noShowTrend) > 5 ? 'increasing' : 
                                 parseInt(noShowTrend) < -5 ? 'decreasing' : 'stable';
    const cancellationTrendDirection = parseInt(cancellationTrend) > 5 ? 'increasing' : 
                                       parseInt(cancellationTrend) < -5 ? 'decreasing' : 'stable';

    // Calculate total historical counts
    const totalNoShows = historicalAppointments.filter(apt => apt.status === 'no_show').length;
    const totalCancellations = historicalAppointments.filter(apt => apt.status === 'cancelled').length;

    const response = {
      period,
      noShows: {
        total: totalNoShows,
        thisMonth: currentNoShows.length,
        lastMonth: previousNoShows.length,
        rate: `${currentNoShowRate}%`,
        trend: `${noShowTrend.startsWith('-') ? '' : '+'}${noShowTrend}%`
      },
      cancellations: {
        total: totalCancellations,
        thisMonth: currentCancellations.length,
        lastMonth: previousCancellations.length,
        rate: `${currentCancellationRate}%`,
        trend: `${cancellationTrend.startsWith('-') ? '' : '+'}${cancellationTrend}%`
      },
      byPeriod: byPeriodData.slice(0, 12), // Last 12 periods
      problemPatients: problemPatients.map(patient => ({
        patientId: patient.patientId,
        name: `${patient.firstName} ${patient.lastName}`,
        noShows: patient.noShows,
        cancellations: patient.cancellations,
        totalMissed: patient.totalMissed
      })),
      trends: {
        noShowTrend: noShowTrendDirection,
        cancellationTrend: cancellationTrendDirection
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}