import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { eq, gte, lte, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    // Validate date parameters if provided
    let startDate: string;
    let endDate: string;

    if (startDateParam) {
      const parsedStart = new Date(startDateParam);
      if (isNaN(parsedStart.getTime())) {
        return NextResponse.json({ 
          error: "Invalid start_date format. Use YYYY-MM-DD",
          code: "INVALID_START_DATE" 
        }, { status: 400 });
      }
      startDate = startDateParam;
    } else {
      // Default to 12 months ago
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      startDate = twelveMonthsAgo.toISOString().split('T')[0];
    }

    if (endDateParam) {
      const parsedEnd = new Date(endDateParam);
      if (isNaN(parsedEnd.getTime())) {
        return NextResponse.json({ 
          error: "Invalid end_date format. Use YYYY-MM-DD",
          code: "INVALID_END_DATE" 
        }, { status: 400 });
      }
      endDate = endDateParam;
    } else {
      // Default to today
      endDate = new Date().toISOString().split('T')[0];
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ 
        error: "start_date cannot be later than end_date",
        code: "INVALID_DATE_RANGE" 
      }, { status: 400 });
    }

    // Query all checkins within the date range
    const startDateTime = `${startDate}T00:00:00.000Z`;
    const endDateTime = `${endDate}T23:59:59.999Z`;

    const allCheckins = await db.select()
      .from(checkins)
      .where(and(
        gte(checkins.checkinTime, startDateTime),
        lte(checkins.checkinTime, endDateTime)
      ));

    // Group checkins by month
    const monthlyData = new Map();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Initialize monthly data structure
    allCheckins.forEach(checkin => {
      const checkinDate = new Date(checkin.checkinTime);
      const monthKey = `${checkinDate.getFullYear()}-${String(checkinDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[checkinDate.getMonth()]} ${checkinDate.getFullYear()}`;
      const dayKey = checkin.checkinTime.split('T')[0];

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          month_name: monthName,
          total_checkins: 0,
          payment_method_breakdown: { medical_aid: 0, cash: 0, both: 0 },
          status_breakdown: { waiting: 0, attended: 0, cancelled: 0 },
          waiting_times: [],
          daily_counts: new Map(),
          checkins: []
        });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.total_checkins++;
      monthData.payment_method_breakdown[checkin.paymentMethod]++;
      monthData.status_breakdown[checkin.status]++;
      monthData.checkins.push(checkin);

      // Track daily counts for peak day calculation
      if (!monthData.daily_counts.has(dayKey)) {
        monthData.daily_counts.set(dayKey, 0);
      }
      monthData.daily_counts.set(dayKey, monthData.daily_counts.get(dayKey) + 1);

      // Collect waiting times for attended patients
      if (checkin.status === 'attended' && checkin.waitingTimeMinutes !== null) {
        monthData.waiting_times.push(checkin.waitingTimeMinutes);
      }
    });

    // Calculate monthly statistics
    const monthlyStats = [];
    for (const [monthKey, data] of monthlyData) {
      const monthDate = new Date(`${monthKey}-01`);
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      
      // Calculate average waiting time
      const avgWaitingTime = data.waiting_times.length > 0 
        ? Math.round(data.waiting_times.reduce((sum, time) => sum + time, 0) / data.waiting_times.length)
        : 0;

      // Calculate daily average
      const dailyAverage = Math.round((data.total_checkins / daysInMonth) * 100) / 100;

      // Find peak day
      let peakDay = '';
      let peakCount = 0;
      for (const [day, count] of data.daily_counts) {
        if (count > peakCount) {
          peakCount = count;
          peakDay = day;
        }
      }

      monthlyStats.push({
        month: data.month,
        month_name: data.month_name,
        total_checkins: data.total_checkins,
        payment_method_breakdown: data.payment_method_breakdown,
        status_breakdown: data.status_breakdown,
        average_waiting_time: avgWaitingTime,
        daily_average: dailyAverage,
        peak_day: peakDay || null
      });
    }

    // Sort by month
    monthlyStats.sort((a, b) => a.month.localeCompare(b.month));

    // Calculate overall summary
    const totalCheckins = allCheckins.length;
    const totalMonths = monthlyStats.length;
    const monthlyAverage = totalMonths > 0 ? Math.round((totalCheckins / totalMonths) * 100) / 100 : 0;

    // Overall payment method totals
    const paymentMethodTotals = { medical_aid: 0, cash: 0, both: 0 };
    allCheckins.forEach(checkin => {
      paymentMethodTotals[checkin.paymentMethod]++;
    });

    // Calculate overall average waiting time
    const allWaitingTimes = allCheckins
      .filter(checkin => checkin.status === 'attended' && checkin.waitingTimeMinutes !== null)
      .map(checkin => checkin.waitingTimeMinutes);
    
    const overallAvgWaitingTime = allWaitingTimes.length > 0 
      ? Math.round(allWaitingTimes.reduce((sum, time) => sum + time, 0) / allWaitingTimes.length)
      : 0;

    // Calculate attendance rate
    const attendedCount = allCheckins.filter(checkin => checkin.status === 'attended').length;
    const attendanceRate = totalCheckins > 0 ? Math.round((attendedCount / totalCheckins) * 10000) / 100 : 0;

    // Calculate growth trend (month-over-month average)
    let totalGrowth = 0;
    let growthCount = 0;
    for (let i = 1; i < monthlyStats.length; i++) {
      const currentMonth = monthlyStats[i].total_checkins;
      const previousMonth = monthlyStats[i - 1].total_checkins;
      if (previousMonth > 0) {
        const growth = ((currentMonth - previousMonth) / previousMonth) * 100;
        totalGrowth += growth;
        growthCount++;
      }
    }
    const growthTrend = growthCount > 0 ? Math.round((totalGrowth / growthCount) * 100) / 100 : 0;

    // Find peak month
    const peakMonth = monthlyStats.reduce((peak, current) => 
      current.total_checkins > (peak?.total_checkins || 0) ? current : peak
    , null);

    const summary = {
      total_months: totalMonths,
      total_checkins: totalCheckins,
      monthly_average: monthlyAverage,
      overall_avg_waiting_time: overallAvgWaitingTime,
      payment_method_totals: paymentMethodTotals,
      attendance_rate: attendanceRate,
      growth_trend: growthTrend,
      peak_month: peakMonth ? {
        month: peakMonth.month,
        month_name: peakMonth.month_name,
        checkins: peakMonth.total_checkins
      } : null
    };

    return NextResponse.json({
      monthly_data: monthlyStats,
      summary: summary,
      date_range: {
        start_date: startDate,
        end_date: endDate
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET monthly check-in statistics error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint only supports GET requests.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint only supports GET requests.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint only supports GET requests.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}