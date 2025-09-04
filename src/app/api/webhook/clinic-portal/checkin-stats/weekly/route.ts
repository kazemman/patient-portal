import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { gte, lte, and } from 'drizzle-orm';

/**
 * ISO week calculation utilities
 */

/**
 * Get ISO week string (YYYY-WXX format) for a given date
 * @param date - The date to get the ISO week for
 * @returns ISO week string in format YYYY-WXX
 */
function getISOWeek(date: Date): string {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  
  // Set to Thursday of this week (ISO week definition)
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  
  // Get first Thursday of the year
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  
  // Calculate week number
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  
  return `${tempDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get the start date (Monday) of an ISO week
 * @param isoWeek - ISO week string (YYYY-WXX)
 * @returns Date object for Monday of that week
 */
function getWeekStart(isoWeek: string): Date {
  const [year, week] = isoWeek.split('-W');
  const jan4 = new Date(parseInt(year), 0, 4);
  const weekStart = new Date(jan4);
  
  // Get Monday of week 1
  const dayOfWeek = jan4.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(jan4.getDate() + daysToMonday);
  
  // Add weeks to get to target week
  weekStart.setDate(weekStart.getDate() + (parseInt(week) - 1) * 7);
  
  return weekStart;
}

/**
 * Get the end date (Sunday) of an ISO week
 * @param weekStart - Monday date of the week
 * @returns Date object for Sunday of that week
 */
function getWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

/**
 * Get day of week name from date
 * @param date - Date object
 * @returns Day name in lowercase
 */
function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * TypeScript interfaces for type safety
 */
interface WeeklyCheckInData {
  week: string;
  week_start: string;
  week_end: string;
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
  total_amount_collected: number;
  amount_breakdown_by_payment_method: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  average_amount_per_checkin: number;
}

interface WeeklySummary {
  total_weeks: number;
  weekly_average_checkins: number;
  overall_avg_waiting_time: number;
  payment_method_totals: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  attendance_rate: number;
  busiest_day_of_week: string;
  total_revenue: number;
  average_weekly_revenue: number;
  revenue_by_payment_method: {
    medical_aid: number;
    cash: number;
    both: number;
  };
  average_amount_per_checkin: number;
}

interface WeeklyStatsResponse {
  weekly_data: WeeklyCheckInData[];
  summary: WeeklySummary;
  date_range: {
    start_date: string;
    end_date: string;
  };
}

/**
 * GET /api/checkin-stats/weekly
 * 
 * Returns weekly check-in statistics grouped by ISO week (YYYY-WXX format).
 * Supports optional start_date and end_date query parameters (defaults to last 12 weeks).
 * Validates date range (max 1 year) and calculates comprehensive weekly analytics.
 * 
 * @param request - NextRequest with optional query parameters
 * @returns Weekly statistics with summary data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    let startDate: Date;
    let endDate: Date;

    // Validate and parse date parameters
    if (startDateParam || endDateParam) {
      if (startDateParam) {
        startDate = new Date(startDateParam);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json({ 
            error: "Invalid start_date format. Use YYYY-MM-DD",
            code: "INVALID_START_DATE" 
          }, { status: 400 });
        }
      } else {
        // Default to 12 weeks before end date
        endDate = new Date(endDateParam!);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (12 * 7));
      }

      if (endDateParam) {
        endDate = new Date(endDateParam);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({ 
            error: "Invalid end_date format. Use YYYY-MM-DD",
            code: "INVALID_END_DATE" 
          }, { status: 400 });
        }
      } else {
        // Default to today
        endDate = new Date();
      }

      if (startDate > endDate) {
        return NextResponse.json({ 
          error: "start_date cannot be after end_date",
          code: "INVALID_DATE_RANGE" 
        }, { status: 400 });
      }
    } else {
      // Default: last 12 weeks
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - (12 * 7));
    }

    // Validate maximum date range (1 year)
    const daysDifference = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference > 365) {
      return NextResponse.json({
        error: "Date range cannot exceed 1 year",
        code: "DATE_RANGE_TOO_LARGE"
      }, { status: 400 });
    }

    // Query checkins within date range
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();

    const checkinsData = await db.select()
      .from(checkins)
      .where(
        and(
          gte(checkins.checkinTime, startDateTime),
          lte(checkins.checkinTime, endDateTime)
        )
      );

    // Group data by ISO week
    const weeklyDataMap = new Map<string, {
      week: string;
      week_start: string;
      week_end: string;
      checkins: typeof checkinsData;
      amounts: { medical_aid: number[]; cash: number[]; both: number[] };
    }>();

    // Track daily counts for busiest day calculation
    const dailyCounts = new Map<string, number>();

    // Overall amounts tracking
    const overallAmounts = { medical_aid: [] as number[], cash: [] as number[], both: [] as number[] };

    // Process each check-in record
    checkinsData.forEach(checkin => {
      const checkinDate = new Date(checkin.checkinTime);
      const isoWeek = getISOWeek(checkinDate);
      const dayOfWeek = getDayOfWeek(checkinDate);
      
      // Track daily counts across all weeks
      dailyCounts.set(dayOfWeek, (dailyCounts.get(dayOfWeek) || 0) + 1);

      // Initialize week data if not exists
      if (!weeklyDataMap.has(isoWeek)) {
        const weekStart = getWeekStart(isoWeek);
        const weekEnd = getWeekEnd(weekStart);
        weeklyDataMap.set(isoWeek, {
          week: isoWeek,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          checkins: [],
          amounts: { medical_aid: [], cash: [], both: [] }
        });
      }
      
      // Add checkin to week data
      const weekData = weeklyDataMap.get(isoWeek)!;
      weekData.checkins.push(checkin);

      // Track amounts by payment method
      const paymentMethod = checkin.paymentMethod as keyof typeof weekData.amounts;
      if (checkin.amount !== null && checkin.amount !== undefined) {
        weekData.amounts[paymentMethod].push(checkin.amount);
        overallAmounts[paymentMethod].push(checkin.amount);
      }
    });

    // Calculate weekly statistics
    const weeklyStats: WeeklyCheckInData[] = Array.from(weeklyDataMap.values()).map(weekData => {
      const { week, week_start, week_end, checkins: weekCheckins, amounts } = weekData;
      
      // Initialize counters
      const paymentMethodBreakdown = {
        medical_aid: 0,
        cash: 0,
        both: 0
      };
      
      const statusBreakdown = {
        waiting: 0,
        attended: 0,
        cancelled: 0
      };
      
      let totalWaitingTime = 0;
      let attendedCount = 0;
      
      // Process week's check-ins
      weekCheckins.forEach(checkin => {
        // Count payment methods
        paymentMethodBreakdown[checkin.paymentMethod as keyof typeof paymentMethodBreakdown]++;
        
        // Count statuses
        statusBreakdown[checkin.status as keyof typeof statusBreakdown]++;
        
        // Calculate waiting time for attended patients
        if (checkin.status === 'attended' && checkin.waitingTimeMinutes) {
          totalWaitingTime += checkin.waitingTimeMinutes;
          attendedCount++;
        }
      });
      
      // Calculate averages
      const averageWaitingTime = attendedCount > 0 ? Math.round(totalWaitingTime / attendedCount) : 0;
      const dailyAverage = Math.round((weekCheckins.length / 7) * 100) / 100;

      // Calculate amount statistics
      const medicalAidTotal = amounts.medical_aid.reduce((sum, amount) => sum + amount, 0);
      const cashTotal = amounts.cash.reduce((sum, amount) => sum + amount, 0);
      const bothTotal = amounts.both.reduce((sum, amount) => sum + amount, 0);
      const totalAmountCollected = medicalAidTotal + cashTotal + bothTotal;
      const avgAmountPerCheckin = weekCheckins.length > 0 ? totalAmountCollected / weekCheckins.length : 0;
      
      return {
        week,
        week_start,
        week_end,
        total_checkins: weekCheckins.length,
        payment_method_breakdown: paymentMethodBreakdown,
        status_breakdown: statusBreakdown,
        average_waiting_time: averageWaitingTime,
        daily_average: dailyAverage,
        total_amount_collected: Math.round(totalAmountCollected * 100) / 100,
        amount_breakdown_by_payment_method: {
          medical_aid: Math.round(medicalAidTotal * 100) / 100,
          cash: Math.round(cashTotal * 100) / 100,
          both: Math.round(bothTotal * 100) / 100
        },
        average_amount_per_checkin: Math.round(avgAmountPerCheckin * 100) / 100
      };
    });

    // Sort weekly stats by week (chronological order)
    weeklyStats.sort((a, b) => a.week.localeCompare(b.week));

    // Calculate overall summary statistics
    const totalCheckins = checkinsData.length;
    const totalWeeks = weeklyStats.length;
    
    // Overall payment method totals
    const paymentMethodTotals = {
      medical_aid: 0,
      cash: 0,
      both: 0
    };
    
    let totalAttended = 0;
    let totalWaitingTime = 0;
    let totalAttendedWithWaitTime = 0;
    
    // Aggregate totals from all check-ins
    checkinsData.forEach(checkin => {
      paymentMethodTotals[checkin.paymentMethod as keyof typeof paymentMethodTotals]++;
      
      if (checkin.status === 'attended') {
        totalAttended++;
        if (checkin.waitingTimeMinutes) {
          totalWaitingTime += checkin.waitingTimeMinutes;
          totalAttendedWithWaitTime++;
        }
      }
    });
    
    // Find busiest day of week
    let busiestDay = 'monday';
    let maxCount = 0;
    dailyCounts.forEach((count, day) => {
      if (count > maxCount) {
        maxCount = count;
        busiestDay = day;
      }
    });

    // Calculate summary metrics
    const weeklyAverageCheckins = totalWeeks > 0 ? Math.round((totalCheckins / totalWeeks) * 100) / 100 : 0;
    const overallAvgWaitingTime = totalAttendedWithWaitTime > 0 ? Math.round(totalWaitingTime / totalAttendedWithWaitTime) : 0;
    const attendanceRate = totalCheckins > 0 ? Math.round((totalAttended / totalCheckins) * 10000) / 100 : 0;

    // Calculate overall revenue statistics
    const overallMedicalAidRevenue = overallAmounts.medical_aid.reduce((sum, amount) => sum + amount, 0);
    const overallCashRevenue = overallAmounts.cash.reduce((sum, amount) => sum + amount, 0);
    const overallBothRevenue = overallAmounts.both.reduce((sum, amount) => sum + amount, 0);
    const totalRevenue = overallMedicalAidRevenue + overallCashRevenue + overallBothRevenue;
    const averageWeeklyRevenue = totalWeeks > 0 ? totalRevenue / totalWeeks : 0;
    const avgAmountPerCheckin = totalCheckins > 0 ? totalRevenue / totalCheckins : 0;

    const summary: WeeklySummary = {
      total_weeks: totalWeeks,
      weekly_average_checkins: weeklyAverageCheckins,
      overall_avg_waiting_time: overallAvgWaitingTime,
      payment_method_totals: paymentMethodTotals,
      attendance_rate: attendanceRate,
      busiest_day_of_week: busiestDay,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      average_weekly_revenue: Math.round(averageWeeklyRevenue * 100) / 100,
      revenue_by_payment_method: {
        medical_aid: Math.round(overallMedicalAidRevenue * 100) / 100,
        cash: Math.round(overallCashRevenue * 100) / 100,
        both: Math.round(overallBothRevenue * 100) / 100
      },
      average_amount_per_checkin: Math.round(avgAmountPerCheckin * 100) / 100
    };

    const response: WeeklyStatsResponse = {
      weekly_data: weeklyStats,
      summary,
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET weekly check-in statistics error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

/**
 * Handle unsupported HTTP methods
 */
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