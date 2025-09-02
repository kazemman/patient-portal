import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, patients } from '@/db/schema';
import { eq, like, and, or, desc, gte, lte, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      search,
      status,
      date,
      start_date,
      end_date,
      patient_id,
      limit = 50,
      offset = 0
    } = body;

    // Validate limit and offset
    const validLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const validOffset = Math.max(parseInt(offset) || 0, 0);

    if (isNaN(validLimit) || isNaN(validOffset)) {
      return NextResponse.json({
        error: "Limit and offset must be valid integers",
        code: "INVALID_PAGINATION"
      }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        error: "Invalid status. Must be one of: scheduled, completed, cancelled, no_show",
        code: "INVALID_STATUS"
      }, { status: 400 });
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (date && !dateRegex.test(date)) {
      return NextResponse.json({
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT"
      }, { status: 400 });
    }

    if (start_date && !dateRegex.test(start_date)) {
      return NextResponse.json({
        error: "Invalid start_date format. Use YYYY-MM-DD",
        code: "INVALID_START_DATE_FORMAT"
      }, { status: 400 });
    }

    if (end_date && !dateRegex.test(end_date)) {
      return NextResponse.json({
        error: "Invalid end_date format. Use YYYY-MM-DD",
        code: "INVALID_END_DATE_FORMAT"
      }, { status: 400 });
    }

    // Validate date range logic
    if (start_date && end_date && start_date > end_date) {
      return NextResponse.json({
        error: "start_date cannot be after end_date",
        code: "INVALID_DATE_RANGE"
      }, { status: 400 });
    }

    // Validate patient_id
    if (patient_id && (isNaN(parseInt(patient_id)) || parseInt(patient_id) <= 0)) {
      return NextResponse.json({
        error: "Invalid patient_id. Must be a positive integer",
        code: "INVALID_PATIENT_ID"
      }, { status: 400 });
    }

    // Build query conditions
    const conditions = [];

    // Search condition - search across patient names, appointment reason, and notes
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchCondition = or(
        like(patients.firstName, `%${searchTerm}%`),
        like(patients.lastName, `%${searchTerm}%`),
        like(appointments.reason, `%${searchTerm}%`),
        like(appointments.notes, `%${searchTerm}%`)
      );
      conditions.push(searchCondition);
    }

    // Status filter
    if (status) {
      conditions.push(eq(appointments.status, status));
    }

    // Date filters
    if (date) {
      // Filter for specific date - appointments that fall on that date
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      conditions.push(
        and(
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        )
      );
    } else {
      // Date range filters (only apply if specific date not provided)
      if (start_date) {
        const startDateTime = `${start_date}T00:00:00.000Z`;
        conditions.push(gte(appointments.appointmentDate, startDateTime));
      }
      if (end_date) {
        const endDateTime = `${end_date}T23:59:59.999Z`;
        conditions.push(lte(appointments.appointmentDate, endDateTime));
      }
    }

    // Patient ID filter
    if (patient_id) {
      conditions.push(eq(appointments.patientId, parseInt(patient_id)));
    }

    // Only include active patients
    conditions.push(eq(patients.active, true));

    // Build base query with join - select all required patient fields
    let query = db
      .select({
        // Appointment fields
        id: appointments.id,
        patientId: appointments.patientId,
        appointmentDate: appointments.appointmentDate,
        durationMinutes: appointments.durationMinutes,
        reason: appointments.reason,
        notes: appointments.notes,
        status: appointments.status,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Complete patient fields
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        patientIdType: patients.idType,
        patientSaIdNumber: patients.saIdNumber,
        patientPassportNumber: patients.passportNumber,
        patientPassportCountry: patients.passportCountry,
        patientMedicalAid: patients.medicalAid,
        patientMedicalAidNumber: patients.medicalAidNumber
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id));

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count for pagination metadata
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    // Execute both queries in parallel
    const [results, countResult] = await Promise.all([
      query
        .orderBy(desc(appointments.appointmentDate))
        .limit(validLimit)
        .offset(validOffset),
      countQuery
    ]);

    const total = countResult[0]?.count || 0;

    // Format response with nested patient object and renamed fields
    const formattedAppointments = results.map(row => ({
      id: row.id,
      patientId: row.patientId,
      patient: {
        id: row.patientId,
        firstName: row.patientFirstName,
        lastName: row.patientLastName,
        phone: row.patientPhone,
        email: row.patientEmail,
        idType: row.patientIdType,
        saIdNumber: row.patientSaIdNumber,
        passportNumber: row.patientPassportNumber,
        passportCountry: row.patientPassportCountry,
        medicalAid: row.patientMedicalAid,
        medicalAidNumber: row.patientMedicalAidNumber
      },
      appointmentDatetime: row.appointmentDate,
      durationMinutes: row.durationMinutes,
      reason: row.reason,
      notes: row.notes,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return NextResponse.json({
      appointments: formattedAppointments,
      total,
      limit: validLimit,
      offset: validOffset
    });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}