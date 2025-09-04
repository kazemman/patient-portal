import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { checkins, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, payment_method, notes, amount } = body;

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

    // Validate amount field based on payment method
    let validatedAmount = null;
    if (payment_method === 'cash' || payment_method === 'both') {
      if (amount === undefined || amount === null) {
        return NextResponse.json({ 
          error: "Amount is required when payment method is 'cash' or 'both'",
          code: "MISSING_AMOUNT" 
        }, { status: 400 });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json({ 
          error: "Amount must be a valid positive number",
          code: "INVALID_AMOUNT" 
        }, { status: 400 });
      }

      if (parsedAmount > 999999.99) {
        return NextResponse.json({ 
          error: "Amount cannot exceed R999,999.99",
          code: "AMOUNT_TOO_LARGE" 
        }, { status: 400 });
      }

      // Round to 2 decimal places for currency
      validatedAmount = Math.round(parsedAmount * 100) / 100;
    } else if (payment_method === 'medical_aid' && amount !== undefined && amount !== null) {
      // Optional validation: allow amount for medical_aid but validate if provided
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json({ 
          error: "If provided, amount must be a valid positive number",
          code: "INVALID_AMOUNT" 
        }, { status: 400 });
      }
      validatedAmount = Math.round(parsedAmount * 100) / 100;
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
        amount: validatedAmount,
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