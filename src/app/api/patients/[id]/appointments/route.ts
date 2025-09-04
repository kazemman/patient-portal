import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients, appointments } from '@/db/schema';
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

    const patientId = parseInt(params.id);
    if (!patientId || isNaN(patientId)) {
      return NextResponse.json({ 
        error: "Valid patient ID is required",
        code: "INVALID_PATIENT_ID" 
      }, { status: 400 });
    }

    // Validate patient exists
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'appointmentDate';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(appointments);

    // Base condition: filter by patient ID
    let whereConditions = [eq(appointments.patientId, patientId)];

    // Add status filter
    if (status && ['scheduled', 'completed', 'cancelled'].includes(status)) {
      whereConditions.push(eq(appointments.status, status));
    }

    // Add search condition
    if (search) {
      const searchCondition = or(
        like(appointments.doctorName, `%${search}%`),
        like(appointments.reason, `%${search}%`)
      );
      whereConditions.push(searchCondition);
    }

    // Apply all where conditions
    query = query.where(and(...whereConditions));

    // Add sorting
    const sortColumn = sort === 'createdAt' ? appointments.createdAt : appointments.appointmentDate;
    const orderDirection = order === 'asc' ? asc : desc;
    query = query.orderBy(orderDirection(sortColumn));

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    // Get total count for pagination metadata
    const totalCountQuery = db.select({ count: appointments.id })
      .from(appointments)
      .where(and(...whereConditions));
    
    const totalCountResult = await totalCountQuery;
    const totalCount = totalCountResult.length;

    // Prepare response with pagination metadata
    const response = {
      appointments: results,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET appointments error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}