import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins } from '@/db/schema';
import { gte, lte, and } from 'drizzle-orm';

function getISOWeek(date: Date): string {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${tempDate.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getWeekStart(isoWeek: string): Date {
  const [year, week] = isoWeek.split('-W');
  const yearStart = new Date(parseInt(year), 0, 1);
  const weekStart = new Date(yearStart);
  weekStart.setDate(yearStart.getDate() + (parseInt(week) - 1) * 7 - yearStart.getDay() + 1);
  return weekStart;
}

function getWeekEnd(weekStart: Date): Date {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
}

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    let startDate: Date;
    let endDate: Date;

    // Validate and parse dates
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

    // Query checkins within date range
    const checkinsData = await db.select()
      .from(checkins)
      .where(
        and(
          gte(checkins.checkinTime, startDate.toISOString()),
          lte(checkins.checkinTime, endDate.toISOString())
        )
      );

    // Group data by ISO week
    const weeklyData = new Map<string, {
      week: string;
      week_start: string;
      week_end: string;
      checkins: typeof checkinsData;
    }>();

    // Track daily counts for busiest day calculation
    const dailyCounts = new Map<string, number>();

    checkinsData.forEach(checkin => {
      const checkinDate = new Date(checkin.checkinTime);
      const isoWeek = getISOWeek(checkinDate);
      const dayOfWeek = getDayOfWeek(checkinDate);
      
      // Track daily counts
      dailyCounts.set(dayOfWeek, (dailyCounts.get(dayOfWeek) || 0) + 1);

      if (!weeklyData.has(isoWeek)) {
        const weekStart = getWeekStart(isoWeek);
        const weekEnd = getWeekEnd(weekStart);
        weeklyData.set(isoWeek, {
          week: isoWeek,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          checkins: []
        });
      }
      
      weeklyData.get(isoWeek)!.checkins.push(checkin);
    });

    // Calculate weekly statistics
    const weeklyStats = Array.from(weeklyData.values()).map(weekData => {
      const { week, week_start, week_end, checkins: weekCheckins } = weekData;
      
      // Payment method breakdown
      const paymentMethodBreakdown = {
        medical_aid: 0,
        cash: 0,
        both: 0
      };
      
      // Status breakdown
      const statusBreakdown = {
        waiting: 0,
        attended: 0,
        cancelled: 0
      };
      
      let totalWaitingTime = 0;
      let attendedCount = 0;
      
      weekCheckins.forEach(checkin => {
        // Count payment methods
        if (checkin.paymentMethod === 'medical_aid') paymentMethodBreakdown.medical_aid++;
        else if (checkin.paymentMethod === 'cash') paymentMethodBreakdown.cash++;
        else if (checkin.paymentMethod === 'both') paymentMethodBreakdown.both++;
        
        // Count statuses
        if (checkin.status === 'waiting') statusBreakdown.waiting++;
        else if (checkin.status === 'attended') statusBreakdown.attended++;
        else if (checkin.status === 'cancelled') statusBreakdown.cancelled++;
        
        // Calculate waiting time for attended patients
        if (checkin.status === 'attended' && checkin.waitingTimeMinutes) {
          totalWaitingTime += checkin.waitingTimeMinutes;
          attendedCount++;
        }
      });
      
      return {
        week,
        week_start,
        week_end,
        total_checkins: weekCheckins.length,
        payment_method_breakdown: paymentMethodBreakdown,
        status_breakdown: statusBreakdown,
        average_waiting_time: attendedCount > 0 ? Math.round(totalWaitingTime / attendedCount) : 0,
        daily_average: Math.round((weekCheckins.length / 7) * 100) / 100
      };
    });

    // Sort weekly stats by week
    weeklyStats.sort((a, b) => a.week.localeCompare(b.week));

    // Calculate overall summary
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
    
    checkinsData.forEach(checkin => {
      if (checkin.paymentMethod === 'medical_aid') paymentMethodTotals.medical_aid++;
      else if (checkin.paymentMethod === 'cash') paymentMethodTotals.cash++;
      else if (checkin.paymentMethod === 'both') paymentMethodTotals.both++;
      
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

    const summary = {
      total_weeks: totalWeeks,
      total_checkins: totalCheckins,
      weekly_average: totalWeeks > 0 ? Math.round((totalCheckins / totalWeeks) * 100) / 100 : 0,
      overall_avg_waiting_time: totalAttendedWithWaitTime > 0 ? Math.round(totalWaitingTime / totalAttendedWithWaitTime) : 0,
      payment_method_totals: paymentMethodTotals,
      attendance_rate: totalCheckins > 0 ? Math.round((totalAttended / totalCheckins) * 10000) / 100 : 0,
      busiest_day_of_week: busiestDay
    };

    return NextResponse.json({
      weekly_data: weeklyStats,
      summary
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}