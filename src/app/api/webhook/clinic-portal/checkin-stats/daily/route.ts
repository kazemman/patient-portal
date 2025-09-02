import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { gte, lte, and } from 'drizzle-orm';

// Interface definitions for type safety
interface DailyStatistics {
  date: string;
  total_checkins: number;
  payment_method_breakdown: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  status_breakdown: {
    waiting: number;
    attended: number;
    cancelled: number;
  };
  average_waiting_time: number;
  attendance_rate: number;
  no_shows: number;
}

interface Summary {
  total_days: number;
  total_checkins: number;
  daily_average: number;
  overall_avg_waiting_time: number;
  payment_method_totals: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  overall_attendance_rate: number;
  peak_day: {
    date: string;
    checkins: number;
  } | null;
}

interface ApiResponse {
  period: {
    start_date: string;
    end_date: string;
  };
  daily_data: DailyStatistics[];
  summary: Summary;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    // Set default date range (last 30 days)
    const today = new Date();
    const defaultStartDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const endDate = endDateParam || today.toISOString().split('T')[0];
    const startDate = startDateParam || defaultStartDate.toISOString().split('T')[0];

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return NextResponse.json({
        error: "Invalid start_date format. Use YYYY-MM-DD format",
        code: "INVALID_START_DATE_FORMAT"
      }, { status: 400 });
    }

    if (!dateRegex.test(endDate)) {
      return NextResponse.json({
        error: "Invalid end_date format. Use YYYY-MM-DD format", 
        code: "INVALID_END_DATE_FORMAT"
      }, { status: 400 });
    }

    // Validate date values
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json({
        error: "Invalid start_date value",
        code: "INVALID_START_DATE"
      }, { status: 400 });
    }

    if (isNaN(endDateTime.getTime())) {
      return NextResponse.json({
        error: "Invalid end_date value", 
        code: "INVALID_END_DATE"
      }, { status: 400 });
    }

    // Validate date range
    if (startDateTime > endDateTime) {
      return NextResponse.json({
        error: "Start date must be before or equal to end date",
        code: "INVALID_DATE_RANGE"
      }, { status: 400 });
    }

    // Check maximum date range (1 year)
    const daysDifference = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return NextResponse.json({
        error: "Date range cannot exceed 1 year (365 days)",
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

    // Generate all dates in range for complete daily data
    const allDates = [];
    const currentDate = new Date(startDateTime);
    while (currentDate <= endDateTime) {
      allDates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group data by date and calculate statistics
    const dailyStatsMap = new Map<string, {
      date: string;
      checkins: typeof checkinData;
      paymentMethods: { medical_aid: number; cash: number; both: number };
      statuses: { waiting: number; attended: number; cancelled: number };
      waitingTimes: number[];
    }>();

    // Initialize all dates with empty data
    allDates.forEach(date => {
      dailyStatsMap.set(date, {
        date,
        checkins: [],
        paymentMethods: { medical_aid: 0, cash: 0, both: 0 },
        statuses: { waiting: 0, attended: 0, cancelled: 0 },
        waitingTimes: []
      });
    });

    // Overall tracking variables
    let totalCheckins = 0;
    const overallPaymentMethods = { medical_aid: 0, cash: 0, both: 0 };
    const overallStatuses = { waiting: 0, attended: 0, cancelled: 0 };
    let totalWaitingTime = 0;
    let attendedWithWaitingTime = 0;

    // Process each check-in record
    checkinData.forEach(checkin => {
      const checkinDate = checkin.checkinTime.split('T')[0]; // Extract YYYY-MM-DD
      const dayData = dailyStatsMap.get(checkinDate);
      
      if (dayData) {
        dayData.checkins.push(checkin);
        
        // Update payment method counts
        const paymentMethod = checkin.paymentMethod as keyof typeof dayData.paymentMethods;
        if (paymentMethod in dayData.paymentMethods) {
          dayData.paymentMethods[paymentMethod]++;
        }
        
        // Update status counts
        const status = checkin.status as keyof typeof dayData.statuses;
        if (status in dayData.statuses) {
          dayData.statuses[status]++;
        }

        // Track waiting times for attended patients
        if (checkin.status === 'attended' && checkin.waitingTimeMinutes !== null && checkin.waitingTimeMinutes !== undefined) {
          dayData.waitingTimes.push(checkin.waitingTimeMinutes);
        }
      }

      // Update overall totals
      totalCheckins++;
      const overallPaymentMethod = checkin.paymentMethod as keyof typeof overallPaymentMethods;
      if (overallPaymentMethod in overallPaymentMethods) {
        overallPaymentMethods[overallPaymentMethod]++;
      }
      
      const overallStatus = checkin.status as keyof typeof overallStatuses;
      if (overallStatus in overallStatuses) {
        overallStatuses[overallStatus]++;
      }
      
      if (checkin.status === 'attended' && checkin.waitingTimeMinutes !== null && checkin.waitingTimeMinutes !== undefined) {
        totalWaitingTime += checkin.waitingTimeMinutes;
        attendedWithWaitingTime++;
      }
    });

    // Calculate final statistics for each day
    const dailyData: DailyStatistics[] = [];
    let peakDay: { date: string; checkins: number } | null = null;

    for (const dayData of dailyStatsMap.values()) {
      const totalDayCheckins = dayData.checkins.length;
      const attendedCount = dayData.statuses.attended;
      const attendanceRate = totalDayCheckins > 0 ? Math.round((attendedCount / totalDayCheckins) * 100) : 0;
      
      // Calculate average waiting time for the day
      const avgWaitingTime = dayData.waitingTimes.length > 0 
        ? Math.round(dayData.waitingTimes.reduce((sum, time) => sum + time, 0) / dayData.waitingTimes.length)
        : 0;

      const dayStats: DailyStatistics = {
        date: dayData.date,
        total_checkins: totalDayCheckins,
        payment_method_breakdown: dayData.paymentMethods,
        status_breakdown: dayData.statuses,
        average_waiting_time: avgWaitingTime,
        attendance_rate: attendanceRate,
        no_shows: dayData.statuses.waiting // Patients still waiting are considered no-shows for historical data
      };

      dailyData.push(dayStats);

      // Track peak day
      if (!peakDay || totalDayCheckins > peakDay.checkins) {
        peakDay = { date: dayData.date, checkins: totalDayCheckins };
      }
    }

    // Sort daily data by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate overall summary
    const totalDays = allDates.length;
    const dailyAverage = totalDays > 0 ? Math.round((totalCheckins / totalDays) * 100) / 100 : 0;
    const overallAvgWaitingTime = attendedWithWaitingTime > 0 
      ? Math.round(totalWaitingTime / attendedWithWaitingTime)
      : 0;
    const overallAttendanceRate = totalCheckins > 0 
      ? Math.round((overallStatuses.attended / totalCheckins) * 100)
      : 0;

    // Reset peak day if no checkins found
    if (peakDay && peakDay.checkins === 0) {
      peakDay = null;
    }

    const summary: Summary = {
      total_days: totalDays,
      total_checkins: totalCheckins,
      daily_average: dailyAverage,
      overall_avg_waiting_time: overallAvgWaitingTime,
      payment_method_totals: overallPaymentMethods,
      overall_attendance_rate: overallAttendanceRate,
      peak_day: peakDay
    };

    const response: ApiResponse = {
      period: {
        start_date: startDate,
        end_date: endDate
      },
      daily_data: dailyData,
      summary: summary
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Daily check-in statistics API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error occurred while processing daily check-in statistics',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

// Prevent other HTTP methods
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

export async function PATCH() {
  return NextResponse.json({ 
    error: 'Method not allowed. This endpoint only supports GET requests.',
    code: 'METHOD_NOT_ALLOWED'
  }, { status: 405 });
}