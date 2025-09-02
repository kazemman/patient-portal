import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function PUT(request: NextRequest) {
  try {
    // Extract and verify JWT token
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

    // Check if user has admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin privileges required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 401 });
    }

    // Parse request body
    const { userId, fullName, email, role, isActive } = await request.json();

    // Validate required userId
    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required',
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ 
        error: 'userId must be a positive integer',
        code: 'INVALID_USER_ID' 
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(staffUsers)
      .where(eq(staffUsers.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const currentUser = existingUser[0];

    // Validate optional fields
    const updates: any = {};

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length === 0) {
        return NextResponse.json({ 
          error: 'fullName must be a non-empty string',
          code: 'INVALID_FULL_NAME' 
        }, { status: 400 });
      }
      
      const trimmedFullName = fullName.trim();
      if (trimmedFullName.length < 2 || trimmedFullName.length > 100) {
        return NextResponse.json({ 
          error: 'fullName must be between 2 and 100 characters',
          code: 'INVALID_FULL_NAME_LENGTH' 
        }, { status: 400 });
      }
      
      updates.fullName = trimmedFullName;
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || email.trim().length === 0) {
        return NextResponse.json({ 
          error: 'email must be a non-empty string',
          code: 'INVALID_EMAIL' 
        }, { status: 400 });
      }

      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json({ 
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT' 
        }, { status: 400 });
      }

      // Check email uniqueness if email is being changed
      if (trimmedEmail !== currentUser.email) {
        const emailExists = await db.select()
          .from(staffUsers)
          .where(eq(staffUsers.email, trimmedEmail))
          .limit(1);

        if (emailExists.length > 0) {
          return NextResponse.json({ 
            error: 'Email already exists',
            code: 'EMAIL_ALREADY_EXISTS' 
          }, { status: 400 });
        }
      }

      updates.email = trimmedEmail;
    }

    if (role !== undefined) {
      if (role !== 'admin' && role !== 'staff') {
        return NextResponse.json({ 
          error: 'role must be either "admin" or "staff"',
          code: 'INVALID_ROLE' 
        }, { status: 400 });
      }
      
      updates.role = role;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ 
          error: 'isActive must be a boolean',
          code: 'INVALID_IS_ACTIVE' 
        }, { status: 400 });
      }

      // Prevent admin from deactivating themselves
      if (decodedToken.userId === userId && isActive === false) {
        return NextResponse.json({ 
          error: 'Cannot deactivate your own account',
          code: 'CANNOT_DEACTIVATE_SELF' 
        }, { status: 400 });
      }

      updates.isActive = isActive;
    }

    // If no updates provided, return current user
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        user: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: currentUser.email,
          role: currentUser.role,
          isActive: currentUser.isActive,
          updatedAt: currentUser.updatedAt
        }
      });
    }

    // Update user with current timestamp
    updates.updatedAt = new Date().toISOString();

    const updatedUser = await db.update(staffUsers)
      .set(updates)
      .where(eq(staffUsers.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update user',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    const user = updatedUser[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('PUT /webhook/clinic-portal/admin/update-user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}