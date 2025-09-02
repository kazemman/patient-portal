import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, patientAuditLog } from '@/db/schema';
import { eq, and, or, ne } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { patientId, changes, reason } = requestBody;

    // Validate required fields
    if (!patientId || !changes || !reason) {
      return NextResponse.json({ 
        error: "Patient ID, changes, and reason are required",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    // Validate patientId is positive integer
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate changes object has at least one field
    if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
      return NextResponse.json({ 
        error: "Changes object with at least one field is required",
        code: "EMPTY_CHANGES" 
      }, { status: 400 });
    }

    // Get existing patient record
    const existingPatient = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (existingPatient.length === 0) {
      return NextResponse.json({ 
        error: "Patient not found",
        code: "PATIENT_NOT_FOUND" 
      }, { status: 404 });
    }

    const currentPatient = existingPatient[0];

    // Validate patient is active
    if (!currentPatient.active) {
      return NextResponse.json({ 
        error: "Cannot update inactive patient",
        code: "PATIENT_INACTIVE" 
      }, { status: 400 });
    }

    // Validate required fields if provided
    if (changes.firstName !== undefined && (!changes.firstName || changes.firstName.trim().length === 0)) {
      return NextResponse.json({ 
        error: "First name is required",
        code: "INVALID_FIRST_NAME" 
      }, { status: 400 });
    }

    if (changes.lastName !== undefined && (!changes.lastName || changes.lastName.trim().length === 0)) {
      return NextResponse.json({ 
        error: "Last name is required",
        code: "INVALID_LAST_NAME" 
      }, { status: 400 });
    }

    // Validate email format if provided
    if (changes.email !== undefined && changes.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(changes.email)) {
        return NextResponse.json({ 
          error: "Invalid email format",
          code: "INVALID_EMAIL_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate phone format if provided
    if (changes.phone !== undefined && changes.phone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(changes.phone)) {
        return NextResponse.json({ 
          error: "Invalid phone format",
          code: "INVALID_PHONE_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate emergency contact phone format if provided
    if (changes.emergencyContactPhone !== undefined && changes.emergencyContactPhone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(changes.emergencyContactPhone)) {
        return NextResponse.json({ 
          error: "Invalid emergency contact phone format",
          code: "INVALID_EMERGENCY_PHONE_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate ID type matches provided ID fields
    if (changes.idType !== undefined) {
      if (changes.idType === 'sa_id' && changes.saIdNumber === undefined && !currentPatient.saIdNumber) {
        return NextResponse.json({ 
          error: "SA ID number is required when ID type is 'sa_id'",
          code: "MISSING_SA_ID_NUMBER" 
        }, { status: 400 });
      }
      if (changes.idType === 'passport' && changes.passportNumber === undefined && !currentPatient.passportNumber) {
        return NextResponse.json({ 
          error: "Passport number is required when ID type is 'passport'",
          code: "MISSING_PASSPORT_NUMBER" 
        }, { status: 400 });
      }
    }

    // Check for duplicate email
    if (changes.email !== undefined && changes.email && changes.email !== currentPatient.email) {
      const duplicateEmail = await db.select()
        .from(patients)
        .where(and(
          eq(patients.email, changes.email.toLowerCase()),
          ne(patients.id, patientId),
          eq(patients.active, true)
        ))
        .limit(1);

      if (duplicateEmail.length > 0) {
        return NextResponse.json({ 
          error: "Email already exists for another patient",
          code: "DUPLICATE_EMAIL" 
        }, { status: 409 });
      }
    }

    // Check for duplicate phone
    if (changes.phone !== undefined && changes.phone && changes.phone !== currentPatient.phone) {
      const duplicatePhone = await db.select()
        .from(patients)
        .where(and(
          eq(patients.phone, changes.phone),
          ne(patients.id, patientId),
          eq(patients.active, true)
        ))
        .limit(1);

      if (duplicatePhone.length > 0) {
        return NextResponse.json({ 
          error: "Phone number already exists for another patient",
          code: "DUPLICATE_PHONE" 
        }, { status: 409 });
      }
    }

    // Check for duplicate SA ID number
    if (changes.saIdNumber !== undefined && changes.saIdNumber && changes.saIdNumber !== currentPatient.saIdNumber) {
      const duplicateIdNumber = await db.select()
        .from(patients)
        .where(and(
          eq(patients.saIdNumber, changes.saIdNumber),
          ne(patients.id, patientId),
          eq(patients.active, true)
        ))
        .limit(1);

      if (duplicateIdNumber.length > 0) {
        return NextResponse.json({ 
          error: "SA ID number already exists for another patient",
          code: "DUPLICATE_SA_ID" 
        }, { status: 409 });
      }
    }

    // Check for duplicate passport number
    if (changes.passportNumber !== undefined && changes.passportNumber && changes.passportNumber !== currentPatient.passportNumber) {
      const duplicatePassport = await db.select()
        .from(patients)
        .where(and(
          eq(patients.passportNumber, changes.passportNumber),
          ne(patients.id, patientId),
          eq(patients.active, true)
        ))
        .limit(1);

      if (duplicatePassport.length > 0) {
        return NextResponse.json({ 
          error: "Passport number already exists for another patient",
          code: "DUPLICATE_PASSPORT" 
        }, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Track changes for audit log
    const auditEntries: any[] = [];
    const timestamp = new Date().toISOString();

    // Map of fields to check for changes
    const fieldMap = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      phone: 'phone',
      idType: 'idType',
      saIdNumber: 'saIdNumber',
      passportNumber: 'passportNumber',
      passportCountry: 'passportCountry',
      medicalAid: 'medicalAid',
      medicalAidNumber: 'medicalAidNumber',
      address: 'address',
      emergencyContactName: 'emergencyContactName',
      emergencyContactPhone: 'emergencyContactPhone',
      emergencyContactRelationship: 'emergencyContactRelationship',
      active: 'active'
    };

    // Check each field for changes and prepare audit entries
    Object.entries(fieldMap).forEach(([changeKey, dbKey]) => {
      if (changes[changeKey] !== undefined) {
        let newValue = changes[changeKey];
        let oldValue = currentPatient[dbKey as keyof typeof currentPatient];

        // Normalize values for comparison
        if (changeKey === 'email' && newValue) {
          newValue = newValue.toLowerCase();
        }
        if (['firstName', 'lastName', 'address', 'emergencyContactName', 'emergencyContactRelationship'].includes(changeKey) && newValue) {
          newValue = newValue?.trim();
        }

        // Handle null/undefined values properly for comparison
        const oldValueForComparison = oldValue === null || oldValue === undefined ? null : oldValue;
        const newValueForComparison = newValue === null || newValue === undefined || newValue === '' ? null : newValue;

        // Only update and log if value actually changed
        if (oldValueForComparison !== newValueForComparison) {
          updateData[dbKey] = newValue;
          
          // Convert to strings for audit log display
          const oldValueStr = oldValueForComparison === null ? 'null' : String(oldValueForComparison);
          const newValueStr = newValueForComparison === null ? 'null' : String(newValueForComparison);
          
          auditEntries.push({
            patientId: patientId,
            fieldChanged: changeKey,
            oldValue: oldValueStr,
            newValue: newValueStr,
            changedBy: 'API Update',
            reason: reason,
            createdAt: timestamp,
            updatedAt: timestamp
          });
        }
      }
    });

    // If no actual changes detected
    if (Object.keys(updateData).length === 1) { // Only updatedAt
      return NextResponse.json({ 
        error: "No changes detected",
        code: "NO_CHANGES" 
      }, { status: 400 });
    }

    // Update patient record
    const updatedPatient = await db.update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId))
      .returning();

    if (updatedPatient.length === 0) {
      return NextResponse.json({ 
        error: "Failed to update patient",
        code: "UPDATE_FAILED" 
      }, { status: 500 });
    }

    // Insert audit log entries
    if (auditEntries.length > 0) {
      await db.insert(patientAuditLog).values(auditEntries);
    }

    // Format response to match GET endpoint structure
    const patient = updatedPatient[0];
    const response = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
      idType: patient.idType,
      saIdNumber: patient.saIdNumber,
      passportNumber: patient.passportNumber,
      passportCountry: patient.passportCountry,
      medicalAid: patient.medicalAid,
      medicalAidNumber: patient.medicalAidNumber,
      telegramUserId: patient.telegramUserId,
      idImageUrl: patient.idImageUrl,
      address: patient.address,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      emergencyContactRelationship: patient.emergencyContactRelationship,
      active: patient.active,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}