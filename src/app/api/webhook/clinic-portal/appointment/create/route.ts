import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, patients } from '@/db/schema';
import { eq, and, or, lt, gt } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, appointment_datetime, duration_minutes, reason, notes } = body;

    // Validate required fields
    if (!patient_id) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_PATIENT_ID" 
      }, { status: 400 });
    }

    if (!appointment_datetime) {
      return NextResponse.json({ 
        error: "Appointment datetime is required",
        code: "MISSING_APPOINTMENT_DATETIME" 
      }, { status: 400 });
    }

    // Validate patient_id is positive integer
    if (!Number.isInteger(patient_id) || patient_id <= 0) {
      return NextResponse.json({ 
        error: "Patient ID must be a positive integer",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate appointment_datetime is valid ISO datetime
    const appointmentDate = new Date(appointment_datetime);
    if (isNaN(appointmentDate.getTime())) {
      return NextResponse.json({ 
        error: "Invalid appointment datetime format. Use ISO datetime string",
        code: "INVALID_DATETIME_FORMAT" 
      }, { status: 400 });
    }

    // Validate appointment is in the future
    const now = new Date();
    if (appointmentDate <= now) {
      return NextResponse.json({ 
        error: "Appointment datetime must be in the future",
        code: "APPOINTMENT_IN_PAST" 
      }, { status: 400 });
    }

    // Validate business hours (8 AM - 8 PM, Monday-Friday)
    const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hour = appointmentDate.getHours();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ 
        error: "Appointments can only be scheduled Monday through Friday",
        code: "INVALID_BUSINESS_DAY" 
      }, { status: 400 });
    }

    if (hour < 8 || hour >= 20) {
      return NextResponse.json({ 
        error: "Appointments can only be scheduled between 8 AM and 8 PM",
        code: "INVALID_BUSINESS_HOURS" 
      }, { status: 400 });
    }

    // Set default duration_minutes and validate range
    let appointmentDuration = duration_minutes || 30;
    if (duration_minutes !== undefined) {
      if (!Number.isInteger(duration_minutes) || duration_minutes < 15 || duration_minutes > 240) {
        return NextResponse.json({ 
          error: "Duration must be between 15 and 240 minutes",
          code: "INVALID_DURATION" 
        }, { status: 400 });
      }
    }

    // Check if patient exists and is active
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, patient_id))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 404 });
    }

    if (!patient[0].active) {
      return NextResponse.json({ 
        error: "Patient is not active",
        code: "PATIENT_INACTIVE" 
      }, { status: 400 });
    }

    // Check for appointment conflicts
    const appointmentStart = appointmentDate;
    const appointmentEnd = new Date(appointmentStart.getTime() + (appointmentDuration * 60 * 1000));

    const conflictingAppointments = await db.select()
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patient_id),
          or(
            // New appointment starts during existing appointment
            and(
              lt(appointments.appointmentDate, appointmentEnd.toISOString()),
              gt(appointments.appointmentDate, appointmentStart.toISOString())
            ),
            // New appointment ends during existing appointment
            and(
              lt(appointments.appointmentDate, appointmentStart.toISOString()),
              // Calculate end time of existing appointment
              gt(appointments.appointmentDate, new Date(appointmentStart.getTime() - 240 * 60 * 1000).toISOString())
            ),
            // New appointment completely overlaps existing appointment
            eq(appointments.appointmentDate, appointmentStart.toISOString())
          )
        )
      );

    // More precise conflict check - check if any existing appointment overlaps
    for (const existing of conflictingAppointments) {
      const existingStart = new Date(existing.appointmentDate);
      const existingEnd = new Date(existingStart.getTime() + ((existing.durationMinutes || 30) * 60 * 1000));
      
      // Check if there's any overlap
      if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
        return NextResponse.json({ 
          error: "Appointment conflicts with existing appointment",
          code: "APPOINTMENT_CONFLICT",
          conflictingAppointment: {
            id: existing.id,
            datetime: existing.appointmentDate,
            duration: existing.durationMinutes
          }
        }, { status: 409 });
      }
    }

    // Prepare data for insertion
    const now_iso = new Date().toISOString();
    const insertData = {
      patientId: patient_id,
      appointmentDate: appointment_datetime,
      durationMinutes: appointmentDuration,
      reason: reason ? reason.trim() : null,
      notes: notes ? notes.trim() : null,
      status: 'scheduled',
      createdAt: now_iso,
      updatedAt: now_iso
    };

    // Create the appointment
    const newAppointment = await db.insert(appointments)
      .values(insertData)
      .returning();

    if (newAppointment.length === 0) {
      return NextResponse.json({ 
        error: "Failed to create appointment",
        code: "CREATION_FAILED" 
      }, { status: 500 });
    }

    // Fetch the created appointment with patient data
    const appointmentWithPatient = await db.select({
      id: appointments.id,
      patientId: appointments.patientId,
      appointmentDate: appointments.appointmentDate,
      durationMinutes: appointments.durationMinutes,
      reason: appointments.reason,
      notes: appointments.notes,
      status: appointments.status,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      patient_name: patients.firstName,
      patient_lastName: patients.lastName,
      patient_phone: patients.phone
    })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.id, newAppointment[0].id))
      .limit(1);

    if (appointmentWithPatient.length === 0) {
      return NextResponse.json({ 
        error: "Failed to retrieve created appointment",
        code: "RETRIEVAL_FAILED" 
      }, { status: 500 });
    }

    // Format response with patient_name as full name
    const response = {
      ...appointmentWithPatient[0],
      patient_name: `${appointmentWithPatient[0].patient_name} ${appointmentWithPatient[0].patient_lastName}`.trim()
    };
    
    // Remove the separate lastName field from response
    delete response.patient_lastName;

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('POST appointments error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}