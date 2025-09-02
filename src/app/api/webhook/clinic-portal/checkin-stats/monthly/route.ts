import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { gte, lte, and } from 'drizzle-orm';

// TypeScript interfaces
interface MonthlyData {
  month: string;
  month_name: string;
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
  daily_average: number;
  peak_day: string | null;
}

interface Summary {
  total_months: number;
  total_checkins: number;
  monthly_average: number;
  overall_avg_waiting_time: number;
  payment_method_totals: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  attendance_rate: number;
  growth_trend: number;
  peak_month: {
    month: string;
    month_name: string;
    checkins: number;
  } | null;
}

interface ApiResponse {
  monthly_data: MonthlyData[];
  summary: Summary;
  date_range: {
    start_date: string;
    end_date: string;
  };
}

// Utility functions
function getMonthName(year: number, month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[month]} ${year}`;
}

function validateDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 12);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    // Set and validate dates
    let startDate: string;
    let endDate: string;

    if (startDateParam) {
      if (!validateDateFormat(startDateParam)) {
        return NextResponse.json({
          error: "Invalid start_date format. Use YYYY-MM-DD format",
          code: "INVALID_START_DATE_FORMAT"
        }, { status: 400 });
      }
      startDate = startDateParam;
    } else {
      startDate = getDefaultStartDate();
    }

    if (endDateParam) {
      if (!validateDateFormat(endDateParam)) {  
        return NextResponse.json({
          error: "Invalid end_date format. Use YYYY-MM-DD format",
          code: "INVALID_END_DATE_FORMAT"
        }, { status: 400 });
      }
      endDate = endDateParam;
    } else {
      endDate = getDefaultEndDate();
    }

    // Validate date range
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (startDateTime > endDateTime) {
      return NextResponse.json({
        error: "start_date cannot be later than end_date",
        code: "INVALID_DATE_RANGE"
      }, { status: 400 });
    }

    // Check maximum date range (2 years)
    const daysDifference = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference > 730) { // 2 years
      return NextResponse.json({
        error: "Date range cannot exceed 2 years (730 days)",
        code: "DATE_RANGE_TOO_LARGE"
      }, { status: 400 });
    }

    // Query checkins within date range  
    const startDateTimeISO = `${startDate}T00:00:00.000Z`;
    const endDateTimeISO = `${endDate}T23:59:59.999Z`;

    const allCheckins = await db.select()
      .from(checkins)
      .where(and(
        gte(checkins.checkinTime, startDateTimeISO),
        lte(checkins.checkinTime, endDateTimeISO)
      ));

    // Group checkins by month
    const monthlyDataMap = new Map<string, {
      month: string;
      month_name: string;
      year: number;
      monthNumber: number;
      checkins: typeof allCheckins;
      dailyCounts: Map<string, number>;
    }>();

    // Process each checkin
    allCheckins.forEach(checkin => {
      const checkinDate = new Date(checkin.checkinTime);
      const year = checkinDate.getFullYear();
      const monthNumber = checkinDate.getMonth() + 1; // 1-based month
      const monthKey = `${year}-${String(monthNumber).padStart(2, '0')}`;
      const monthName = getMonthName(year, monthNumber - 1); // 0-based for getMonthName
      const dayKey = checkin.checkinTime.split('T')[0]; // YYYY-MM-DD

      if (!monthlyDataMap.has(monthKey)) {
        monthlyDataMap.set(monthKey, {
          month: monthKey,
          month_name: monthName,
          year,
          monthNumber,
          checkins: [],
          dailyCounts: new Map()
        });
      }

      const monthData = monthlyDataMap.get(monthKey)!;
      monthData.checkins.push(checkin);

      // Track daily counts for peak day calculation
      const currentDayCount = monthData.dailyCounts.get(dayKey) || 0;
      monthData.dailyCounts.set(dayKey, currentDayCount + 1);
    });

    // Calculate monthly statistics
    const monthlyStats: MonthlyData[] = [];
    
    for (const monthData of monthlyDataMap.values()) {
      const { month, month_name, year, monthNumber, checkins: monthCheckins, dailyCounts } = monthData;
      
      // Calculate payment method breakdown
      const paymentMethodBreakdown = {
        medical_aid: 0,
        cash: 0,
        both: 0
      };

      // Calculate status breakdown
      const statusBreakdown = {
        waiting: 0,
        attended: 0,
        cancelled: 0
      };

      let totalWaitingTime = 0;
      let attendedWithWaitingTime = 0;

      monthCheckins.forEach(checkin => {
        // Payment method counts
        paymentMethodBreakdown[checkin.paymentMethod as keyof typeof paymentMethodBreakdown]++;
        
        // Status counts
        statusBreakdown[checkin.status as keyof typeof statusBreakdown]++;

        // Waiting time calculation for attended patients
        if (checkin.status === 'attended' && checkin.waitingTimeMinutes !== null) {
          totalWaitingTime += checkin.waitingTimeMinutes;
          attendedWithWaitingTime++;
        }
      });

      // Calculate average waiting time
      const averageWaitingTime = attendedWithWaitingTime > 0 
        ? Math.round(totalWaitingTime / attendedWithWaitingTime)
        : 0;

      // Calculate daily average
      const daysInMonth = getDaysInMonth(year, monthNumber);
      const dailyAverage = Math.round((monthCheckins.length / daysInMonth) * 100) / 100;

      // Find peak day
      let peakDay: string | null = null;
      let maxDayCount = 0;
      
      for (const [day, count] of dailyCounts.entries()) {
        if (count > maxDayCount) {
          maxDayCount = count;
          peakDay = day;
        }
      }

      monthlyStats.push({
        month,
        month_name,
        total_checkins: monthCheckins.length,
        payment_method_breakdown: paymentMethodBreakdown,
        status_breakdown: statusBreakdown,
        average_waiting_time: averageWaitingTime,
        daily_average: dailyAverage,
        peak_day: peakDay
      });
    }

    // Sort monthly stats by month
    monthlyStats.sort((a, b) => a.month.localeCompare(b.month));

    // Calculate overall summary statistics
    const totalCheckins = allCheckins.length;
    const totalMonths = monthlyStats.length;
    const monthlyAverage = totalMonths > 0 
      ? Math.round((totalCheckins / totalMonths) * 100) / 100 
      : 0;

    // Overall payment method totals
    const paymentMethodTotals = {
      medical_aid: 0,
      cash: 0,
      both: 0
    };

    let overallTotalWaitingTime = 0;
    let overallAttendedCount = 0;
    let overallAttendedTotal = 0;

    allCheckins.forEach(checkin => {
      paymentMethodTotals[checkin.paymentMethod as keyof typeof paymentMethodTotals]++;
      
      if (checkin.status === 'attended') {
        overallAttendedTotal++;
        if (checkin.waitingTimeMinutes !== null) {
          overallTotalWaitingTime += checkin.waitingTimeMinutes;
          overallAttendedCount++;
        }
      }
    });

    // Calculate overall average waiting time
    const overallAvgWaitingTime = overallAttendedCount > 0 
      ? Math.round(overallTotalWaitingTime / overallAttendedCount)
      : 0;

    // Calculate attendance rate
    const attendanceRate = totalCheckins > 0 
      ? Math.round((overallAttendedTotal / totalCheckins) * 10000) / 100
      : 0;

    // Calculate growth trend (month-over-month average)
    let totalGrowthPercentage = 0;
    let growthCalculations = 0;

    for (let i = 1; i < monthlyStats.length; i++) {
      const currentMonthCheckins = monthlyStats[i].total_checkins;
      const previousMonthCheckins = monthlyStats[i - 1].total_checkins;
      
      if (previousMonthCheckins > 0) {
        const growthPercentage = ((currentMonthCheckins - previousMonthCheckins) / previousMonthCheckins) * 100;
        totalGrowthPercentage += growthPercentage;
        growthCalculations++;
      }
    }

    const growthTrend = growthCalculations > 0 
      ? Math.round((totalGrowthPercentage / growthCalculations) * 100) / 100
      : 0;

    // Find peak month
    const peakMonth = monthlyStats.reduce<MonthlyData | null>((peak, current) => {
      if (!peak || current.total_checkins > peak.total_checkins) {
        return current;
      }
      return peak;
    }, null);

    const summary: Summary = {
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

    const response: ApiResponse = {
      monthly_data: monthlyStats,
      summary,
      date_range: {
        start_date: startDate,
        end_date: endDate
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET monthly check-in statistics error:', error);
    return NextResponse.json({
      error: 'Internal server error occurred while processing monthly statistics',
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

// Method restriction - only allow GET requests
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