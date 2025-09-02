import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function DELETE(request: NextRequest) {
  try {
    // Extract and verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization token required',
        code: 'MISSING_TOKEN' 
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
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

    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin role required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 401 });
    }

    // Get userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId is required',
        code: 'MISSING_USER_ID' 
      }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt) || userIdInt <= 0) {
      return NextResponse.json({ 
        error: 'Valid positive integer userId is required',
        code: 'INVALID_USER_ID' 
      }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (userIdInt === decodedToken.userId) {
      return NextResponse.json({ 
        error: 'Cannot deactivate your own account',
        code: 'CANNOT_DEACTIVATE_SELF' 
      }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(staffUsers)
      .where(eq(staffUsers.id, userIdInt))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Deactivate user (soft delete)
    const deactivatedUser = await db.update(staffUsers)
      .set({
        isActive: false,
        updatedAt: new Date().toISOString()
      })
      .where(eq(staffUsers.id, userIdInt))
      .returning();

    if (deactivatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to deactivate user',
        code: 'DEACTIVATION_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "User deactivated successfully",
      userId: userIdInt
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}