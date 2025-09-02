import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function PUT(request: NextRequest) {
  try {
    // Authentication: Extract and verify JWT token
    const authHeader = request.headers.get('Authorization');
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
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      }, { status: 401 });
    }

    // Authorization: Verify admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin privileges required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 401 });
    }

    // Parse request body
    const { userId, newPassword } = await request.json();

    // Validate userId
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ 
        error: 'User ID must be a positive integer',
        code: 'INVALID_USER_ID' 
      }, { status: 400 });
    }

    // Validate new password
    if (!newPassword) {
      return NextResponse.json({ 
        error: 'New password is required',
        code: 'MISSING_PASSWORD' 
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long',
        code: 'PASSWORD_TOO_SHORT' 
      }, { status: 400 });
    }

    // Password strength validation
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      return NextResponse.json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        code: 'WEAK_PASSWORD' 
      }, { status: 400 });
    }

    // Check if user exists and is active
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

    if (!existingUser[0].isActive) {
      return NextResponse.json({ 
        error: 'Cannot reset password for inactive user',
        code: 'USER_INACTIVE' 
      }, { status: 404 });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password and timestamp
    const updatedUser = await db.update(staffUsers)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date().toISOString()
      })
      .where(eq(staffUsers.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update password',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      userId: userId
    }, { status: 200 });

  } catch (error) {
    console.error('PUT /webhook/clinic-portal/admin/reset-password error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}