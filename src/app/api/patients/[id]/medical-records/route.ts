import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicalRecords, patients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const patientId = params.id;
    
    // Validate patient ID
    if (!patientId || isNaN(parseInt(patientId))) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Check if patient exists
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, parseInt(patientId)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found',
        code: "PATIENT_NOT_FOUND" 
      }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort') || 'recordDate';
    const order = searchParams.get('order') || 'desc';

    // Build base query
    let query = db.select().from(medicalRecords);
    
    // Always filter by patient ID
    let whereConditions = [eq(medicalRecords.patientId, parseInt(patientId))];

    // Add type filter if provided
    if (type) {
      const validTypes = ['lab_result', 'prescription', 'visit_note', 'imaging'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ 
          error: "Invalid record type. Must be one of: lab_result, prescription, visit_note, imaging",
          code: "INVALID_RECORD_TYPE" 
        }, { status: 400 });
      }
      whereConditions.push(eq(medicalRecords.recordType, type));
    }

    // Add search filter if provided
    if (search) {
      const searchCondition = or(
        like(medicalRecords.title, `%${search}%`),
        like(medicalRecords.description, `%${search}%`)
      );
      whereConditions.push(searchCondition);
    }

    // Apply all conditions
    query = query.where(and(...whereConditions));

    // Add sorting
    const validSortFields = ['recordDate', 'createdAt'];
    const sortField = validSortFields.includes(sort) ? sort : 'recordDate';
    const sortOrder = order.toLowerCase() === 'asc' ? asc : desc;
    
    if (sortField === 'recordDate') {
      query = query.orderBy(sortOrder(medicalRecords.recordDate));
    } else if (sortField === 'createdAt') {
      query = query.orderBy(sortOrder(medicalRecords.createdAt));
    }

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET medical records error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}