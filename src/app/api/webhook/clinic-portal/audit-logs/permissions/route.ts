import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

export async function GET(request: NextRequest) {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'Authorization header is required',
        code: 'MISSING_AUTH_HEADER' 
      }, { status: 401 });
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Invalid authorization format. Use Bearer token',
        code: 'INVALID_AUTH_FORMAT' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required',
        code: 'MISSING_TOKEN' 
      }, { status: 401 });
    }

    // Get JWT secret from environment or use default
    const jwtSecret = process.env.JWT_SECRET || 'clinic-portal-secret-key';

    let decoded: JWTPayload;

    try {
      // Verify JWT token
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

    // Validate token payload structure - updated field name
    if (!decoded || typeof decoded !== 'object' || !decoded.userId || !decoded.email || !decoded.role) {
      return NextResponse.json({ 
        error: 'Invalid token payload structure',
        code: 'INVALID_TOKEN_PAYLOAD' 
      }, { status: 401 });
    }

    // Check if user has admin role for audit log access
    const hasPermission = decoded.role === 'admin';
    const userRole = decoded.role as 'admin' | 'staff';

    let message: string;
    if (hasPermission) {
      message = 'User has permission to view audit logs';
    } else {
      message = 'User does not have permission to view audit logs. Admin role required';
    }

    return NextResponse.json({
      hasPermission,
      role: userRole,
      message
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}