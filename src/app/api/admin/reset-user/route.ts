import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export async function DELETE(request: NextRequest) {
  try {
    const adminEmail = 'admin@invotech.health';
    
    // Find user by email
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);
    
    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'Admin user not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }
    
    const userId = existingUser[0].id;
    
    // Delete associated account records first (to handle foreign key constraints)
    const deletedAccounts = await db.delete(account)
      .where(eq(account.userId, userId))
      .returning();
    
    // Delete user record
    const deletedUser = await db.delete(user)
      .where(eq(user.id, userId))
      .returning();
    
    return NextResponse.json({
      message: 'Admin user and associated accounts deleted successfully',
      deletedRecords: {
        user: deletedUser.length,
        accounts: deletedAccounts.length
      },
      deletedUser: deletedUser[0]
    }, { status: 200 });
    
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminEmail = 'admin@invotech.health';
    const adminPassword = 'Admin123456!';
    const adminName = 'Admin User';
    
    // Check if admin user already exists
    const existingUser = await db.select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);
    
    if (existingUser.length > 0) {
      return NextResponse.json({ 
        error: 'Admin user already exists',
        code: 'USER_ALREADY_EXISTS' 
      }, { status: 400 });
    }
    
    // Generate random UUID for user ID
    const userId = randomUUID();
    
    // Hash password using bcrypt with salt rounds 12
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const now = new Date();
    
    // Create user record
    const newUser = await db.insert(user)
      .values({
        id: userId,
        name: adminName,
        email: adminEmail,
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    // Create account record with hashed password
    const newAccount = await db.insert(account)
      .values({
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId: userId,
        password: hashedPassword,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    
    // Return created user data (exclude password)
    const { password, ...userResponse } = newUser[0];
    
    return NextResponse.json({
      message: 'Admin user created successfully',
      user: userResponse,
      accountCreated: true
    }, { status: 201 });
    
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}