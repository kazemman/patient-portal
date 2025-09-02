import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, patients } from '@/db/schema';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';

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

    // Validate date parameters if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json({
        error: "Invalid start_date format. Must be ISO date string",
        code: "INVALID_START_DATE"
      }, { status: 400 });
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json({
        error: "Invalid end_date format. Must be ISO date string",
        code: "INVALID_END_DATE"
      }, { status: 400 });
    }

    // Build date filter conditions
    const dateFilters = [];
    if (startDate) {
      dateFilters.push(gte(appointments.appointmentDate, startDate));
    }
    if (endDate) {
      dateFilters.push(lte(appointments.appointmentDate, endDate));
    }

    // Get current date for period calculations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();

    // Calculate period boundaries
    let thisMonthStart: string;
    let thisMonthEnd: string;
    let lastMonthStart: string;
    let lastMonthEnd: string;

    if (period === 'monthly') {
      thisMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01T00:00:00.000Z`;
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      thisMonthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;
      
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      lastMonthStart = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01T00:00:00.000Z`;
      lastMonthEnd = thisMonthStart;
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(currentDate - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(weekStart.getDate() - 7);
      const lastWeekEnd = new Date(weekStart);
      
      thisMonthStart = weekStart.toISOString();
      thisMonthEnd = weekEnd.toISOString();
      lastMonthStart = lastWeekStart.toISOString();
      lastMonthEnd = lastWeekEnd.toISOString();
    } else { // daily
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      
      thisMonthStart = today.toISOString();
      thisMonthEnd = tomorrow.toISOString();
      lastMonthStart = yesterday.toISOString();
      lastMonthEnd = today.toISOString();
    }

    // Get total completed visits
    const totalCompletedQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          ...dateFilters
        )
      );

    const totalCompleted = await totalCompletedQuery;

    // Get this period's completed visits
    const thisPeriodQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, thisMonthStart),
          lte(appointments.appointmentDate, thisMonthEnd)
        )
      );

    const thisPeriodCompleted = await thisPeriodQuery;

    // Get last period's completed visits
    const lastPeriodQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          gte(appointments.appointmentDate, lastMonthStart),
          lte(appointments.appointmentDate, lastMonthEnd)
        )
      );

    const lastPeriodCompleted = await lastPeriodQuery;

    // Calculate percentage change
    const thisCount = thisPeriodCompleted[0]?.count || 0;
    const lastCount = lastPeriodCompleted[0]?.count || 0;
    let changePercent = "0%";
    
    if (lastCount > 0) {
      const change = ((thisCount - lastCount) / lastCount) * 100;
      const sign = change > 0 ? "+" : "";
      changePercent = `${sign}${change.toFixed(1)}%`;
    } else if (thisCount > 0) {
      changePercent = "+100%";
    }

    // Get visits by period with grouping
    let periodFormat: string;
    if (period === 'daily') {
      periodFormat = `strftime('%Y-%m-%d', appointment_date)`;
    } else if (period === 'weekly') {
      periodFormat = `strftime('%Y-W%W', appointment_date)`;
    } else {
      periodFormat = `strftime('%Y-%m', appointment_date)`;
    }

    const visitsByPeriodQuery = db
      .select({
        period: sql<string>`${sql.raw(periodFormat)}`,
        visits: sql<number>`count(*)`,
        uniquePatients: sql<number>`count(distinct patient_id)`
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          ...dateFilters
        )
      )
      .groupBy(sql.raw(periodFormat))
      .orderBy(sql.raw(periodFormat));

    const visitsByPeriod = await visitsByPeriodQuery;

    // Get top patients with most visits
    const topPatientsQuery = db
      .select({
        patientId: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        visitCount: sql<number>`count(${appointments.id})`,
        lastVisit: sql<string>`max(${appointments.appointmentDate})`
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(
        and(
          eq(appointments.status, 'completed'),
          ...dateFilters
        )
      )
      .groupBy(patients.id, patients.firstName, patients.lastName)
      .orderBy(desc(sql`count(${appointments.id})`))
      .limit(10);

    const topPatientsResult = await topPatientsQuery;

    // Transform top patients data
    const topPatients = topPatientsResult.map(patient => ({
      patientId: patient.patientId,
      name: `${patient.firstName} ${patient.lastName}`,
      visitCount: patient.visitCount,
      lastVisit: patient.lastVisit
    }));

    // Get completion rates
    const scheduledQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          ...dateFilters
        )
      );

    const completedQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'completed'),
          ...dateFilters
        )
      );

    const scheduledTotal = await scheduledQuery;
    const completedTotal = await completedQuery;

    const scheduled = scheduledTotal[0]?.count || 0;
    const completed = completedTotal[0]?.count || 0;
    const completionRate = scheduled > 0 ? ((completed / scheduled) * 100).toFixed(1) : "0.0";

    // Build response
    const response = {
      period,
      completedVisits: {
        total: totalCompleted[0]?.count || 0,
        thisMonth: thisCount,
        lastMonth: lastCount,
        change: changePercent
      },
      visitsByPeriod: visitsByPeriod || [],
      topPatients: topPatients || [],
      completionRate: {
        scheduled,
        completed,
        rate: `${completionRate}%`
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