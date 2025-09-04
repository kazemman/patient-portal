import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prescriptions, patients } from '@/db/schema';
import { eq, like, and, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'startDate';
    const order = searchParams.get('order') || 'desc';

    // Build query
    let query = db.select().from(prescriptions);
    
    // Base condition: filter by patient ID
    let conditions = [eq(prescriptions.patientId, parseInt(patientId))];

    // Add status filter if provided
    if (status && ['active', 'expired', 'discontinued'].includes(status)) {
      conditions.push(eq(prescriptions.status, status));
    }

    // Add search filter if provided
    if (search) {
      conditions.push(like(prescriptions.medicationName, `%${search}%`));
    }

    // Apply all conditions
    query = query.where(and(...conditions));

    // Add sorting
    if (sort === 'startDate') {
      query = order === 'desc' 
        ? query.orderBy(desc(prescriptions.startDate))
        : query.orderBy(asc(prescriptions.startDate));
    } else if (sort === 'createdAt') {
      query = order === 'desc' 
        ? query.orderBy(desc(prescriptions.createdAt))
        : query.orderBy(asc(prescriptions.createdAt));
    } else {
      // Default to startDate desc
      query = query.orderBy(desc(prescriptions.startDate));
    }

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET prescriptions error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}