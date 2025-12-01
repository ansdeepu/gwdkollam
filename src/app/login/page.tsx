// src/app/login/page.tsx
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If auth is not loading and a user object exists, they are authenticated. Redirect them.
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // While the auth state is being determined, show a full-screen loader.
  // This prevents the login form from flashing for an already logged-in user.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is done loading and there's no user, it's safe to render the login form.
  if (!isLoading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <div className="flex w-full max-w-4xl flex-col items-center space-y-8 rounded-xl bg-card p-8 shadow-2xl md:flex-row md:space-y-0 md:space-x-10 md:p-12">
          {/* Left Column: Branding */}
          <div className="flex w-full flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
            <Image
              src="https://placehold.co/120x120/3F51B5/FFFFFF.png?text=GWD%0AKOLLAM&font=lato&fontWeight=bold" 
              alt="GWD Kollam Logo"
              width={100}
              height={100}
              className="mb-6 rounded-lg shadow-md"
              data-ai-hint="abstract logo"
              priority
            />
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              GWD Kollam Dashboard
            </h1>
            <p className="mb-6 text-muted-foreground md:text-lg">
              Efficiently manage and monitor ground water resources.
            </p>
            <p className="text-xs text-muted-foreground">
              Access requires an authorized account.
            </p>
          </div>
          {/* Right Column: Login Form */}
          <div className="w-full md:w-1/2">
            <LoginForm />
          </div>
        </div>
      </div>
    );
  }
  
  // This is a fallback state for the brief moment after login but before the redirect completes.
  return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
  );
}
