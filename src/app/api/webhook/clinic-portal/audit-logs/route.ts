import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { eq, like, and, or, desc, gte, lte, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  fullName: string;
}

function verifyJWT(token: string): JwtPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'clinic-portal-secret-key';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header with Bearer token is required',
        code: 'MISSING_AUTH_HEADER' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyJWT(token);

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin role required to access audit logs',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 401 });
    }

    // Extract search parameters from URL
    const { searchParams } = new URL(request.url);

    // Pagination parameters - fix limit parameter reading
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = (page - 1) * limit;

    // Filter parameters
    const patientId = searchParams.get('patient_id');
    const changedBy = searchParams.get('changed_by');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const fieldChanged = searchParams.get('field_changed');
    const search = searchParams.get('search');

    // Validate date parameters
    if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      return NextResponse.json({ 
        error: 'Invalid date_from format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT' 
      }, { status: 400 });
    }

    if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return NextResponse.json({ 
        error: 'Invalid date_to format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT' 
      }, { status: 400 });
    }

    // Validate patient_id is a number if provided
    if (patientId && isNaN(parseInt(patientId))) {
      return NextResponse.json({ 
        error: 'Invalid patient_id. Must be a number',
        code: 'INVALID_PATIENT_ID' 
      }, { status: 400 });
    }

    // Build where conditions
    const whereConditions = [];

    if (patientId) {
      whereConditions.push(eq(auditLogs.patientId, parseInt(patientId)));
    }

    if (changedBy) {
      whereConditions.push(eq(auditLogs.changedBy, changedBy));
    }

    if (dateFrom) {
      whereConditions.push(gte(auditLogs.timestamp, `${dateFrom}T00:00:00.000Z`));
    }

    if (dateTo) {
      whereConditions.push(lte(auditLogs.timestamp, `${dateTo}T23:59:59.999Z`));
    }

    if (fieldChanged) {
      // Search in fieldsChanged JSON array - use proper parameter binding
      whereConditions.push(sql`json_extract(${auditLogs.fieldsChanged}, '$') LIKE ${`%"${fieldChanged}"%`}`);
    }

    if (search) {
      const searchCondition = or(
        like(auditLogs.patientName, `%${search}%`),
        like(auditLogs.changedBy, `%${search}%`),
        like(auditLogs.reason, `%${search}%`)
      );
      whereConditions.push(searchCondition);
    }

    // Build final where clause
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(auditLogs);
    
    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const totalRecords = countResult.count;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get paginated results
    let query = db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      query = query.where(whereClause);
    }

    const logs = await query;

    return NextResponse.json({
      logs,
      currentPage: page,
      totalPages,
      totalRecords,
      pageSize: limit
    });

  } catch (error) {
    console.error('GET audit logs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}