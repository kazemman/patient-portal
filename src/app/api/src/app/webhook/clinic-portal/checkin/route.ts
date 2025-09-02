import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, payment_method, notes } = body;

    // Validate required fields
    if (!patient_id) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!payment_method) {
      return NextResponse.json({ 
        error: "Payment method is required",
        code: "MISSING_PAYMENT_METHOD" 
      }, { status: 400 });
    }

    // Validate patient_id is positive integer
    const patientId = parseInt(patient_id);
    if (isNaN(patientId) || patientId <= 0) {
      return NextResponse.json({ 
        error: "Patient ID must be a positive integer",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate payment_method
    const validPaymentMethods = ['medical_aid', 'cash', 'both'];
    if (!validPaymentMethods.includes(payment_method)) {
      return NextResponse.json({ 
        error: "Payment method must be one of: medical_aid, cash, both",
        code: "INVALID_PAYMENT_METHOD" 
      }, { status: 400 });
    }

    // Check if patient exists and is active
    const patient = await db.select()
      .from(patients)
      .where(and(eq(patients.id, patientId), eq(patients.active, true)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found or inactive",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 404 });
    }

    const patientRecord = patient[0];

    // Validate medical aid requirements
    if (payment_method === 'medical_aid' || payment_method === 'both') {
      if (!patientRecord.medicalAid || !patientRecord.medicalAidNumber) {
        return NextResponse.json({ 
          error: "Patient must have medical aid and medical aid number for this payment method",
          code: "MISSING_MEDICAL_AID_INFO" 
        }, { status: 400 });
      }
    }

    // Check for duplicate check-ins (patient already waiting)
    const existingCheckin = await db.select()
      .from(checkins)
      .where(and(eq(checkins.patientId, patientId), eq(checkins.status, 'waiting')))
      .limit(1);

    if (existingCheckin.length > 0) {
      return NextResponse.json({ 
        error: "Patient already has an active check-in",
        code: "DUPLICATE_CHECKIN" 
      }, { status: 409 });
    }

    // Create the check-in record
    const currentTime = new Date().toISOString();
    const newCheckin = await db.insert(checkins)
      .values({
        patientId: patientId,
        checkinTime: currentTime,
        paymentMethod: payment_method,
        status: 'waiting',
        notes: notes || null,
        createdAt: currentTime,
        updatedAt: currentTime,
      })
      .returning();

    // Return the created check-in with patient details
    const checkinWithPatient = {
      ...newCheckin[0],
      patient: {
        firstName: patientRecord.firstName,
        lastName: patientRecord.lastName,
        phone: patientRecord.phone,
        email: patientRecord.email,
        medicalAid: patientRecord.medicalAid,
        medicalAidNumber: patientRecord.medicalAidNumber,
      }
    };

    return NextResponse.json(checkinWithPatient, { status: 201 });

  } catch (error) {
    console.error('POST checkins error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}