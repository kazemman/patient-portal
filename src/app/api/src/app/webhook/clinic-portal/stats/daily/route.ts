import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq, gte, lte, and, count, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const period = searchParams.get('period') || 'daily';
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    
    // Default start date is 30 days ago
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const startDate = searchParams.get('start_date') || defaultStartDate.toISOString().split('T')[0];

    // Validate dates
    const startDateTime = new Date(startDate + 'T00:00:00.000Z');
    const endDateTime = new Date(endDate + 'T23:59:59.999Z');

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT"
      }, { status: 400 });
    }

    if (startDateTime > endDateTime) {
      return NextResponse.json({
        error: "Start date cannot be after end date",
        code: "INVALID_DATE_RANGE"
      }, { status: 400 });
    }

    // Validate period parameter
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json({
        error: "Period must be 'daily', 'weekly', or 'monthly'",
        code: "INVALID_PERIOD"
      }, { status: 400 });
    }

    // Calculate date grouping format based on period
    let dateFormat: string;
    let dateInterval: number;

    switch (period) {
      case 'weekly':
        dateFormat = '%Y-%W'; // Year and week number
        dateInterval = 7;
        break;
      case 'monthly':
        dateFormat = '%Y-%m'; // Year and month
        dateInterval = 30;
        break;
      default: // daily
        dateFormat = '%Y-%m-%d'; // Year, month, day
        dateInterval = 1;
        break;
    }

    // Get current period data with status breakdown
    const currentPeriodData = await db
      .select({
        date: sql<string>`strftime(${dateFormat}, ${appointments.appointmentDate})`,
        total: count(),
        scheduled: sql<number>`sum(case when ${appointments.status} = 'scheduled' then 1 else 0 end)`,
        completed: sql<number>`sum(case when ${appointments.status} = 'completed' then 1 else 0 end)`,
        cancelled: sql<number>`sum(case when ${appointments.status} = 'cancelled' then 1 else 0 end)`,
        no_show: sql<number>`sum(case when ${appointments.status} = 'no_show' then 1 else 0 end)`
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, startDateTime.toISOString()),
          lte(appointments.appointmentDate, endDateTime.toISOString())
        )
      )
      .groupBy(sql`strftime(${dateFormat}, ${appointments.appointmentDate})`)
      .orderBy(sql`strftime(${dateFormat}, ${appointments.appointmentDate})`);

    // Calculate previous period for comparison
    const periodLength = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDateTime);
    prevStartDate.setDate(prevStartDate.getDate() - periodLength);
    const prevEndDate = new Date(startDateTime);
    prevEndDate.setDate(prevEndDate.getDate() - 1);

    // Get previous period total for trend comparison
    const previousPeriodTotal = await db
      .select({
        total: count()
      })
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, prevStartDate.toISOString()),
          lte(appointments.appointmentDate, prevEndDate.toISOString())
        )
      );

    // Calculate summary statistics
    const totalAppointments = currentPeriodData.reduce((sum, day) => sum + day.total, 0);
    const avgPerPeriod = totalAppointments / Math.max(currentPeriodData.length, 1);
    const prevTotal = previousPeriodTotal[0]?.total || 0;
    
    // Calculate percentage change
    let previousPeriodChange = "0%";
    if (prevTotal > 0) {
      const changePercent = ((totalAppointments - prevTotal) / prevTotal) * 100;
      const sign = changePercent >= 0 ? "+" : "";
      previousPeriodChange = `${sign}${changePercent.toFixed(1)}%`;
    } else if (totalAppointments > 0) {
      previousPeriodChange = "+100%";
    }

    // Format data for response
    const formattedData = currentPeriodData.map(row => {
      let displayDate = row.date;
      
      // Convert period-specific formats to readable dates
      if (period === 'weekly') {
        // Convert YYYY-WW to readable format
        const [year, week] = row.date.split('-');
        const firstDayOfYear = new Date(parseInt(year), 0, 1);
        const daysOffset = parseInt(week) * 7;
        const weekStart = new Date(firstDayOfYear);
        weekStart.setDate(firstDayOfYear.getDate() + daysOffset);
        displayDate = `Week of ${weekStart.toISOString().split('T')[0]}`;
      } else if (period === 'monthly') {
        // Convert YYYY-MM to readable format
        const [year, month] = row.date.split('-');
        displayDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0].substring(0, 7);
      }

      return {
        date: displayDate,
        total: row.total,
        scheduled: row.scheduled,
        completed: row.completed,
        cancelled: row.cancelled,
        no_show: row.no_show
      };
    });

    // Generate summary
    const summary = {
      totalAppointments,
      avgPerDay: period === 'daily' ? avgPerPeriod : avgPerPeriod / dateInterval,
      previousPeriodChange
    };

    return NextResponse.json({
      period,
      data: formattedData,
      summary
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}