import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patients } from '@/db/schema';
import { eq, like, and, or, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    const includeInactiveParam = searchParams.get('includeInactive');

    // Validate required query parameter
    if (!query || query.trim() === '') {
      return NextResponse.json({
        error: 'Search query parameter "q" is required and cannot be empty',
        code: 'MISSING_SEARCH_QUERY'
      }, { status: 400 });
    }

    // Validate and set limit
    let limit = 50; // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json({
          error: 'Limit parameter must be a positive integer',
          code: 'INVALID_LIMIT'
        }, { status: 400 });
      }
      limit = Math.min(parsedLimit, 100); // max 100
    }

    // Parse includeInactive parameter
    const includeInactive = includeInactiveParam === 'true';

    // Normalize search query
    const searchQuery = query.trim();
    const isNumericQuery = !isNaN(parseInt(searchQuery));

    // Build search conditions
    const searchConditions = [];

    // Search firstName (case-insensitive partial match)
    searchConditions.push(like(patients.firstName, `%${searchQuery}%`));

    // Search lastName (case-insensitive partial match)
    searchConditions.push(like(patients.lastName, `%${searchQuery}%`));

    // Search phone (exact and partial match)
    searchConditions.push(like(patients.phone, `%${searchQuery}%`));

    // Search email (case-insensitive partial match)
    searchConditions.push(like(patients.email, `%${searchQuery}%`));

    // Search saIdNumber (exact match)
    if (patients.saIdNumber) {
      searchConditions.push(eq(patients.saIdNumber, searchQuery));
    }

    // Search passportNumber (case-insensitive exact match)
    if (patients.passportNumber) {
      searchConditions.push(like(patients.passportNumber, searchQuery));
    }

    // Search by ID if query is numeric
    if (isNumericQuery) {
      searchConditions.push(eq(patients.id, parseInt(searchQuery)));
    }

    // Build the main query condition
    const searchCondition = or(...searchConditions);

    // Build where clause - combine search with active filter
    let whereCondition;
    if (includeInactive) {
      whereCondition = searchCondition;
    } else {
      whereCondition = and(searchCondition, eq(patients.active, true));
    }

    // Execute the search query
    const results = await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      phone: patients.phone,
      email: patients.email,
      idType: patients.idType,
      saIdNumber: patients.saIdNumber,
      passportNumber: patients.passportNumber,
      passportCountry: patients.passportCountry,
      medicalAid: patients.medicalAid,
      medicalAidNumber: patients.medicalAidNumber,
      active: patients.active
    })
    .from(patients)
    .where(whereCondition)
    .orderBy(asc(patients.lastName), asc(patients.firstName))
    .limit(limit);

    // Return response with patients array and total count
    return NextResponse.json({
      patients: results,
      total: results.length,
      limit: limit,
      includeInactive: includeInactive
    }, { status: 200 });

  } catch (error) {
    console.error('GET patients search error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}