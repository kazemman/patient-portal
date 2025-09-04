import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, appointments, medicalRecords, prescriptions, bills } from '@/db/schema';
import { eq, and, desc, asc, sum } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const patientId = parseInt(id);

    // First, validate that the patient exists
    const patient = await db.select({
      id: patients.id,
      name: patients.name,
      email: patients.email
    })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    // Get upcoming appointments (next 5 scheduled appointments)
    const upcomingAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.patientId, patientId),
        eq(appointments.status, 'scheduled')
      ))
      .orderBy(asc(appointments.appointmentDate), asc(appointments.appointmentTime))
      .limit(5);

    // Get recent medical records (last 10 records ordered by date)
    const recentMedicalRecords = await db.select()
      .from(medicalRecords)
      .where(eq(medicalRecords.patientId, patientId))
      .orderBy(desc(medicalRecords.recordDate))
      .limit(10);

    // Get active prescriptions
    const activePrescriptions = await db.select()
      .from(prescriptions)
      .where(and(
        eq(prescriptions.patientId, patientId),
        eq(prescriptions.status, 'active')
      ))
      .orderBy(desc(prescriptions.startDate));

    // Get pending bills (status 'pending' or 'overdue')
    const pendingBills = await db.select()
      .from(bills)
      .where(and(
        eq(bills.patientId, patientId),
        eq(bills.status, 'pending')
      ))
      .orderBy(desc(bills.billDate));

    const overdueBills = await db.select()
      .from(bills)
      .where(and(
        eq(bills.patientId, patientId),
        eq(bills.status, 'overdue')
      ))
      .orderBy(desc(bills.billDate));

    const allPendingBills = [...pendingBills, ...overdueBills];

    // Calculate dashboard statistics
    
    // Total appointments count
    const totalAppointmentsResult = await db.select({
      count: appointments.id
    })
    .from(appointments)
    .where(eq(appointments.patientId, patientId));

    const totalAppointments = totalAppointmentsResult.length;

    // Active prescriptions count
    const activePrescriptionsCount = activePrescriptions.length;

    // Pending bills count and total amount
    const pendingBillsCount = allPendingBills.length;
    const totalPendingAmount = allPendingBills.reduce((sum, bill) => sum + bill.amount, 0);

    // Construct dashboard response
    const dashboardData = {
      patient: {
        id: patient[0].id,
        name: patient[0].name,
        email: patient[0].email
      },
      upcomingAppointments,
      recentMedicalRecords,
      activePrescriptions,
      pendingBills: allPendingBills,
      statistics: {
        totalAppointments,
        activePrescriptionsCount,
        pendingBillsCount,
        totalPendingAmount: parseFloat(totalPendingAmount.toFixed(2))
      }
    };

    return NextResponse.json(dashboardData, { status: 200 });

  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}