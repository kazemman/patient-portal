"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ClinicLogin } from "@/components/LoginPage";

interface LoginData {
  token: string;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session and handle URL parameters
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const existingToken = localStorage.getItem("bearer_token");
        
        if (existingToken) {
          // Verify if existing token is still valid
          const response = await fetch("/api/webhook/clinic-portal/auth/verify", {
            headers: {
              "Authorization": `Bearer ${existingToken}`
            }
          });

          if (response.ok) {
            // Token is valid, redirect to dashboard
            const intendedDestination = localStorage.getItem("intended_destination");
            if (intendedDestination) {
              localStorage.removeItem("intended_destination");
              router.push(intendedDestination);
            } else {
              router.push("/");
            }
            return;
          } else {
            // Token is invalid, clear it
            localStorage.removeItem("bearer_token");
            localStorage.removeItem("user_data");
          }
        }

        // Handle URL parameters for session messages
        const expired = searchParams.get("expired");
        const invalid = searchParams.get("invalid");
        const redirect = searchParams.get("redirect");

        if (expired === "true") {
          toast.error("Your session has expired. Please log in again.");
        } else if (invalid === "true") {
          toast.error("Invalid session. Please log in again.");
        } else if (redirect === "true") {
          toast.error("Please log in to access this page.");
        }

      } catch (error) {
        console.error("Session check error:", error);
        // Clear any corrupted data
        localStorage.removeItem("bearer_token");
        localStorage.removeItem("user_data");
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, [router, searchParams]);

  const handleLoginSuccess = async (loginData = null) => {
    try {
      // If loginData is passed directly, use it. Otherwise get from event or API response
      let userData = loginData;
      
      if (!userData) {
        // This should be called from within ClinicLogin component after successful login
        const token = localStorage.getItem("bearer_token");
        const storedUserData = localStorage.getItem("user_data");
        
        if (token && storedUserData) {
          userData = { token, user: JSON.parse(storedUserData) };
        } else {
          throw new Error("No login data available");
        }
      }

      // Handle redirect logic
      const intendedDestination = localStorage.getItem("intended_destination");
      let redirectPath = "/"; // Default fallback

      if (intendedDestination) {
        // Validate intended destination exists and is safe
        const validPaths = [
          "/",
          "/dashboard",
          "/patients",
          "/appointments", 
          "/register",
          "/checkin",
          "/audit-logs",
          "/admin"
        ];
        
        const isValidPath = validPaths.some(path => 
          intendedDestination.startsWith(path)
        );
        
        if (isValidPath) {
          redirectPath = intendedDestination;
        }
        
        // Clear intended destination
        localStorage.removeItem("intended_destination");
      }

      // Perform redirect
      router.push(redirectPath);

    } catch (error) {
      console.error("Login success handler error:", error);
      toast.error("Login successful but redirect failed. Please navigate manually.");
    }
  };

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-gradient-start to-bg-gradient-end">
      <ClinicLogin onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}