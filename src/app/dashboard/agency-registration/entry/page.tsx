
// src/app/dashboard/agency-registration/entry/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { AgencyApplicationFormSchema, type AgencyApplicationFormData } from "@/lib/schemas";
import { useAgencyApplications } from '@/hooks/useAgencyApplications';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, PlusCircle, Trash2, Save, X, ShieldAlert } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function AgencyRegistrationEntryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addApplication, isLoading: isSubmitting } = useAgencyApplications();

  const form = useForm<AgencyApplicationFormData>({
    resolver: zodResolver(AgencyApplicationFormSchema),
    defaultValues: {
      agencyName: "",
      ownerName: "",
      address: "",
      phone: "",
      email: "",
      rigDetails: [{ type: "", registrationNumber: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rigDetails",
  });

  const onSubmit = async (data: AgencyApplicationFormData) => {
    try {
      await addApplication(data);
      toast({ title: "Registration Submitted", description: "The new rig registration has been added for verification." });
      router.push('/dashboard/agency-registration');
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };
  
  if (user?.role !== 'editor') {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
         <div className="space-y-6 p-6 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <Button variant="outline" onClick={() => router.push('/dashboard/agency-registration')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Registrations List
       </Button>
       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>New Rig Registration Form</CardTitle>
            <CardDescription>Fill in the details below to register a new agency and their rigs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="agencyName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Agency Name</FormLabel><FormControl><Input placeholder="Name of the agency" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="ownerName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Owner's Name</FormLabel><FormControl><Input placeholder="Name of the owner" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="address" control={form.control} render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Full Address</FormLabel><FormControl><Textarea placeholder="Enter the complete address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="phone" control={form.control} render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="10-digit mobile number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField name="email" control={form.control} render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="example@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />

                <div>
                  <h3 className="text-lg font-medium">Rig Details</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-4 p-4 my-2 border rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                        <FormField name={`rigDetails.${index}.type`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Rig Type</FormLabel><FormControl><Input placeholder="e.g., DTH, Rotary" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name={`rigDetails.${index}.registrationNumber`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input placeholder="e.g., KL01AB1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      {fields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ type: "", registrationNumber: "" })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Rig
                  </Button>
                </div>
                
                 <div className="flex justify-end pt-8 space-x-3">
                   <Button type="button" variant="outline" onClick={() => router.push('/dashboard/agency-registration')} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                   <Button type="submit" disabled={isSubmitting}> {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Submit Registration </Button>
                </div>
              </form>
            </Form>
          </CardContent>
       </Card>
    </div>
  );
}
