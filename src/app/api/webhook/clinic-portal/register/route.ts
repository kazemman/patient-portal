import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// JWT verification helper
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'clinic-portal-secret-key';
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Phone number validation and normalization
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('27')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+27${cleaned.substring(1)}`;
  }
  
  return `+27${cleaned}`;
}

function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  const phoneRegex = /^\+27[0-9]{9}$/;
  return phoneRegex.test(normalized);
}

// SA ID validation
function validateSaId(idNumber: string): boolean {
  if (!/^\d{13}$/.test(idNumber)) {
    return false;
  }
  
  // Basic SA ID validation algorithm
  const digits = idNumber.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      sum += digits[i];
    } else {
      const doubled = digits[i] * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Duplicate checking helper
async function findDuplicates(data: any) {
  const conditions = [];
  
  if (data.phone) {
    conditions.push(eq(patients.phone, normalizePhone(data.phone)));
  }
  
  if (data.email) {
    conditions.push(eq(patients.email, data.email.toLowerCase()));
  }
  
  if (data.id_type === 'sa_id' && data.sa_id_number) {
    conditions.push(eq(patients.saIdNumber, data.sa_id_number));
  }
  
  if (data.id_type === 'passport' && data.passport_number) {
    conditions.push(eq(patients.passportNumber, data.passport_number));
  }
  
  if (conditions.length === 0) {
    return [];
  }
  
  const duplicates = await db.select()
    .from(patients)
    .where(or(...conditions));
  
  return duplicates;
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const tokenPayload = await verifyToken(request);
    if (!tokenPayload) {
      return NextResponse.json({
        error: 'Authentication required. Invalid or missing Bearer token.',
        code: 'INVALID_TOKEN'
      }, { status: 401 });
    }

    const requestBody = await request.json();
    
    // Extract and validate required fields
    const {
      first_name,
      last_name,
      phone,
      email,
      id_type,
      sa_id_number,
      passport_number,
      passport_country,
      medical_aid,
      medical_aid_number,
      telegram_user_id,
      id_image_url,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      checkOnly = false,
      forceDuplicate = false
    } = requestBody;

    // Validation
    const errors: any = {};

    // Required field validations
    if (!first_name || typeof first_name !== 'string' || first_name.trim().length < 2 || first_name.trim().length > 100) {
      errors.first_name = 'First name is required and must be 2-100 characters';
    }

    if (!last_name || typeof last_name !== 'string' || last_name.trim().length < 2 || last_name.trim().length > 100) {
      errors.last_name = 'Last name is required and must be 2-100 characters';
    }

    if (!phone || typeof phone !== 'string' || !validatePhone(phone)) {
      errors.phone = 'Valid South African phone number is required';
    }

    if (email && (typeof email !== 'string' || !validateEmail(email))) {
      errors.email = 'Valid email address is required if provided';
    }

    if (!id_type || (id_type !== 'sa_id' && id_type !== 'passport')) {
      errors.id_type = 'ID type must be either "sa_id" or "passport"';
    }

    // ID type specific validations
    if (id_type === 'sa_id') {
      if (!sa_id_number || typeof sa_id_number !== 'string' || !validateSaId(sa_id_number)) {
        errors.sa_id_number = 'Valid 13-digit South African ID number is required';
      }
    }

    if (id_type === 'passport') {
      if (!passport_number || typeof passport_number !== 'string' || !/^[A-Za-z0-9]{6,20}$/.test(passport_number)) {
        errors.passport_number = 'Passport number must be 6-20 alphanumeric characters';
      }

      if (!passport_country || typeof passport_country !== 'string' || passport_country.trim().length < 2 || passport_country.trim().length > 50) {
        errors.passport_country = 'Passport country is required and must be 2-50 characters';
      }
    }

    // Optional field validations
    if (medical_aid && (typeof medical_aid !== 'string' || medical_aid.trim().length < 2 || medical_aid.trim().length > 100)) {
      errors.medical_aid = 'Medical aid must be 2-100 characters if provided';
    }

    if (medical_aid_number && (typeof medical_aid_number !== 'string' || medical_aid_number.trim().length < 5 || medical_aid_number.trim().length > 50)) {
      errors.medical_aid_number = 'Medical aid number must be 5-50 characters if provided';
    }

    if (telegram_user_id && (typeof telegram_user_id !== 'string' || !/^\d+$/.test(telegram_user_id))) {
      errors.telegram_user_id = 'Telegram user ID must be a numeric string if provided';
    }

    // Optional field validations for new fields
    if (address && (typeof address !== 'string' || address.trim().length > 500)) {
      errors.address = 'Address must be a string with maximum 500 characters if provided';
    }

    if (emergency_contact_name && (typeof emergency_contact_name !== 'string' || emergency_contact_name.trim().length < 2 || emergency_contact_name.trim().length > 100)) {
      errors.emergency_contact_name = 'Emergency contact name must be 2-100 characters if provided';
    }

    if (emergency_contact_phone && (typeof emergency_contact_phone !== 'string' || !validatePhone(emergency_contact_phone))) {
      errors.emergency_contact_phone = 'Valid phone number is required if emergency contact phone is provided';
    }

    if (emergency_contact_relationship && (typeof emergency_contact_relationship !== 'string' || emergency_contact_relationship.trim().length < 2 || emergency_contact_relationship.trim().length > 50)) {
      errors.emergency_contact_relationship = 'Emergency contact relationship must be 2-50 characters if provided';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
      }, { status: 400 });
    }

    // Normalize data
    const normalizedData = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: normalizePhone(phone),
      email: email ? email.toLowerCase().trim() : null,
      id_type,
      sa_id_number: id_type === 'sa_id' ? sa_id_number : null,
      passport_number: id_type === 'passport' ? passport_number : null,
      passport_country: id_type === 'passport' ? passport_country.trim() : null,
      medical_aid: medical_aid ? medical_aid.trim() : null,
      medical_aid_number: medical_aid_number ? medical_aid_number.trim() : null,
      telegram_user_id: telegram_user_id || null,
      id_image_url: id_image_url || null,
      address: address ? address.trim() : null,
      emergency_contact_name: emergency_contact_name ? emergency_contact_name.trim() : null,
      emergency_contact_phone: emergency_contact_phone ? normalizePhone(emergency_contact_phone) : null,
      emergency_contact_relationship: emergency_contact_relationship ? emergency_contact_relationship.trim() : null
    };

    // Check for duplicates
    const duplicates = await findDuplicates(normalizedData);

    // If checkOnly is true, return duplicates without creating patient
    if (checkOnly) {
      return NextResponse.json({
        success: true,
        duplicates,
        count: duplicates.length
      }, { status: 200 });
    }

    // If duplicates found and not forcing duplicate creation
    if (duplicates.length > 0 && !forceDuplicate) {
      return NextResponse.json({
        error: 'Potential duplicate patient found',
        code: 'DUPLICATE_PATIENT',
        duplicates,
        count: duplicates.length
      }, { status: 409 });
    }

    // Create new patient
    const now = new Date().toISOString();
    const patientData = {
      firstName: normalizedData.first_name,
      lastName: normalizedData.last_name,
      phone: normalizedData.phone,
      email: normalizedData.email,
      idType: normalizedData.id_type,
      saIdNumber: normalizedData.sa_id_number,
      passportNumber: normalizedData.passport_number,
      passportCountry: normalizedData.passport_country,
      medicalAid: normalizedData.medical_aid,
      medicalAidNumber: normalizedData.medical_aid_number,
      telegramUserId: normalizedData.telegram_user_id,
      idImageUrl: normalizedData.id_image_url,
      address: normalizedData.address,
      emergencyContactName: normalizedData.emergency_contact_name,
      emergencyContactPhone: normalizedData.emergency_contact_phone,
      emergencyContactRelationship: normalizedData.emergency_contact_relationship,
      active: true,
      createdAt: now,
      updatedAt: now
    };

    const newPatient = await db.insert(patients)
      .values(patientData)
      .returning();

    if (newPatient.length === 0) {
      return NextResponse.json({
        error: 'Failed to create patient record',
        code: 'CREATE_FAILED'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      patient: newPatient[0],
      message: 'Patient registered successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Patient registration error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}