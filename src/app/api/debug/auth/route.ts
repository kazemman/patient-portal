import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { auth } from '@/lib/auth';
import { user, account, session, verification } from '@/db/schema';

export async function GET(request: NextRequest) {
  const diagnosticResults = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, any>,
    overall: 'unknown' as 'pass' | 'fail' | 'warning' | 'unknown'
  };

  let hasErrors = false;
  let hasWarnings = false;

  // Helper function to add check result
  const addCheck = (name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) => {
    diagnosticResults.checks[name] = {
      status,
      message,
      details: details || null,
      timestamp: new Date().toISOString()
    };
    
    if (status === 'fail') hasErrors = true;
    if (status === 'warning') hasWarnings = true;
  };

  try {
    // 1. Environment Variables Check
    console.log('🔍 Checking environment variables...');
    const envVars = {
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ? '✓ Set' : '✗ Missing',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || '✗ Missing',
      DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Missing',
      NODE_ENV: process.env.NODE_ENV || 'development'
    };

    const missingEnvVars = Object.entries(envVars)
      .filter(([key, value]) => value === '✗ Missing')
      .map(([key]) => key);

    if (missingEnvVars.length > 0) {
      addCheck('environment', 'fail', `Missing environment variables: ${missingEnvVars.join(', ')}`, envVars);
    } else {
      addCheck('environment', 'pass', 'All required environment variables are set', envVars);
    }

    // 2. Database Connection Check
    console.log('🔍 Testing database connection...');
    try {
      // Test database by doing a simple query instead of using execute
      await db.select().from(user).limit(1);
      addCheck('database_connection', 'pass', 'Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      addCheck('database_connection', 'fail', 'Database connection failed', {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
    }

    // 3. Auth Tables Existence Check
    console.log('🔍 Checking auth tables...');
    const requiredTables = ['user', 'account', 'session', 'verification'];
    const tableResults = {} as Record<string, any>;

    for (const tableName of requiredTables) {
      try {
        let result;
        switch (tableName) {
          case 'user':
            result = await db.select().from(user).limit(1);
            break;
          case 'account':
            result = await db.select().from(account).limit(1);
            break;
          case 'session':
            result = await db.select().from(session).limit(1);
            break;
          case 'verification':
            result = await db.select().from(verification).limit(1);
            break;
        }
        tableResults[tableName] = { exists: true, queryable: true };
      } catch (tableError) {
        console.error(`Table ${tableName} error:`, tableError);
        tableResults[tableName] = { 
          exists: false, 
          error: tableError instanceof Error ? tableError.message : String(tableError)
        };
      }
    }

    const missingTables = Object.entries(tableResults)
      .filter(([, result]) => !result.exists)
      .map(([tableName]) => tableName);

    if (missingTables.length > 0) {
      addCheck('auth_tables', 'fail', `Missing or inaccessible tables: ${missingTables.join(', ')}`, tableResults);
    } else {
      addCheck('auth_tables', 'pass', 'All auth tables exist and are accessible', tableResults);
    }

    // 4. Better-Auth Configuration Check
    console.log('🔍 Testing better-auth configuration...');
    try {
      // Test if auth instance is properly configured
      const authConfig = {
        hasSecret: !!process.env.BETTER_AUTH_SECRET,
        hasUrl: !!process.env.BETTER_AUTH_URL,
        baseUrl: process.env.BETTER_AUTH_URL,
        plugins: auth.options?.plugins ? auth.options.plugins.length : 0
      };

      // Check if auth.api exists and has expected methods
      const apiMethods = auth.api ? Object.keys(auth.api) : [];
      
      if (apiMethods.length === 0) {
        addCheck('auth_configuration', 'fail', 'Auth API methods not available', authConfig);
      } else {
        addCheck('auth_configuration', 'pass', 'Better-auth configuration appears valid', {
          ...authConfig,
          apiMethods: apiMethods.slice(0, 10) // First 10 methods to avoid too much data
        });
      }
    } catch (authError) {
      console.error('Auth configuration error:', authError);
      addCheck('auth_configuration', 'fail', 'Auth configuration error', {
        error: authError instanceof Error ? authError.message : String(authError)
      });
    }

    // 5. Database Schema Validation
    console.log('🔍 Validating database schema...');
    try {
      // Test critical columns exist by doing select with specific fields
      const userTest = await db.select({
        id: user.id,
        email: user.email,
        name: user.name
      }).from(user).limit(1);

      const accountTest = await db.select({
        id: account.id,
        userId: account.userId,
        providerId: account.providerId
      }).from(account).limit(1);

      addCheck('database_schema', 'pass', 'Database schema validation successful', {
        userFields: 'id, email, name accessible',
        accountFields: 'id, userId, providerId accessible'
      });
    } catch (schemaError) {
      console.error('Schema validation error:', schemaError);
      addCheck('database_schema', 'fail', 'Database schema validation failed', {
        error: schemaError instanceof Error ? schemaError.message : String(schemaError)
      });
    }

    // 6. User Count Check
    console.log('🔍 Checking user data...');
    try {
      const userCount = await db.select().from(user);
      const accountCount = await db.select().from(account);
      
      addCheck('user_data', 'pass', `Found ${userCount.length} users and ${accountCount.length} accounts`, {
        userCount: userCount.length,
        accountCount: accountCount.length,
        hasUsers: userCount.length > 0
      });
    } catch (userError) {
      console.error('User data check error:', userError);
      addCheck('user_data', 'warning', 'Could not check user data', {
        error: userError instanceof Error ? userError.message : String(userError)
      });
    }

  } catch (globalError) {
    console.error('Global diagnostic error:', globalError);
    addCheck('global_error', 'fail', 'Unexpected error during diagnostics', {
      error: globalError instanceof Error ? globalError.message : String(globalError),
      stack: globalError instanceof Error ? globalError.stack : undefined
    });
  }

  // Determine overall status
  if (hasErrors) {
    diagnosticResults.overall = 'fail';
  } else if (hasWarnings) {
    diagnosticResults.overall = 'warning';
  } else {
    diagnosticResults.overall = 'pass';
  }

  // Log summary
  console.log(`🏁 Diagnostics complete: ${diagnosticResults.overall.toUpperCase()}`);
  console.log(`✅ Passed: ${Object.values(diagnosticResults.checks).filter(c => c.status === 'pass').length}`);
  console.log(`⚠️  Warnings: ${Object.values(diagnosticResults.checks).filter(c => c.status === 'warning').length}`);
  console.log(`❌ Failed: ${Object.values(diagnosticResults.checks).filter(c => c.status === 'fail').length}`);

  return NextResponse.json(diagnosticResults, {
    status: hasErrors ? 500 : 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}