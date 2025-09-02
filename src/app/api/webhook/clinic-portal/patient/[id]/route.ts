import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Validate ID parameter
    if (!id) {
      return NextResponse.json({ 
        error: "Patient ID is required",
        code: "MISSING_ID" 
      }, { status: 400 });
    }
    
    const patientId = parseInt(id);
    if (isNaN(patientId) || patientId <= 0) {
      return NextResponse.json({ 
        error: "Valid positive integer ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }
    
    // Query patient by ID
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    
    if (patient.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND' 
      }, { status: 404 });
    }
    
    const patientData = patient[0];
    
    // Return consistent field names that match PUT API and component expectations
    const response = {
      id: patientData.id.toString(),
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      patientId: patientData.id.toString(),
      email: patientData.email,
      phone: patientData.phone,
      dateOfBirth: patientData.dateOfBirth,
      gender: patientData.gender,
      address: patientData.address,
      city: patientData.city,
      province: patientData.province,
      postalCode: patientData.postalCode,
      idType: patientData.idType,
      saIdNumber: patientData.saIdNumber, // Use correct field name
      passportNumber: patientData.passportNumber,
      passportCountry: patientData.passportCountry,
      medicalAid: patientData.medicalAid, // Use correct field name (not medicalAidScheme)
      medicalAidNumber: patientData.medicalAidNumber,
      emergencyContactName: patientData.emergencyContactName,
      emergencyContactPhone: patientData.emergencyContactPhone,
      emergencyContactRelationship: patientData.emergencyContactRelationship,
      idImageUrl: patientData.idImageUrl,
      avatarUrl: patientData.avatarUrl,
      createdAt: patientData.createdAt,
      updatedAt: patientData.updatedAt,
      active: patientData.active
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('GET patient error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}