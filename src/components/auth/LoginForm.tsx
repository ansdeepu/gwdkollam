
// src/components/auth/LoginForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
// Link import is not needed as "Register here" is removed
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LoginSchema, type LoginFormData } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginForm() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password);

      if (result.success) {
        // On successful login & approval, redirection is handled by useAuth and DashboardLayout.
      } else {
        const error = result.error;
        let errorMessage = "Login failed. Please check your credentials and try again.";
        if (error?.message === "AUTH_PENDING_APPROVAL" || error?.code === "auth/pending-approval") {
          errorMessage = "Your account is pending approval by an administrator. Please contact 8547650853 for activation.";
        } else if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
          errorMessage = "Invalid email or password.";
        } else if (error?.code === 'auth/invalid-email') {
          errorMessage = "The email address is not valid.";
        } else if (error?.code) {
          console.error("Firebase login error code:", error.code);
        }
        toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
      }
    } catch (e) {
      console.error("Unexpected error during login:", e);
      toast({ title: "Login Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false); 
    }
  }

  return (
    <Card className="w-full shadow-xl border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Sign In
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-3 pt-4">
        <p className="text-xs text-muted-foreground text-center">
          For new accounts or approval, please contact the administrator at <strong className="font-semibold">8547650853</strong>.
        </p>
      </CardFooter>
    </Card>
  );
}
