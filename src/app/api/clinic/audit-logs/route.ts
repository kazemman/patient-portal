import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auditLogs, user, staff } from '@/db/schema';
import { eq, like, and, or, desc, asc, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_ACTIONS = [
  'create', 'update', 'delete', 'view', 'login', 'logout', 
  'check-in', 'call-patient', 'complete-visit'
];

const VALID_TABLE_NAMES = [
  'patients', 'appointments', 'medicalRecords', 'prescriptions', 'bills',
  'staff', 'checkins', 'queue', 'departments', 'clinicPatients',
  'clinicAppointments', 'clinicMedicalRecords'
];

function extractIpAddress(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }
  
  return 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');
    const staffId = searchParams.get('staffId');
    const action = searchParams.get('action');
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sort = searchParams.get('sort') || 'timestamp';
    const order = searchParams.get('order') || 'desc';

    let query = db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      staffId: auditLogs.staffId,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      timestamp: auditLogs.timestamp,
      description: auditLogs.description,
      userName: user.name,
      userEmail: user.email,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffRole: staff.role
    })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.userId, user.id))
    .leftJoin(staff, eq(auditLogs.staffId, staff.id));

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(auditLogs.action, `%${search}%`),
          like(auditLogs.tableName, `%${search}%`),
          like(auditLogs.description, `%${search}%`)
        )
      );
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (staffId) {
      const staffIdInt = parseInt(staffId);
      if (!isNaN(staffIdInt)) {
        conditions.push(eq(auditLogs.staffId, staffIdInt));
      }
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (tableName) {
      conditions.push(eq(auditLogs.tableName, tableName));
    }

    if (recordId) {
      conditions.push(eq(auditLogs.recordId, recordId));
    }

    if (startDate) {
      const startDateTime = new Date(startDate).toISOString();
      conditions.push(gte(auditLogs.timestamp, startDateTime));
    }

    if (endDate) {
      const endDateTime = new Date(endDate + 'T23:59:59.999Z').toISOString();
      conditions.push(lte(auditLogs.timestamp, endDateTime));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const sortColumn = sort === 'timestamp' ? auditLogs.timestamp : auditLogs.id;
    const orderDirection = order === 'asc' ? asc(sortColumn) : desc(sortColumn);
    query = query.orderBy(orderDirection);

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET audit logs error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestBody = await request.json();
    const { 
      action, 
      tableName, 
      recordId, 
      oldValues, 
      newValues, 
      description,
      staffId
    } = requestBody;

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!action) {
      return NextResponse.json({ 
        error: "Action is required",
        code: "MISSING_ACTION" 
      }, { status: 400 });
    }

    if (!tableName) {
      return NextResponse.json({ 
        error: "Table name is required",
        code: "MISSING_TABLE_NAME" 
      }, { status: 400 });
    }

    // Validate action
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ 
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
        code: "INVALID_ACTION" 
      }, { status: 400 });
    }

    // Validate table name
    if (!VALID_TABLE_NAMES.includes(tableName)) {
      return NextResponse.json({ 
        error: `Invalid table name. Must be one of: ${VALID_TABLE_NAMES.join(', ')}`,
        code: "INVALID_TABLE_NAME" 
      }, { status: 400 });
    }

    // Validate staffId if provided
    let validatedStaffId = null;
    if (staffId) {
      const staffIdInt = parseInt(staffId);
      if (isNaN(staffIdInt)) {
        return NextResponse.json({ 
          error: "Staff ID must be a valid integer",
          code: "INVALID_STAFF_ID" 
        }, { status: 400 });
      }

      // Check if staff exists
      const existingStaff = await db.select()
        .from(staff)
        .where(eq(staff.id, staffIdInt))
        .limit(1);

      if (existingStaff.length === 0) {
        return NextResponse.json({ 
          error: "Staff member not found",
          code: "STAFF_NOT_FOUND" 
        }, { status: 400 });
      }

      validatedStaffId = staffIdInt;
    }

    // Extract IP address and user agent
    const ipAddress = extractIpAddress(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Prepare audit log data
    const auditLogData = {
      userId: currentUser.id,
      staffId: validatedStaffId,
      action,
      tableName,
      recordId: recordId || null,
      oldValues: oldValues || null,
      newValues: newValues || null,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      description: description || null
    };

    const newAuditLog = await db.insert(auditLogs)
      .values(auditLogData)
      .returning();

    return NextResponse.json(newAuditLog[0], { status: 201 });
  } catch (error) {
    console.error('POST audit log error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}