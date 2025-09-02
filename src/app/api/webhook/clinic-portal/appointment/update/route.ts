import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
type AppointmentStatus = typeof VALID_STATUSES[number];

const INVALID_TRANSITIONS = {
  completed: ['scheduled'], // Can't go back to scheduled once completed
};

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, status, reason } = body;

    // Validate appointment_id
    if (!appointment_id || !Number.isInteger(appointment_id) || appointment_id <= 0) {
      return NextResponse.json({
        error: "Valid appointment_id is required and must be a positive integer",
        code: "INVALID_APPOINTMENT_ID"
      }, { status: 400 });
    }

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({
        error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS"
      }, { status: 400 });
    }

    // Get current appointment with patient data
    const currentAppointment = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        appointmentDate: appointments.appointmentDate,
        durationMinutes: appointments.durationMinutes,
        reason: appointments.reason,
        notes: appointments.notes,
        status: appointments.status,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        firstName: patients.firstName,
        lastName: patients.lastName,
        phone: patients.phone,
        active: patients.active
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.id, appointment_id))
      .limit(1);

    if (currentAppointment.length === 0) {
      return NextResponse.json({
        error: "Appointment not found",
        code: "APPOINTMENT_NOT_FOUND"
      }, { status: 404 });
    }

    const appointment = currentAppointment[0];

    // Check if patient is active
    if (!appointment.active) {
      return NextResponse.json({
        error: "Patient is inactive",
        code: "PATIENT_INACTIVE"
      }, { status: 404 });
    }

    // Validate status transitions
    const currentStatus = appointment.status as AppointmentStatus;
    if (INVALID_TRANSITIONS[currentStatus]?.includes(status)) {
      return NextResponse.json({
        error: `Cannot change status from ${currentStatus} to ${status}`,
        code: "INVALID_STATUS_TRANSITION"
      }, { status: 409 });
    }

    // Special case: prevent updating completed appointments unless changing to cancelled with reason
    if (currentStatus === 'completed' && status !== 'cancelled') {
      return NextResponse.json({
        error: "Completed appointments can only be changed to cancelled with a valid reason",
        code: "COMPLETED_APPOINTMENT_IMMUTABLE"
      }, { status: 409 });
    }

    if (currentStatus === 'completed' && status === 'cancelled' && !reason) {
      return NextResponse.json({
        error: "Reason is required when cancelling a completed appointment",
        code: "REASON_REQUIRED_FOR_CANCELLATION"
      }, { status: 400 });
    }

    // Business logic: If marking as completed, validate appointment date
    if (status === 'completed') {
      const appointmentDate = new Date(appointment.appointmentDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (appointmentDate > today) {
        return NextResponse.json({
          error: "Cannot mark future appointments as completed",
          code: "FUTURE_APPOINTMENT_CANNOT_BE_COMPLETED"
        }, { status: 400 });
      }
    }

    // Handle notes update with reason and timestamp
    let updatedNotes = appointment.notes || '';
    if (reason && reason.trim()) {
      const timestamp = new Date().toISOString();
      const statusChangeNote = `[${timestamp}] Status changed to ${status}: ${reason.trim()}`;
      
      if (updatedNotes) {
        updatedNotes += '\n' + statusChangeNote;
      } else {
        updatedNotes = statusChangeNote;
      }
    } else if (currentStatus !== status) {
      // Log status change even without reason
      const timestamp = new Date().toISOString();
      const statusChangeNote = `[${timestamp}] Status changed from ${currentStatus} to ${status}`;
      
      if (updatedNotes) {
        updatedNotes += '\n' + statusChangeNote;
      } else {
        updatedNotes = statusChangeNote;
      }
    }

    // Update appointment
    const updatedAppointment = await db
      .update(appointments)
      .set({
        status,
        notes: updatedNotes,
        updatedAt: new Date().toISOString()
      })
      .where(eq(appointments.id, appointment_id))
      .returning();

    if (updatedAppointment.length === 0) {
      return NextResponse.json({
        error: "Failed to update appointment",
        code: "UPDATE_FAILED"
      }, { status: 500 });
    }

    // Get updated appointment with patient data for response
    const updatedAppointmentWithPatient = await db
      .select({
        id: appointments.id,
        patient_id: appointments.patientId,
        patient_name: patients.firstName,
        patient_last_name: patients.lastName,
        patient_phone: patients.phone,
        appointment_date: appointments.appointmentDate,
        duration_minutes: appointments.durationMinutes,
        reason: appointments.reason,
        notes: appointments.notes,
        status: appointments.status,
        created_at: appointments.createdAt,
        updated_at: appointments.updatedAt
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.id, appointment_id))
      .limit(1);

    const result = updatedAppointmentWithPatient[0];
    
    // Format patient_name as firstName + lastName
    const responseData = {
      ...result,
      patient_name: `${result.patient_name} ${result.patient_last_name}`.trim()
    };

    // Remove the separate last name field
    delete (responseData as any).patient_last_name;

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('PUT appointment status error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}