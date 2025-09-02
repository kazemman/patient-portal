import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { sql, eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const endDateParam = searchParams.get('end_date');
    const startDateParam = searchParams.get('start_date');
    
    // Set default date range (last 12 weeks)
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const defaultStartDate = new Date(endDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - (12 * 7)); // 12 weeks ago
    
    const startDate = startDateParam ? new Date(startDateParam) : defaultStartDate;
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({
        error: "Invalid date format. Use ISO date strings (YYYY-MM-DD)",
        code: "INVALID_DATE_FORMAT"
      }, { status: 400 });
    }
    
    if (startDate >= endDate) {
      return NextResponse.json({
        error: "Start date must be before end date",
        code: "INVALID_DATE_RANGE"
      }, { status: 400 });
    }
    
    // Convert to ISO strings for database query
    const startDateISO = startDate.toISOString().split('T')[0];
    const endDateISO = endDate.toISOString().split('T')[0];
    
    // Get weekly appointment statistics
    const weeklyStats = await db.select({
      weekStart: sql<string>`date(appointment_date, 'weekday 1', '-6 days')`.as('week_start'),
      weekEnd: sql<string>`date(appointment_date, 'weekday 1')`.as('week_end'),
      week: sql<string>`strftime('%Y-W%W', appointment_date)`.as('week'), 
      total: sql<number>`count(*)`.as('total'),
      scheduled: sql<number>`sum(case when status = 'scheduled' then 1 else 0 end)`.as('scheduled'),
      completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`.as('completed'),
      cancelled: sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`.as('cancelled'),
      no_show: sql<number>`sum(case when status = 'no_show' then 1 else 0 end)`.as('no_show')
    })
    .from(appointments)
    .where(and(
      gte(sql`date(appointment_date)`, startDateISO),
      lte(sql`date(appointment_date)`, endDateISO)
    ))
    .groupBy(sql`strftime('%Y-%W', appointment_date)`)
    .orderBy(sql`week_start`);
    
    // Calculate summary statistics
    const totalAppointments = weeklyStats.reduce((sum, week) => sum + week.total, 0);
    const avgPerWeek = weeklyStats.length > 0 ? Math.round(totalAppointments / weeklyStats.length) : 0;
    
    // Calculate previous period for comparison
    const periodDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDurationDays);
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    
    const previousStartISO = previousStartDate.toISOString().split('T')[0];
    const previousEndISO = previousEndDate.toISOString().split('T')[0];
    
    // Get previous period total for trend comparison
    const previousPeriodStats = await db.select({
      total: sql<number>`count(*)`.as('total')
    })
    .from(appointments)
    .where(and(
      gte(sql`date(appointment_date)`, previousStartISO),
      lte(sql`date(appointment_date)`, previousEndISO)
    ));
    
    const previousTotal = previousPeriodStats[0]?.total || 0;
    let previousPeriodChange = "0%";
    
    if (previousTotal > 0) {
      const changePercent = Math.round(((totalAppointments - previousTotal) / previousTotal) * 100);
      previousPeriodChange = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
    } else if (totalAppointments > 0) {
      previousPeriodChange = "+100%";
    }
    
    // Format the response data
    const formattedData = weeklyStats.map(week => ({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      week: week.week,
      total: week.total,
      scheduled: week.scheduled,
      completed: week.completed,
      cancelled: week.cancelled,
      no_show: week.no_show
    }));
    
    return NextResponse.json({
      period: "weekly",
      data: formattedData,
      summary: {
        totalAppointments,
        avgPerWeek,
        previousPeriodChange
      }
    });
    
  } catch (error) {
    console.error('GET weekly stats error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}