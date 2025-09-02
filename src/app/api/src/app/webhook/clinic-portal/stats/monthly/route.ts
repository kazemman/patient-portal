import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { sql, eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse date parameters
    const endDateParam = searchParams.get('end_date');
    const startDateParam = searchParams.get('start_date');
    
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ 
        error: "Invalid date format. Use ISO date string (YYYY-MM-DD)",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }
    
    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: "Start date must be before end date",
        code: "INVALID_DATE_RANGE" 
      }, { status: 400 });
    }
    
    // Format dates as ISO strings for database query
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Query monthly appointment statistics
    const monthlyData = await db.select({
      month: sql<string>`strftime('%Y-%m', ${appointments.appointmentDate})`,
      total: sql<number>`count(*)`,
      scheduled: sql<number>`sum(case when ${appointments.status} = 'scheduled' then 1 else 0 end)`,
      completed: sql<number>`sum(case when ${appointments.status} = 'completed' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${appointments.status} = 'cancelled' then 1 else 0 end)`,
      no_show: sql<number>`sum(case when ${appointments.status} = 'no_show' then 1 else 0 end)`
    })
    .from(appointments)
    .where(and(
      gte(sql`date(${appointments.appointmentDate})`, startDateStr),
      lte(sql`date(${appointments.appointmentDate})`, endDateStr)
    ))
    .groupBy(sql`strftime('%Y-%m', ${appointments.appointmentDate})`)
    .orderBy(sql`strftime('%Y-%m', ${appointments.appointmentDate})`);
    
    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);
    
    const previousPeriodData = await db.select({
      total: sql<number>`count(*)`
    })
    .from(appointments)
    .where(and(
      gte(sql`date(${appointments.appointmentDate})`, previousStartDate.toISOString().split('T')[0]),
      lte(sql`date(${appointments.appointmentDate})`, previousEndDate.toISOString().split('T')[0])
    ));
    
    // Format monthly data with month names
    const formattedData = monthlyData.map(item => {
      const [year, month] = item.month.split('-');
      const monthDate = new Date(parseInt(year), parseInt(month) - 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      return {
        month: item.month,
        monthName,
        total: item.total,
        scheduled: item.scheduled,
        completed: item.completed,
        cancelled: item.cancelled,
        no_show: item.no_show
      };
    });
    
    // Calculate summary statistics
    const totalAppointments = formattedData.reduce((sum, item) => sum + item.total, 0);
    const avgPerMonth = formattedData.length > 0 ? Math.round(totalAppointments / formattedData.length) : 0;
    
    // Calculate percentage change from previous period
    const previousTotal = previousPeriodData[0]?.total || 0;
    let previousPeriodChange = "0%";
    
    if (previousTotal > 0) {
      const changePercent = Math.round(((totalAppointments - previousTotal) / previousTotal) * 100);
      previousPeriodChange = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
    } else if (totalAppointments > 0) {
      previousPeriodChange = "+100%";
    }
    
    const response = {
      period: "monthly",
      data: formattedData,
      summary: {
        totalAppointments,
        avgPerMonth,
        previousPeriodChange
      }
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}