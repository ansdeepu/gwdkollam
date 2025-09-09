// src/components/establishment/StaffForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X } from "lucide-react";
import { StaffMemberFormDataSchema, type StaffMemberFormData, designationOptions, staffStatusOptions } from "@/lib/schemas";
import type { StaffMember } from "@/lib/schemas";
import React from "react";
import { format } from "date-fns";

interface StaffFormProps {
  onSubmit: (data: StaffMemberFormData) => Promise<void>;
  initialData?: StaffMember | null;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function StaffForm({ onSubmit, initialData, isSubmitting, onCancel }: StaffFormProps) {
  const getInitialFormValues = React.useCallback((): StaffMemberFormData => {
    const dob = initialData?.dateOfBirth;
    const formattedDob = dob ? format(new Date(dob), 'yyyy-MM-dd') : "";

    return {
      name: initialData?.name || "",
      designation: initialData?.designation || undefined,
      pen: initialData?.pen || "",
      dateOfBirth: formattedDob,
      phoneNo: initialData?.phoneNo || "",
      roles: initialData?.roles || "",
      status: initialData?.status || 'Active', 
      remarks: initialData?.remarks || "",
    };
  }, [initialData]);

  const form = useForm<StaffMemberFormData>({
    resolver: zodResolver(StaffMemberFormDataSchema),
    defaultValues: getInitialFormValues(),
  });
  
  React.useEffect(() => {
    form.reset(getInitialFormValues());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form.reset]);

  const handleFormSubmitInternal = (data: StaffMemberFormData) => {
    const dataToSubmit: any = {
        ...data,
        remarks: data.remarks || "",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmitInternal)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {designationOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pen"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PEN</FormLabel>
                <FormControl>
                  <Input placeholder="Enter PEN" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

           <FormField
            control={form.control}
            name="phoneNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="Enter 10 digit phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                   <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
            />
           <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {staffStatusOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <FormField
            control={form.control}
            name="roles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roles/Responsibilities</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Section Clerk, Field Supervisor" className="resize-y min-h-[120px]" {...field} />
                </FormControl>
                <FormDescription>Enter comma-separated roles or a brief description. (Optional)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        
          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional remarks about the staff member." className="resize-y min-h-[120px]" {...field} />
                </FormControl>
                <FormDescription>(Optional)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-center space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {initialData?.id ? "Save Changes" : "Add Staff Member"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
