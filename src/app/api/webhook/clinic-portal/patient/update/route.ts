import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, patientAuditLog } from '@/db/schema';
import { eq, and, or, ne } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { 
      patientId, 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth,
      gender,
      address, 
      city,
      province,
      postalCode,
      idType,
      saIdNumber,
      passportNumber,
      passportCountry,
      medicalAid,
      medicalAidNumber,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      changes, 
      reason 
    } = requestBody;

    // Validate required fields
    if (!patientId || !reason) {
      return NextResponse.json({ 
        error: "Patient ID and reason are required",
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
    if (firstName !== undefined && (!firstName || firstName.trim().length === 0)) {
      return NextResponse.json({ 
        error: "First name is required",
        code: "INVALID_FIRST_NAME" 
      }, { status: 400 });
    }

    if (lastName !== undefined && (!lastName || lastName.trim().length === 0)) {
      return NextResponse.json({ 
        error: "Last name is required",
        code: "INVALID_LAST_NAME" 
      }, { status: 400 });
    }

    // Validate email format if provided
    if (email !== undefined && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ 
          error: "Invalid email format",
          code: "INVALID_EMAIL_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate phone format if provided
    if (phone !== undefined && phone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(phone)) {
        return NextResponse.json({ 
          error: "Invalid phone format",
          code: "INVALID_PHONE_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate emergency contact phone format if provided
    if (emergencyContactPhone !== undefined && emergencyContactPhone) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,15}$/;
      if (!phoneRegex.test(emergencyContactPhone)) {
        return NextResponse.json({ 
          error: "Invalid emergency contact phone format",
          code: "INVALID_EMERGENCY_PHONE_FORMAT" 
        }, { status: 400 });
      }
    }

    // Validate ID type matches provided ID fields
    if (idType !== undefined) {
      if (idType === 'sa_id' && saIdNumber === undefined && !currentPatient.saIdNumber) {
        return NextResponse.json({ 
          error: "SA ID number is required when ID type is 'sa_id'",
          code: "MISSING_SA_ID_NUMBER" 
        }, { status: 400 });
      }
      if (idType === 'passport' && passportNumber === undefined && !currentPatient.passportNumber) {
        return NextResponse.json({ 
          error: "Passport number is required when ID type is 'passport'",
          code: "MISSING_PASSPORT_NUMBER" 
        }, { status: 400 });
      }
    }

    // Check for duplicate email
    if (email !== undefined && email && email !== currentPatient.email) {
      const duplicateEmail = await db.select()
        .from(patients)
        .where(and(
          eq(patients.email, email.toLowerCase()),
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
    if (phone !== undefined && phone && phone !== currentPatient.phone) {
      const duplicatePhone = await db.select()
        .from(patients)
        .where(and(
          eq(patients.phone, phone),
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
    if (saIdNumber !== undefined && saIdNumber && saIdNumber !== currentPatient.saIdNumber) {
      const duplicateIdNumber = await db.select()
        .from(patients)
        .where(and(
          eq(patients.saIdNumber, saIdNumber),
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
    if (passportNumber !== undefined && passportNumber && passportNumber !== currentPatient.passportNumber) {
      const duplicatePassport = await db.select()
        .from(patients)
        .where(and(
          eq(patients.passportNumber, passportNumber),
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

    // Prepare update data - only update provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Track changes for audit log
    const auditEntries: any[] = [];
    const timestamp = new Date().toISOString();

    // Helper function to add field to update if changed
    const addFieldUpdate = (fieldName: string, newValue: any, dbFieldName?: string) => {
      if (newValue !== undefined) {
        const dbField = dbFieldName || fieldName;
        const currentValue = currentPatient[dbField as keyof typeof currentPatient];
        
        // Normalize values for comparison
        let normalizedNewValue = newValue;
        let normalizedCurrentValue = currentValue;
        
        if (typeof newValue === 'string') {
          normalizedNewValue = newValue.trim();
        }
        if (typeof currentValue === 'string') {
          normalizedCurrentValue = currentValue.trim();
        }
        if (fieldName === 'email' && normalizedNewValue) {
          normalizedNewValue = normalizedNewValue.toLowerCase();
        }
        
        // Handle null/undefined values
        const currentForComparison = normalizedCurrentValue === null || normalizedCurrentValue === undefined ? null : normalizedCurrentValue;
        const newForComparison = normalizedNewValue === null || normalizedNewValue === undefined || normalizedNewValue === '' ? null : normalizedNewValue;
        
        // Only update if value actually changed
        if (currentForComparison !== newForComparison) {
          updateData[dbField] = normalizedNewValue === '' ? null : normalizedNewValue;
          
          // Create audit entry
          const oldValueStr = currentForComparison === null ? 'null' : String(currentForComparison);
          const newValueStr = newForComparison === null ? 'null' : String(newForComparison);
          
          auditEntries.push({
            patientId: patientId,
            fieldChanged: fieldName,
            oldValue: oldValueStr,
            newValue: newValueStr,
            changedBy: 'API Update',
            reason: reason,
            createdAt: timestamp,
            updatedAt: timestamp
          });
        }
      }
    };

    // Update all possible fields
    addFieldUpdate('firstName', firstName);
    addFieldUpdate('lastName', lastName);
    addFieldUpdate('email', email);
    addFieldUpdate('phone', phone);
    addFieldUpdate('dateOfBirth', dateOfBirth);
    addFieldUpdate('gender', gender);
    addFieldUpdate('address', address);
    addFieldUpdate('city', city);
    addFieldUpdate('province', province);
    addFieldUpdate('postalCode', postalCode);
    addFieldUpdate('idType', idType);
    addFieldUpdate('saIdNumber', saIdNumber);
    addFieldUpdate('passportNumber', passportNumber);
    addFieldUpdate('passportCountry', passportCountry);
    addFieldUpdate('medicalAid', medicalAid);
    addFieldUpdate('medicalAidNumber', medicalAidNumber);
    addFieldUpdate('emergencyContactName', emergencyContactName);
    addFieldUpdate('emergencyContactPhone', emergencyContactPhone);
    addFieldUpdate('emergencyContactRelationship', emergencyContactRelationship);

    // Handle changes object if provided (for tracking changes from frontend)
    if (changes && typeof changes === 'object') {
      Object.entries(changes).forEach(([fieldName, changeObj]) => {
        if (changeObj && typeof changeObj === 'object' && 'from' in changeObj && 'to' in changeObj) {
          const { from, to } = changeObj as { from: any; to: any };
          
          // Only add to audit if not already tracked above
          const alreadyTracked = auditEntries.some(entry => entry.fieldChanged === fieldName);
          if (!alreadyTracked) {
            const fromStr = from === null || from === undefined ? 'null' : String(from);
            const toStr = to === null || to === undefined ? 'null' : String(to);
            
            auditEntries.push({
              patientId: patientId,
              fieldChanged: fieldName,
              oldValue: fromStr,
              newValue: toStr,
              changedBy: 'API Update',
              reason: reason,
              createdAt: timestamp,
              updatedAt: timestamp
            });
          }
        }
      });
    }

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

    // Format response to match expected structure with ALL fields
    const patient = updatedPatient[0];
    const response = {
      id: patient.id.toString(),
      firstName: patient.firstName,
      lastName: patient.lastName,
      patientId: patient.id.toString(), // Add missing patientId field
      phone: patient.phone,
      email: patient.email,
      dateOfBirth: patient.dateOfBirth, // Add missing dateOfBirth field
      gender: patient.gender, // Add missing gender field
      address: patient.address,
      city: patient.city, // Add missing city field
      province: patient.province, // Add missing province field
      postalCode: patient.postalCode, // Add missing postalCode field
      idType: patient.idType,
      saIdNumber: patient.saIdNumber,
      passportNumber: patient.passportNumber,
      passportCountry: patient.passportCountry,
      medicalAid: patient.medicalAid,
      medicalAidNumber: patient.medicalAidNumber,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      emergencyContactRelationship: patient.emergencyContactRelationship,
      idImageUrl: patient.idImageUrl,
      avatarUrl: patient.avatarUrl, // Add missing avatarUrl field
      telegramUserId: patient.telegramUserId,
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