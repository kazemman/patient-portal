import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/db';
import { staffUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface JWTPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'Authorization header is required',
        code: 'MISSING_AUTH_HEADER' 
      }, { status: 401 });
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Invalid authorization format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT' 
      }, { status: 401 });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required',
        code: 'MISSING_TOKEN' 
      }, { status: 401 });
    }

    // Get JWT secret
    const jwtSecret = process.env.JWT_SECRET || 'clinic-portal-secret-key';

    // Verify and decode JWT token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return NextResponse.json({ 
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED' 
        }, { status: 401 });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return NextResponse.json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN' 
        }, { status: 401 });
      } else {
        return NextResponse.json({ 
          error: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED' 
        }, { status: 401 });
      }
    }

    // Validate token payload structure
    if (!decoded.userId || typeof decoded.userId !== 'number') {
      return NextResponse.json({ 
        error: 'Invalid token payload: missing or invalid userId',
        code: 'INVALID_TOKEN_PAYLOAD' 
      }, { status: 401 });
    }

    // Verify user exists and is active in database
    const user = await db.select()
      .from(staffUsers)
      .where(eq(staffUsers.id, decoded.userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ 
        error: 'User no longer exists',
        code: 'USER_NOT_FOUND' 
      }, { status: 401 });
    }

    const userRecord = user[0];

    // Check if user is active
    if (!userRecord.isActive) {
      return NextResponse.json({ 
        error: 'User account is inactive',
        code: 'USER_INACTIVE' 
      }, { status: 401 });
    }

    // Return successful verification with user info
    return NextResponse.json({
      valid: true,
      user: {
        id: userRecord.id,
        fullName: userRecord.fullName,
        email: userRecord.email,
        role: userRecord.role
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET /webhook/clinic-portal/auth/verify error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}