import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  clinicPatients, 
  clinicAppointments, 
  staff, 
  departments, 
  checkins, 
  queue, 
  auditLogs 
} from '@/db/schema';
import { eq, gte, lte, count, avg, sum, desc, asc, and, or, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const period = searchParams.get('period') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const departmentId = searchParams.get('departmentId');
    const staffId = searchParams.get('staffId');

    // Validate analytics type
    const validTypes = ['patients', 'appointments', 'staff-performance', 'overview'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid analytics type. Must be one of: patients, appointments, staff-performance, overview',
        code: 'INVALID_ANALYTICS_TYPE'
      }, { status: 400 });
    }

    // Calculate date range based on period
    const now = new Date();
    let dateFrom: string;
    let dateTo = now.toISOString().split('T')[0];

    if (startDate && endDate) {
      dateFrom = startDate;
      dateTo = endDate;
      
      if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json({
          error: 'Start date cannot be after end date',
          code: 'INVALID_DATE_RANGE'
        }, { status: 400 });
      }
    } else {
      switch (period) {
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'quarter':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'year':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        default: // month
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    }

    let analyticsData;

    switch (type) {
      case 'patients':
        analyticsData = await getPatientAnalytics(dateFrom, dateTo, departmentId);
        break;
      case 'appointments':
        analyticsData = await getAppointmentAnalytics(dateFrom, dateTo, departmentId, staffId);
        break;
      case 'staff-performance':
        analyticsData = await getStaffPerformanceAnalytics(dateFrom, dateTo, departmentId, staffId);
        break;
      case 'overview':
        analyticsData = await getOverviewAnalytics(dateFrom, dateTo, departmentId);
        break;
    }

    return NextResponse.json({
      type,
      period,
      dateRange: { from: dateFrom, to: dateTo },
      filters: {
        departmentId: departmentId || null,
        staffId: staffId || null
      },
      ...analyticsData
    });

  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

async function getPatientAnalytics(dateFrom: string, dateTo: string, departmentId?: string | null) {
  // Patient registrations over time
  const registrationsByDay = await db
    .select({
      date: clinicPatients.registrationDate,
      count: count()
    })
    .from(clinicPatients)
    .where(and(
      gte(clinicPatients.registrationDate, dateFrom),
      lte(clinicPatients.registrationDate, dateTo)
    ))
    .groupBy(clinicPatients.registrationDate)
    .orderBy(asc(clinicPatients.registrationDate));

  // Patient status distribution
  const statusDistribution = await db
    .select({
      status: clinicPatients.status,
      count: count()
    })
    .from(clinicPatients)
    .groupBy(clinicPatients.status);

  // Age demographics
  const ageGroups = await db
    .select({
      dateOfBirth: clinicPatients.dateOfBirth,
      id: clinicPatients.id
    })
    .from(clinicPatients);

  const ageDemographics = calculateAgeGroups(ageGroups);

  // Total patient counts
  const totalPatients = await db
    .select({ count: count() })
    .from(clinicPatients);

  const activePatients = await db
    .select({ count: count() })
    .from(clinicPatients)
    .where(eq(clinicPatients.active, true));

  const newPatients = await db
    .select({ count: count() })
    .from(clinicPatients)
    .where(and(
      gte(clinicPatients.registrationDate, dateFrom),
      lte(clinicPatients.registrationDate, dateTo)
    ));

  return {
    summary: {
      totalPatients: totalPatients[0]?.count || 0,
      activePatients: activePatients[0]?.count || 0,
      newPatients: newPatients[0]?.count || 0,
      activeRatio: totalPatients[0]?.count > 0 
        ? ((activePatients[0]?.count || 0) / totalPatients[0].count * 100).toFixed(1)
        : 0
    },
    charts: {
      registrationsOverTime: registrationsByDay,
      statusDistribution,
      ageDemographics
    },
    trends: {
      registrationTrend: calculateTrend(registrationsByDay)
    }
  };
}

async function getAppointmentAnalytics(dateFrom: string, dateTo: string, departmentId?: string | null, staffId?: string | null) {
  let baseQuery = db
    .select({
      date: clinicAppointments.appointmentDate,
      time: clinicAppointments.appointmentTime,
      status: clinicAppointments.status,
      duration: clinicAppointments.duration,
      departmentId: clinicAppointments.departmentId,
      staffId: clinicAppointments.staffId
    })
    .from(clinicAppointments);

  let whereConditions = [
    gte(clinicAppointments.appointmentDate, dateFrom),
    lte(clinicAppointments.appointmentDate, dateTo)
  ];

  if (departmentId) {
    whereConditions.push(eq(clinicAppointments.departmentId, parseInt(departmentId)));
  }

  if (staffId) {
    whereConditions.push(eq(clinicAppointments.staffId, parseInt(staffId)));
  }

  const appointments = await baseQuery.where(and(...whereConditions));

  // Daily appointment counts
  const dailyCounts = appointments.reduce((acc: any, apt) => {
    acc[apt.date] = (acc[apt.date] || 0) + 1;
    return acc;
  }, {});

  const dailyData = Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count
  }));

  // Status breakdown
  const statusBreakdown = appointments.reduce((acc: any, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1;
    return acc;
  }, {});

  // Peak hours analysis
  const hourlyData = appointments.reduce((acc: any, apt) => {
    const hour = apt.time.split(':')[0];
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  // Average duration
  const avgDuration = appointments.reduce((sum, apt) => sum + (apt.duration || 30), 0) / appointments.length || 0;

  // Department utilization
  const departmentData = appointments.reduce((acc: any, apt) => {
    if (apt.departmentId) {
      acc[apt.departmentId] = (acc[apt.departmentId] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    summary: {
      totalAppointments: appointments.length,
      averageDuration: Math.round(avgDuration),
      completionRate: appointments.length > 0 
        ? ((statusBreakdown['completed'] || 0) / appointments.length * 100).toFixed(1)
        : 0,
      noShowRate: appointments.length > 0 
        ? ((statusBreakdown['no-show'] || 0) / appointments.length * 100).toFixed(1)
        : 0
    },
    charts: {
      dailyAppointments: dailyData,
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({
        status,
        count
      })),
      peakHours: Object.entries(hourlyData).map(([hour, count]) => ({
        hour: `${hour}:00`,
        count
      })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour)),
      departmentUtilization: Object.entries(departmentData).map(([departmentId, count]) => ({
        departmentId: parseInt(departmentId as string),
        count
      }))
    },
    trends: {
      appointmentTrend: calculateTrend(dailyData)
    }
  };
}

async function getStaffPerformanceAnalytics(dateFrom: string, dateTo: string, departmentId?: string | null, staffId?: string | null) {
  let staffQuery = db
    .select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      department: staff.department
    })
    .from(staff)
    .where(eq(staff.isActive, true));

  if (departmentId) {
    staffQuery = staffQuery.where(eq(staff.department, departmentId));
  }

  if (staffId) {
    staffQuery = staffQuery.where(eq(staff.id, parseInt(staffId)));
  }

  const staffMembers = await staffQuery;

  const performanceData = await Promise.all(
    staffMembers.map(async (staffMember) => {
      const appointmentCount = await db
        .select({ count: count() })
        .from(clinicAppointments)
        .where(and(
          eq(clinicAppointments.staffId, staffMember.id),
          gte(clinicAppointments.appointmentDate, dateFrom),
          lte(clinicAppointments.appointmentDate, dateTo)
        ));

      const avgDurationResult = await db
        .select({ avgDuration: avg(clinicAppointments.duration) })
        .from(clinicAppointments)
        .where(and(
          eq(clinicAppointments.staffId, staffMember.id),
          gte(clinicAppointments.appointmentDate, dateFrom),
          lte(clinicAppointments.appointmentDate, dateTo),
          eq(clinicAppointments.status, 'completed')
        ));

      return {
        staffId: staffMember.id,
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        role: staffMember.role,
        department: staffMember.department,
        appointmentsHandled: appointmentCount[0]?.count || 0,
        averageConsultationTime: Math.round(avgDurationResult[0]?.avgDuration || 30)
      };
    })
  );

  // Department workload distribution
  const departmentWorkload = performanceData.reduce((acc: any, staff) => {
    acc[staff.department] = (acc[staff.department] || 0) + staff.appointmentsHandled;
    return acc;
  }, {});

  return {
    summary: {
      totalStaff: staffMembers.length,
      totalAppointmentsHandled: performanceData.reduce((sum, staff) => sum + staff.appointmentsHandled, 0),
      averageAppointmentsPerStaff: performanceData.length > 0 
        ? Math.round(performanceData.reduce((sum, staff) => sum + staff.appointmentsHandled, 0) / performanceData.length)
        : 0
    },
    charts: {
      staffPerformance: performanceData.sort((a, b) => b.appointmentsHandled - a.appointmentsHandled),
      departmentWorkload: Object.entries(departmentWorkload).map(([department, count]) => ({
        department,
        count
      })),
      topPerformers: performanceData
        .sort((a, b) => b.appointmentsHandled - a.appointmentsHandled)
        .slice(0, 5)
    }
  };
}

async function getOverviewAnalytics(dateFrom: string, dateTo: string, departmentId?: string | null) {
  // Get current period data
  const currentPeriodPatients = await db
    .select({ count: count() })
    .from(clinicPatients)
    .where(and(
      gte(clinicPatients.registrationDate, dateFrom),
      lte(clinicPatients.registrationDate, dateTo)
    ));

  const currentPeriodAppointments = await db
    .select({ count: count() })
    .from(clinicAppointments)
    .where(and(
      gte(clinicAppointments.appointmentDate, dateFrom),
      lte(clinicAppointments.appointmentDate, dateTo)
    ));

  // Calculate previous period for comparison
  const periodDays = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24));
  const prevDateFrom = new Date(new Date(dateFrom).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prevDateTo = new Date(new Date(dateFrom).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const previousPeriodPatients = await db
    .select({ count: count() })
    .from(clinicPatients)
    .where(and(
      gte(clinicPatients.registrationDate, prevDateFrom),
      lte(clinicPatients.registrationDate, prevDateTo)
    ));

  const previousPeriodAppointments = await db
    .select({ count: count() })
    .from(clinicAppointments)
    .where(and(
      gte(clinicAppointments.appointmentDate, prevDateFrom),
      lte(clinicAppointments.appointmentDate, prevDateTo)
    ));

  // Queue performance
  const avgWaitTime = await db
    .select({ avgWait: avg(queue.estimatedWaitTime) })
    .from(queue)
    .where(and(
      gte(queue.checkinTime, dateFrom),
      lte(queue.checkinTime, dateTo)
    ));

  // Total patients and appointments
  const totalPatients = await db.select({ count: count() }).from(clinicPatients);
  const totalAppointments = await db.select({ count: count() }).from(clinicAppointments);

  const currentPatients = currentPeriodPatients[0]?.count || 0;
  const prevPatients = previousPeriodPatients[0]?.count || 0;
  const currentAppointments = currentPeriodAppointments[0]?.count || 0;
  const prevAppointments = previousPeriodAppointments[0]?.count || 0;

  const patientGrowth = prevPatients > 0 
    ? ((currentPatients - prevPatients) / prevPatients * 100).toFixed(1)
    : currentPatients > 0 ? '100.0' : '0.0';

  const appointmentGrowth = prevAppointments > 0 
    ? ((currentAppointments - prevAppointments) / prevAppointments * 100).toFixed(1)
    : currentAppointments > 0 ? '100.0' : '0.0';

  return {
    summary: {
      totalPatientsRegistered: totalPatients[0]?.count || 0,
      newPatientsThisPeriod: currentPatients,
      totalAppointments: totalAppointments[0]?.count || 0,
      appointmentsThisPeriod: currentAppointments,
      averageDailyAppointments: Math.round(currentAppointments / periodDays) || 0,
      averageWaitTime: Math.round(avgWaitTime[0]?.avgWait || 0),
      patientGrowth: `${patientGrowth}%`,
      appointmentGrowth: `${appointmentGrowth}%`
    },
    trends: {
      patientRegistrations: {
        current: currentPatients,
        previous: prevPatients,
        growth: patientGrowth
      },
      appointments: {
        current: currentAppointments,
        previous: prevAppointments,
        growth: appointmentGrowth
      }
    },
    charts: {
      overallPerformance: {
        patients: currentPatients,
        appointments: currentAppointments,
        avgWaitTime: Math.round(avgWaitTime[0]?.avgWait || 0)
      }
    }
  };
}

function calculateAgeGroups(patients: Array<{ dateOfBirth: string; id: number }>) {
  const ageGroups = {
    '0-18': 0,
    '19-30': 0,
    '31-50': 0,
    '51-70': 0,
    '71+': 0
  };

  patients.forEach(patient => {
    const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    if (age <= 18) ageGroups['0-18']++;
    else if (age <= 30) ageGroups['19-30']++;
    else if (age <= 50) ageGroups['31-50']++;
    else if (age <= 70) ageGroups['51-70']++;
    else ageGroups['71+']++;
  });

  return Object.entries(ageGroups).map(([ageGroup, count]) => ({
    ageGroup,
    count
  }));
}

function calculateTrend(data: Array<{ date?: string; count?: number }>) {
  if (data.length < 2) return { direction: 'stable', percentage: '0.0' };
  
  const sorted = data.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const recent = sorted.slice(-7); // Last 7 data points
  const earlier = sorted.slice(0, 7); // First 7 data points
  
  const recentAvg = recent.reduce((sum, item) => sum + (item.count || 0), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, item) => sum + (item.count || 0), 0) / earlier.length;
  
  if (earlierAvg === 0) return { direction: 'stable', percentage: '0.0' };
  
  const percentageChange = ((recentAvg - earlierAvg) / earlierAvg * 100);
  const direction = percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'stable';
  
  return {
    direction,
    percentage: Math.abs(percentageChange).toFixed(1)
  };
}