// src/components/admin/NewUserForm.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type StaffMember, NewUserByAdminSchema, type NewUserByAdminFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewUserFormProps {
  staffMembers: StaffMember[];
  staffLoading: boolean;
  onSubmit: (data: NewUserByAdminFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function NewUserForm({ staffMembers, staffLoading, onSubmit, isSubmitting, onCancel }: NewUserFormProps) {
  const form = useForm<NewUserByAdminFormData>({
    resolver: zodResolver(NewUserByAdminSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const selectedStaffId = form.watch('staffId');
  const selectedStaffMember = staffMembers.find(s => s.id === selectedStaffId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[60vh] -mr-4 pr-4">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Staff Member</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={staffLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={staffLoading ? "Loading staff..." : "Select from establishment list"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffMembers.map(staff => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name} ({staff.designation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedStaffMember && (
                <div className="p-3 bg-secondary/50 rounded-md border text-sm">
                    <p><strong>Selected:</strong> {selectedStaffMember.name}</p>
                    <p><strong>Designation:</strong> {selectedStaffMember.designation}</p>
                    <p><strong>PEN:</strong> {selectedStaffMember.pen}</p>
                </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@gwdkollam.com" {...field} />
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
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-6 border-t mt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedStaffId}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? 'Creating User...' : 'Create User'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
