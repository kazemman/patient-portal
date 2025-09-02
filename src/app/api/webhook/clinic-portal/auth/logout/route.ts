import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Missing or invalid authorization header',
        code: 'MISSING_AUTH_HEADER' 
      }, { status: 401 });
    }

    // Extract token from Bearer format
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required',
        code: 'MISSING_TOKEN' 
      }, { status: 401 });
    }

    // Get JWT secret
    const jwtSecret = process.env.JWT_SECRET || 'clinic-portal-secret-key';

    // Verify JWT token
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // Check if token has required structure (contains user info)
      if (!decoded || typeof decoded !== 'object' || !decoded.userId) {
        return NextResponse.json({ 
          error: 'Invalid token structure',
          code: 'INVALID_TOKEN_STRUCTURE' 
        }, { status: 401 });
      }

    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError instanceof jwt.TokenExpiredError) {
        return NextResponse.json({ 
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED' 
        }, { status: 401 });
      }
      
      if (jwtError instanceof jwt.JsonWebTokenError) {
        return NextResponse.json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN' 
        }, { status: 401 });
      }

      // Other JWT verification errors
      return NextResponse.json({ 
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED' 
      }, { status: 401 });
    }

    // Token is valid - return success response
    // Note: Actual logout/token invalidation happens client-side
    return NextResponse.json({ 
      success: true, 
      message: "Logged out successfully" 
    }, { status: 200 });

  } catch (error) {
    console.error('POST logout error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}