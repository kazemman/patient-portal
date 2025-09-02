import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { gte, lte, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    // Set default date range (last 30 days)
    const endDate = endDateParam || new Date().toISOString().split('T')[0];
    const startDate = startDateParam || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({
        error: "Invalid date format. Use YYYY-MM-DD format",
        code: "INVALID_DATE_FORMAT"
      }, { status: 400 });
    }

    // Validate date range
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (startDateTime > endDateTime) {
      return NextResponse.json({
        error: "Start date must be before end date",
        code: "INVALID_DATE_RANGE"
      }, { status: 400 });
    }

    // Check maximum date range (1 year)
    const daysDifference = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference > 365) {
      return NextResponse.json({
        error: "Date range cannot exceed 1 year",
        code: "DATE_RANGE_TOO_LARGE"
      }, { status: 400 });
    }

    // Query checkins within date range
    const startDateTimeISO = `${startDate}T00:00:00.000Z`;
    const endDateTimeISO = `${endDate}T23:59:59.999Z`;

    const checkinData = await db.select()
      .from(checkins)
      .where(and(
        gte(checkins.checkinTime, startDateTimeISO),
        lte(checkins.checkinTime, endDateTimeISO)
      ));

    // Group data by date and calculate statistics
    const dailyStats = new Map();
    const overallTotals = {
      totalCheckins: 0,
      paymentMethodTotals: { medical_aid: 0, cash: 0, both: 0 },
      statusTotals: { waiting: 0, attended: 0, cancelled: 0 },
      totalWaitingTime: 0,
      attendedCount: 0
    };

    // Process each check-in record
    checkinData.forEach(checkin => {
      const checkinDate = checkin.checkinTime.split('T')[0]; // Extract YYYY-MM-DD
      
      if (!dailyStats.has(checkinDate)) {
        dailyStats.set(checkinDate, {
          date: checkinDate,
          total_checkins: 0,
          payment_method_breakdown: { medical_aid: 0, cash: 0, both: 0 },
          status_breakdown: { waiting: 0, attended: 0, cancelled: 0 },
          waiting_times: [],
          no_shows: 0
        });
      }

      const dayStats = dailyStats.get(checkinDate);
      
      // Update daily totals
      dayStats.total_checkins++;
      dayStats.payment_method_breakdown[checkin.paymentMethod as keyof typeof dayStats.payment_method_breakdown]++;
      dayStats.status_breakdown[checkin.status as keyof typeof dayStats.status_breakdown]++;

      // Track waiting times for attended patients
      if (checkin.status === 'attended' && checkin.waitingTimeMinutes) {
        dayStats.waiting_times.push(checkin.waitingTimeMinutes);
      }

      // Count no-shows (status still 'waiting' - assumption for this logic)
      if (checkin.status === 'waiting') {
        dayStats.no_shows++;
      }

      // Update overall totals
      overallTotals.totalCheckins++;
      overallTotals.paymentMethodTotals[checkin.paymentMethod as keyof typeof overallTotals.paymentMethodTotals]++;
      overallTotals.statusTotals[checkin.status as keyof typeof overallTotals.statusTotals]++;
      
      if (checkin.status === 'attended' && checkin.waitingTimeMinutes) {
        overallTotals.totalWaitingTime += checkin.waitingTimeMinutes;
        overallTotals.attendedCount++;
      }
    });

    // Calculate final statistics for each day
    const dailyData = Array.from(dailyStats.values()).map(dayStats => ({
      date: dayStats.date,
      total_checkins: dayStats.total_checkins,
      payment_method_breakdown: dayStats.payment_method_breakdown,
      status_breakdown: dayStats.status_breakdown,
      average_waiting_time: dayStats.waiting_times.length > 0 
        ? Math.round(dayStats.waiting_times.reduce((sum, time) => sum + time, 0) / dayStats.waiting_times.length)
        : 0,
      no_shows: dayStats.no_shows
    }));

    // Sort daily data by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate overall summary
    const totalDays = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const attendanceRate = overallTotals.totalCheckins > 0 
      ? Math.round((overallTotals.statusTotals.attended / overallTotals.totalCheckins) * 100)
      : 0;

    const summary = {
      total_days: totalDays,
      total_checkins: overallTotals.totalCheckins,
      daily_average: overallTotals.totalCheckins > 0 
        ? Math.round(overallTotals.totalCheckins / totalDays * 100) / 100
        : 0,
      overall_avg_waiting_time: overallTotals.attendedCount > 0 
        ? Math.round(overallTotals.totalWaitingTime / overallTotals.attendedCount)
        : 0,
      payment_method_totals: overallTotals.paymentMethodTotals,
      attendance_rate: attendanceRate
    };

    const response = {
      period: {
        start_date: startDate,
        end_date: endDate
      },
      daily_data: dailyData,
      summary: summary
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}