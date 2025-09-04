import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { NextRequest } from 'next/server';
import { headers } from "next/headers"
import { db } from "@/db";
 
export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
	}),
	emailAndPassword: {    
		enabled: true
	},
	plugins: [bearer()]
});

// Session validation helper for server components
export async function getCurrentUser(request?: NextRequest) {
  try {
    if (request) {
      // API route authentication - check bearer token
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token) {
          // Create headers object for better-auth
          const requestHeaders = new Headers();
          requestHeaders.set('authorization', authHeader);
          
          const session = await auth.api.getSession({ 
            headers: requestHeaders 
          });
          return session?.user || null;
        }
      }
      return null;
    } else {
      // Server component authentication - check session
      const session = await auth.api.getSession({ headers: await headers() });
      return session?.user || null;
    }
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}