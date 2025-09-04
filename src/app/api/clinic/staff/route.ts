import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staff, user, departments } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'manager'];
const VALID_STATUSES = ['active', 'inactive', 'terminated', 'on-leave'];

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const staffId = parseInt(id);
      if (isNaN(staffId)) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const staffRecord = await db.select({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        department: staff.department,
        hireDate: staff.hireDate,
        status: staff.status,
        isActive: staff.isActive,
        userId: staff.userId,
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt,
        departmentInfo: {
          id: departments.id,
          name: departments.name,
          description: departments.description,
          isActive: departments.isActive
        }
      })
      .from(staff)
      .leftJoin(departments, eq(staff.department, departments.name))
      .where(and(eq(staff.id, staffId), eq(staff.userId, currentUser.id)))
      .limit(1);

      if (staffRecord.length === 0) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }

      return NextResponse.json(staffRecord[0]);
    }

    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const active = searchParams.get('active');
    const sort = searchParams.get('sort') || 'firstName';
    const order = searchParams.get('order') || 'asc';

    let query = db.select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      department: staff.department,
      hireDate: staff.hireDate,
      status: staff.status,
      isActive: staff.isActive,
      userId: staff.userId,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      departmentInfo: {
        id: departments.id,
        name: departments.name,
        isActive: departments.isActive
      }
    })
    .from(staff)
    .leftJoin(departments, eq(staff.department, departments.name));

    const conditions = [eq(staff.userId, currentUser.id)];

    if (search) {
      conditions.push(
        or(
          like(staff.firstName, `%${search}%`),
          like(staff.lastName, `%${search}%`),
          like(staff.email, `%${search}%`)
        )
      );
    }

    if (role && VALID_ROLES.includes(role)) {
      conditions.push(eq(staff.role, role));
    }

    if (department) {
      conditions.push(eq(staff.department, department));
    }

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push(eq(staff.status, status));
    }

    if (active !== null) {
      const isActive = active === 'true';
      conditions.push(eq(staff.isActive, isActive));
    }

    query = query.where(and(...conditions));

    const validSortFields = ['firstName', 'lastName', 'email', 'role', 'department', 'hireDate', 'status', 'createdAt'];
    if (validSortFields.includes(sort)) {
      const sortField = staff[sort as keyof typeof staff];
      query = order === 'desc' ? query.orderBy(desc(sortField)) : query.orderBy(asc(sortField));
    }

    const results = await query.limit(limit).offset(offset);
    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
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

    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { firstName, lastName, email, phone, role, department, hireDate, status, isActive } = requestBody;

    if (!firstName || !lastName || !email || !phone || !role || !department || !hireDate) {
      return NextResponse.json({ 
        error: "Required fields are missing: firstName, lastName, email, phone, role, department, hireDate",
        code: "MISSING_REQUIRED_FIELDS" 
      }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    if (!validatePhone(phone)) {
      return NextResponse.json({ 
        error: "Invalid phone format",
        code: "INVALID_PHONE" 
      }, { status: 400 });
    }

    if (!validateDate(hireDate)) {
      return NextResponse.json({ 
        error: "Invalid hire date format. Use YYYY-MM-DD",
        code: "INVALID_DATE" 
      }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ 
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    const existingStaff = await db.select()
      .from(staff)
      .where(eq(staff.email, email.toLowerCase()))
      .limit(1);

    if (existingStaff.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_EXISTS" 
      }, { status: 409 });
    }

    const newStaff = await db.insert(staff)
      .values({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        role,
        department: department.trim(),
        hireDate,
        status: status || 'active',
        isActive: isActive !== undefined ? isActive : true,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    const staffWithDepartment = await db.select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      department: staff.department,
      hireDate: staff.hireDate,
      status: staff.status,
      isActive: staff.isActive,
      userId: staff.userId,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      departmentInfo: {
        id: departments.id,
        name: departments.name,
        description: departments.description,
        isActive: departments.isActive
      }
    })
    .from(staff)
    .leftJoin(departments, eq(staff.department, departments.name))
    .where(eq(staff.id, newStaff[0].id))
    .limit(1);

    return NextResponse.json(staffWithDepartment[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const staffId = parseInt(id);
    const requestBody = await request.json();

    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const existingStaff = await db.select()
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.userId, currentUser.id)))
      .limit(1);

    if (existingStaff.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const { firstName, lastName, email, phone, role, department, hireDate, status, isActive } = requestBody;

    if (email && !validateEmail(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL" 
      }, { status: 400 });
    }

    if (phone && !validatePhone(phone)) {
      return NextResponse.json({ 
        error: "Invalid phone format",
        code: "INVALID_PHONE" 
      }, { status: 400 });
    }

    if (hireDate && !validateDate(hireDate)) {
      return NextResponse.json({ 
        error: "Invalid hire date format. Use YYYY-MM-DD",
        code: "INVALID_DATE" 
      }, { status: 400 });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ 
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        code: "INVALID_ROLE" 
      }, { status: 400 });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    if (email && email.toLowerCase() !== existingStaff[0].email) {
      const emailExists = await db.select()
        .from(staff)
        .where(eq(staff.email, email.toLowerCase()))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json({ 
          error: "Email already exists",
          code: "EMAIL_EXISTS" 
        }, { status: 409 });
      }
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department.trim();
    if (hireDate !== undefined) updateData.hireDate = hireDate;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedStaff = await db.update(staff)
      .set(updateData)
      .where(and(eq(staff.id, staffId), eq(staff.userId, currentUser.id)))
      .returning();

    if (updatedStaff.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const staffWithDepartment = await db.select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      department: staff.department,
      hireDate: staff.hireDate,
      status: staff.status,
      isActive: staff.isActive,
      userId: staff.userId,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
      departmentInfo: {
        id: departments.id,
        name: departments.name,
        description: departments.description,
        isActive: departments.isActive
      }
    })
    .from(staff)
    .leftJoin(departments, eq(staff.department, departments.name))
    .where(eq(staff.id, staffId))
    .limit(1);

    return NextResponse.json(staffWithDepartment[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const staffId = parseInt(id);

    const existingStaff = await db.select()
      .from(staff)
      .where(and(eq(staff.id, staffId), eq(staff.userId, currentUser.id)))
      .limit(1);

    if (existingStaff.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const deletedStaff = await db.update(staff)
      .set({
        isActive: false,
        status: 'terminated',
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(staff.id, staffId), eq(staff.userId, currentUser.id)))
      .returning();

    if (deletedStaff.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Staff member successfully terminated',
      staff: deletedStaff[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}