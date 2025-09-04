import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function GET(request: NextRequest) {
  try {
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
        .from(patients)
        .where(eq(patients.id, parseInt(id)))
        .limit(1);

      if (patient.length === 0) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      return NextResponse.json(patient[0]);
    }

    // List patients with pagination and search
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    let query = db.select().from(patients);

    if (search) {
      const searchCondition = or(
        like(patients.name, `%${search}%`),
        like(patients.email, `%${search}%`),
        like(patients.phone, `%${search}%`)
      );
      query = query.where(searchCondition);
    }

    // Apply sorting
    const sortColumn = patients[sort as keyof typeof patients] || patients.createdAt;
    query = order === 'asc' ? query.orderBy(asc(sortColumn)) : query.orderBy(desc(sortColumn));

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
    const requestBody = await request.json();

    const { email, name, phone, dateOfBirth, address, emergencyContact } = requestBody;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ 
        error: "Email is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ 
        error: "Phone is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!dateOfBirth) {
      return NextResponse.json({ 
        error: "Date of birth is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ 
        error: "Address is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (!emergencyContact) {
      return NextResponse.json({ 
        error: "Emergency contact is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT" 
      }, { status: 400 });
    }

    // Check if email already exists
    const existingPatient = await db.select()
      .from(patients)
      .where(eq(patients.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingPatient.length > 0) {
      return NextResponse.json({ 
        error: "Email already exists",
        code: "EMAIL_ALREADY_EXISTS" 
      }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedData = {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      phone: phone.trim(),
      dateOfBirth: dateOfBirth.trim(),
      address: address.trim(),
      emergencyContact: emergencyContact.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newPatient = await db.insert(patients)
      .values(sanitizedData)
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();

    // Check if patient exists
    const existingPatient = await db.select()
      .from(patients)
      .where(eq(patients.id, parseInt(id)))
      .limit(1);

    if (existingPatient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const { email, name, phone, dateOfBirth, address, emergencyContact } = requestBody;

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ 
        error: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT" 
      }, { status: 400 });
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact.trim();

    const updated = await db.update(patients)
      .set(updateData)
      .where(eq(patients.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if patient exists before deleting
    const existingPatient = await db.select()
      .from(patients)
      .where(eq(patients.id, parseInt(id)))
      .limit(1);

    if (existingPatient.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const deleted = await db.delete(patients)
      .where(eq(patients.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Patient deleted successfully',
      deletedPatient: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}