import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq, like, and, or, desc, count } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // JWT token verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization token required',
        code: 'MISSING_TOKEN' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedToken: any;

    try {
      const jwtSecret = process.env.JWT_SECRET || 'clinic-portal-secret-key';
      decodedToken = jwt.verify(token, jwtSecret);
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      }, { status: 401 });
    }

    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin role required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse and validate pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = (page - 1) * limit;

    if (page < 1) {
      return NextResponse.json({ 
        error: 'Page must be a positive integer',
        code: 'INVALID_PAGE' 
      }, { status: 400 });
    }

    if (limit < 1) {
      return NextResponse.json({ 
        error: 'Limit must be a positive integer',
        code: 'INVALID_LIMIT' 
      }, { status: 400 });
    }

    // Parse optional filters
    const roleFilter = searchParams.get('role');
    const isActiveFilter = searchParams.get('isActive');
    const search = searchParams.get('search');

    // Validate role filter
    if (roleFilter && !['admin', 'staff'].includes(roleFilter)) {
      return NextResponse.json({ 
        error: 'Role must be either "admin" or "staff"',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Validate isActive filter
    if (isActiveFilter && !['true', 'false'].includes(isActiveFilter)) {
      return NextResponse.json({ 
        error: 'isActive must be either "true" or "false"',
        code: 'INVALID_IS_ACTIVE' 
      }, { status: 400 });
    }

    // Build query conditions
    const conditions = [];

    if (roleFilter) {
      conditions.push(eq(staffUsers.role, roleFilter));
    }

    if (isActiveFilter) {
      conditions.push(eq(staffUsers.isActive, isActiveFilter === 'true'));
    }

    if (search) {
      const searchCondition = or(
        like(staffUsers.fullName, `%${search}%`),
        like(staffUsers.email, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const totalCountQuery = db.select({ count: count() }).from(staffUsers);
    if (whereCondition) {
      totalCountQuery.where(whereCondition);
    }
    const [{ count: total }] = await totalCountQuery;

    // Get paginated users (excluding passwordHash)
    let query = db.select({
      id: staffUsers.id,
      fullName: staffUsers.fullName,
      email: staffUsers.email,
      role: staffUsers.role,
      isActive: staffUsers.isActive,
      createdAt: staffUsers.createdAt,
      updatedAt: staffUsers.updatedAt,
    }).from(staffUsers);

    if (whereCondition) {
      query = query.where(whereCondition);
    }

    const users = await query
      .orderBy(desc(staffUsers.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      success: true
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}