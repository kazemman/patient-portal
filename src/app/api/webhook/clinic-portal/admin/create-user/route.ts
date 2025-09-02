import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Extract and verify JWT token from Authorization header
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
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      }, { status: 401 });
    }

    // Verify user has admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin role required',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 401 });
    }

    // Parse request body
    const { fullName, email, password, role = 'staff' } = await request.json();

    // Validate required fields
    if (!fullName) {
      return NextResponse.json({ 
        error: 'Full name is required',
        code: 'MISSING_FULL_NAME' 
      }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required',
        code: 'MISSING_EMAIL' 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: 'Password is required',
        code: 'MISSING_PASSWORD' 
      }, { status: 400 });
    }

    // Validate fullName length
    if (fullName.trim().length < 2 || fullName.trim().length > 100) {
      return NextResponse.json({ 
        error: 'Full name must be between 2 and 100 characters',
        code: 'INVALID_FULL_NAME_LENGTH' 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT' 
      }, { status: 400 });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
        code: 'WEAK_PASSWORD' 
      }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'staff'].includes(role)) {
      return NextResponse.json({ 
        error: 'Role must be admin or staff',
        code: 'INVALID_ROLE' 
      }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.select()
      .from(staffUsers)
      .where(eq(staffUsers.email, email.trim().toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'Email already exists',
        code: 'EMAIL_ALREADY_EXISTS' 
      }, { status: 400 });
    }

    // Hash password with bcrypt using salt rounds 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Create current timestamp
    const now = new Date().toISOString();

    // Insert new user
    const newUser = await db.insert(staffUsers)
      .values({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        isActive: true,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Return created user info without password
    const { passwordHash: _, ...userWithoutPassword } = newUser[0];

    return NextResponse.json({
      success: true,
      user: userWithoutPassword
    }, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}