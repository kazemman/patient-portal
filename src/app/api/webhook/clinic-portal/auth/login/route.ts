import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ 
        error: "Password is required",
        code: "MISSING_PASSWORD" 
      }, { status: 400 });
    }

    // Sanitize email input
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const userResults = await db.select()
      .from(staffUsers)
      .where(eq(staffUsers.email, normalizedEmail))
      .limit(1);

    const user = userResults[0];

    // Always run bcrypt.compare to prevent timing attacks
    const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attacks.abcdefghijklmnopqrstuv';
    const isValidPassword = user 
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, dummyHash);

    // Check if user exists, is active, and password is correct
    if (!user || !user.isActive || !isValidPassword) {
      return NextResponse.json({ 
        error: "Invalid credentials",
        code: "INVALID_CREDENTIALS" 
      }, { status: 401 });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'clinic-portal-secret-key';
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName
    };

    const token = jwt.sign(tokenPayload, jwtSecret, { 
      expiresIn: '24h' 
    });

    // Return success response
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    }, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}