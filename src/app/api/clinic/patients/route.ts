import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { clinicPatients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (basic format)
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

// Date validation regex (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single patient by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const patient = await db.select()
        .from(clinicPatients)
        .where(eq(clinicPatients.id, parseInt(id)))
        .limit(1);

      if (patient.length === 0) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      return NextResponse.json(patient[0]);
    }

    // List patients with pagination, search, and filtering
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const active = searchParams.get('active');
    const sort = searchParams.get('sort') || 'firstName';
    const order = searchParams.get('order') || 'asc';

    let query = db.select().from(clinicPatients);

    // Build where conditions
    const conditions = [];

    if (search) {
      const searchCondition = or(
        like(clinicPatients.firstName, `%${search}%`),
        like(clinicPatients.lastName, `%${search}%`),
        like(clinicPatients.email, `%${search}%`),
        like(clinicPatients.phone, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (status) {
      conditions.push(eq(clinicPatients.status, status));
    }

    if (active !== null && active !== undefined) {
      conditions.push(eq(clinicPatients.active, active === 'true'));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderBy = order === 'desc' ? desc : asc;
    switch (sort) {
      case 'firstName':
        query = query.orderBy(orderBy(clinicPatients.firstName));
        break;
      case 'lastName':
        query = query.orderBy(orderBy(clinicPatients.lastName));
        break;
      case 'email':
        query = query.orderBy(orderBy(clinicPatients.email));
        break;
      case 'registrationDate':
        query = query.orderBy(orderBy(clinicPatients.registrationDate));
        break;
      case 'createdAt':
        query = query.orderBy(orderBy(clinicPatients.createdAt));
        break;
      default:
        query = query.orderBy(orderBy(clinicPatients.firstName));
    }

    const results = await query.limit(limit).offset(offset);
    return NextResponse.json(results);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestBody = await request.json();

    // Security check: reject if user identifiers provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      address, 
      emergencyContact, 
      insuranceInfo,
      status 
    } = requestBody;

    // Validate required fields
    if (!firstName) {
      return NextResponse.json({ 
        error: "First name is required",
        code: "MISSING_FIRST_NAME" 
      }, { status: 400 });
    }

    if (!lastName) {
      return NextResponse.json({ 
        error: "Last name is required",
        code: "MISSING_LAST_NAME" 
      }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_EMAIL" 
      }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ 
        error: "Phone is required",
        code: "MISSING_PHONE" 
      }, { status: 400 });
    }

    if (!dateOfBirth) {
      return NextResponse.json({ 
        error: "Date of birth is required",
        code: "MISSING_DATE_OF_BIRTH" 
      }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ 
        error: "Address is required",
        code: "MISSING_ADDRESS" 
      }, { status: 400 });
    }

    if (!emergencyContact) {
      return NextResponse.json({ 
        error: "Emergency contact is required",
        code: "MISSING_EMERGENCY_CONTACT" 
      }, { status: 400 });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT" 
      }, { status: 400 });
    }

    // Validate phone format
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ 
        error: "Invalid phone format",
        code: "INVALID_PHONE_FORMAT" 
      }, { status: 400 });
    }

    // Validate date of birth format
    if (!dateRegex.test(dateOfBirth)) {
      return NextResponse.json({ 
        error: "Invalid date of birth format (YYYY-MM-DD required)",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Check email uniqueness
    const existingPatient = await db.select()
      .from(clinicPatients)
      .where(eq(clinicPatients.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingPatient.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_EXISTS" 
      }, { status: 409 });
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      dateOfBirth,
      address: address.trim(),
      emergencyContact: emergencyContact.trim(),
      insuranceInfo: insuranceInfo || null,
      registrationDate: now,
      status: status || 'active',
      active: true,
      createdAt: now,
      updatedAt: now
    };

    const newPatient = await db.insert(clinicPatients)
      .values(insertData)
      .returning();

    return NextResponse.json(newPatient[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Security check: reject if user identifiers provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if patient exists
    const existingPatient = await db.select()
      .from(clinicPatients)
      .where(eq(clinicPatients.id, parseInt(id)))
      .limit(1);

    if (existingPatient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      address, 
      emergencyContact, 
      insuranceInfo,
      status,
      active
    } = requestBody;

    // Validate fields if provided
    if (email && !emailRegex.test(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT" 
      }, { status: 400 });
    }

    if (phone && !phoneRegex.test(phone)) {
      return NextResponse.json({ 
        error: "Invalid phone format",
        code: "INVALID_PHONE_FORMAT" 
      }, { status: 400 });
    }

    if (dateOfBirth && !dateRegex.test(dateOfBirth)) {
      return NextResponse.json({ 
        error: "Invalid date of birth format (YYYY-MM-DD required)",
        code: "INVALID_DATE_FORMAT" 
      }, { status: 400 });
    }

    // Check email uniqueness if email is being updated
    if (email && email.toLowerCase().trim() !== existingPatient[0].email) {
      const emailExists = await db.select()
        .from(clinicPatients)
        .where(and(
          eq(clinicPatients.email, email.toLowerCase().trim()),
          eq(clinicPatients.id, parseInt(id))
        ))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json({ 
          error: "Email already exists",
          code: "EMAIL_EXISTS" 
        }, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (address !== undefined) updateData.address = address.trim();
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact.trim();
    if (insuranceInfo !== undefined) updateData.insuranceInfo = insuranceInfo;
    if (status !== undefined) updateData.status = status;
    if (active !== undefined) updateData.active = active;

    const updated = await db.update(clinicPatients)
      .set(updateData)
      .where(eq(clinicPatients.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if patient exists
    const existingPatient = await db.select()
      .from(clinicPatients)
      .where(eq(clinicPatients.id, parseInt(id)))
      .limit(1);

    if (existingPatient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Soft delete: set active = false, status = 'inactive'
    const deleted = await db.update(clinicPatients)
      .set({
        active: false,
        status: 'inactive',
        updatedAt: new Date().toISOString()
      })
      .where(eq(clinicPatients.id, parseInt(id)))
      .returning();

    return NextResponse.json({
      message: 'Patient deleted successfully',
      patient: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}