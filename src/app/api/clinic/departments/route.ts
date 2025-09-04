import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { departments, staff } from '@/db/schema';
import { eq, like, and, or, desc, asc, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const active = searchParams.get('active');
    const includeStats = searchParams.get('includeStats') === 'true';
    const sortField = searchParams.get('sort') || 'name';
    const sortOrder = searchParams.get('order') || 'asc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Single department by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const department = await db.select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        headStaffId: departments.headStaffId,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
        headStaff: {
          id: staff.id,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          role: staff.role
        }
      })
      .from(departments)
      .leftJoin(staff, eq(departments.headStaffId, staff.id))
      .where(eq(departments.id, parseInt(id)))
      .limit(1);

      if (department.length === 0) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 });
      }

      let result = department[0];

      if (includeStats) {
        // Get staff count
        const staffCount = await db.select({ count: count() })
          .from(staff)
          .where(eq(staff.department, result.name));

        result = {
          ...result,
          stats: {
            staffCount: staffCount[0]?.count || 0
          }
        };
      }

      return NextResponse.json(result);
    }

    // List departments
    let query = db.select({
      id: departments.id,
      name: departments.name,
      description: departments.description,
      headStaffId: departments.headStaffId,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      headStaff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role
      }
    })
    .from(departments)
    .leftJoin(staff, eq(departments.headStaffId, staff.id));

    // Build where conditions
    const conditions = [];

    if (active !== null) {
      const isActive = active === 'true';
      conditions.push(eq(departments.isActive, isActive));
    }

    if (search) {
      const searchCondition = or(
        like(departments.name, `%${search}%`),
        like(departments.description, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderDirection = sortOrder === 'desc' ? desc : asc;
    if (sortField === 'name') {
      query = query.orderBy(orderDirection(departments.name));
    } else if (sortField === 'createdAt') {
      query = query.orderBy(orderDirection(departments.createdAt));
    } else if (sortField === 'updatedAt') {
      query = query.orderBy(orderDirection(departments.updatedAt));
    }

    const results = await query.limit(limit).offset(offset);

    if (includeStats) {
      // Add stats to each department
      const resultsWithStats = await Promise.all(
        results.map(async (dept) => {
          const staffCount = await db.select({ count: count() })
            .from(staff)
            .where(eq(staff.department, dept.name));

          return {
            ...dept,
            stats: {
              staffCount: staffCount[0]?.count || 0
            }
          };
        })
      );

      return NextResponse.json(resultsWithStats);
    }

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
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const requestBody = await request.json();
    const { name, description, headStaffId, isActive } = requestBody;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate name length
    if (name.length > 100) {
      return NextResponse.json({ 
        error: "Name must be 100 characters or less",
        code: "NAME_TOO_LONG" 
      }, { status: 400 });
    }

    // Validate description length if provided
    if (description && description.length > 500) {
      return NextResponse.json({ 
        error: "Description must be 500 characters or less",
        code: "DESCRIPTION_TOO_LONG" 
      }, { status: 400 });
    }

    // Check name uniqueness
    const existingDept = await db.select()
      .from(departments)
      .where(eq(departments.name, name.trim()))
      .limit(1);

    if (existingDept.length > 0) {
      return NextResponse.json({ 
        error: "Department name already exists",
        code: "NAME_CONFLICT" 
      }, { status: 409 });
    }

    // Validate headStaffId if provided
    if (headStaffId) {
      const headStaff = await db.select()
        .from(staff)
        .where(eq(staff.id, headStaffId))
        .limit(1);

      if (headStaff.length === 0) {
        return NextResponse.json({ 
          error: "Head staff member not found",
          code: "INVALID_HEAD_STAFF" 
        }, { status: 400 });
      }
    }

    const newDepartment = await db.insert(departments)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        headStaffId: headStaffId || null,
        isActive: isActive !== undefined ? isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    // Get the created department with head staff info
    const departmentWithHead = await db.select({
      id: departments.id,
      name: departments.name,
      description: departments.description,
      headStaffId: departments.headStaffId,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      headStaff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role
      }
    })
    .from(departments)
    .leftJoin(staff, eq(departments.headStaffId, staff.id))
    .where(eq(departments.id, newDepartment[0].id))
    .limit(1);

    return NextResponse.json(departmentWithHead[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { name, description, headStaffId, isActive } = requestBody;

    // Check if department exists
    const existingDept = await db.select()
      .from(departments)
      .where(eq(departments.id, parseInt(id)))
      .limit(1);

    if (existingDept.length === 0) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Validate name length if provided
    if (name && name.length > 100) {
      return NextResponse.json({ 
        error: "Name must be 100 characters or less",
        code: "NAME_TOO_LONG" 
      }, { status: 400 });
    }

    // Validate description length if provided
    if (description && description.length > 500) {
      return NextResponse.json({ 
        error: "Description must be 500 characters or less",
        code: "DESCRIPTION_TOO_LONG" 
      }, { status: 400 });
    }

    // Check name uniqueness if name is being updated
    if (name && name.trim() !== existingDept[0].name) {
      const nameConflict = await db.select()
        .from(departments)
        .where(and(
          eq(departments.name, name.trim()),
          eq(departments.id, parseInt(id))
        ))
        .limit(1);

      if (nameConflict.length === 0) {
        const otherDept = await db.select()
          .from(departments)
          .where(eq(departments.name, name.trim()))
          .limit(1);

        if (otherDept.length > 0) {
          return NextResponse.json({ 
            error: "Department name already exists",
            code: "NAME_CONFLICT" 
          }, { status: 409 });
        }
      }
    }

    // Validate headStaffId if provided
    if (headStaffId) {
      const headStaff = await db.select()
        .from(staff)
        .where(eq(staff.id, headStaffId))
        .limit(1);

      if (headStaff.length === 0) {
        return NextResponse.json({ 
          error: "Head staff member not found",
          code: "INVALID_HEAD_STAFF" 
        }, { status: 400 });
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (headStaffId !== undefined) updates.headStaffId = headStaffId;
    if (isActive !== undefined) updates.isActive = isActive;

    const updated = await db.update(departments)
      .set(updates)
      .where(eq(departments.id, parseInt(id)))
      .returning();

    // Get the updated department with head staff info
    const departmentWithHead = await db.select({
      id: departments.id,
      name: departments.name,
      description: departments.description,
      headStaffId: departments.headStaffId,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      headStaff: {
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        role: staff.role
      }
    })
    .from(departments)
    .leftJoin(staff, eq(departments.headStaffId, staff.id))
    .where(eq(departments.id, parseInt(id)))
    .limit(1);

    return NextResponse.json(departmentWithHead[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if department exists
    const existingDept = await db.select()
      .from(departments)
      .where(eq(departments.id, parseInt(id)))
      .limit(1);

    if (existingDept.length === 0) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Soft delete: set isActive = false
    const deleted = await db.update(departments)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(departments.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Department deleted successfully',
      department: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}