import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, bills } from '@/db/schema';
import { eq, like, and, desc, asc } from 'drizzle-orm';
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

    // Validate patient ID is valid integer
    if (!patientId || isNaN(parseInt(patientId))) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    const parsedPatientId = parseInt(patientId);

    // Check if patient exists
    const patient = await db.select()
      .from(patients)
      .where(eq(patients.id, parsedPatientId))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ 
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND' 
      }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Filtering and search
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    
    // Sorting
    const sort = searchParams.get('sort') || 'billDate';
    const order = searchParams.get('order') || 'desc';

    // Build query
    let query = db.select().from(bills);
    
    // Base condition: filter by patient ID
    let whereConditions = [eq(bills.patientId, parsedPatientId)];

    // Add status filter if provided
    if (status && ['pending', 'paid', 'overdue'].includes(status)) {
      whereConditions.push(eq(bills.status, status));
    }

    // Add search condition if provided
    if (search) {
      whereConditions.push(like(bills.description, `%${search}%`));
    }

    // Apply where conditions
    if (whereConditions.length > 1) {
      query = query.where(and(...whereConditions));
    } else {
      query = query.where(whereConditions[0]);
    }

    // Apply sorting
    const sortColumn = sort === 'dueDate' ? bills.dueDate : bills.billDate;
    const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);
    query = query.orderBy(sortOrder);

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}