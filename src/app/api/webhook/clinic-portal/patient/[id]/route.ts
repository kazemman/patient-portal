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
    
    // Map database fields to component-expected fields
    const response = {
      id: patientData.id,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      patientId: patientData.id, // Same as id
      email: patientData.email,
      phone: patientData.phone,
      dateOfBirth: null, // Missing schema field
      gender: null, // Missing schema field
      address: null, // Missing schema field
      city: null, // Missing schema field
      province: null, // Missing schema field
      postalCode: null, // Missing schema field
      idType: patientData.idType,
      idNumber: patientData.idType === 'sa_id' ? patientData.saIdNumber : patientData.passportNumber,
      medicalAidScheme: patientData.medicalAid, // Mapped from medicalAid
      medicalAidNumber: patientData.medicalAidNumber,
      emergencyContactName: null, // Missing schema field
      emergencyContactPhone: null, // Missing schema field
      idImageUrl: patientData.idImageUrl,
      avatarUrl: null, // Missing schema field
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