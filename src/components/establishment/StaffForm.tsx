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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Save, X, ImageUp, Unplug, Expand, Info } from "lucide-react";
import { format } from "date-fns";
import { StaffMemberFormDataSchema, type StaffMemberFormData, designationOptions, staffStatusOptions, type StaffStatusType } from "@/lib/schemas";
import type { StaffMember } from "@/lib/schemas";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StaffFormProps {
  onSubmit: (data: StaffMemberFormData) => Promise<void>;
  initialData?: StaffMember | null;
  isSubmitting: boolean;
  onCancel: () => void;
}

const isValidWebUrl = (url?: string | null): boolean => {
  if (!url) return false;
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === 'http:' || newUrl.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};


export default function StaffForm({ onSubmit, initialData, isSubmitting, onCancel }: StaffFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const form = useForm<StaffMemberFormData>({
    resolver: zodResolver(StaffMemberFormDataSchema),
    defaultValues: {
      name: initialData?.name || "",
      designation: initialData?.designation || undefined,
      pen: initialData?.pen || "",
      dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
      phoneNo: initialData?.phoneNo || "",
      roles: initialData?.roles || "",
      photoUrl: isValidWebUrl(initialData?.photoUrl) ? initialData.photoUrl : "",
      status: initialData?.status || 'Active', 
      remarks: initialData?.remarks || "",
    },
  });

  useEffect(() => {
    const initialPhotoUrl = initialData?.photoUrl;
    if (isValidWebUrl(initialPhotoUrl) && !isPlaceholderUrl(initialPhotoUrl)) {
      setImagePreview(initialPhotoUrl);
      setImageLoadError(false);
    } else {
      setImagePreview(null);
      setImageLoadError(false); 
    }

    const defaultFormValues: StaffMemberFormData = initialData
    ? {
        name: initialData.name || "",
        designation: initialData.designation || undefined,
        pen: initialData.pen || "",
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
        phoneNo: initialData.phoneNo || "",
        roles: initialData.roles || "",
        photoUrl: isValidWebUrl(initialData.photoUrl) ? initialData.photoUrl : "",
        status: initialData.status || 'Active',
        remarks: initialData.remarks || "",
      }
    : {
        name: "",
        designation: undefined,
        pen: "",
        dateOfBirth: undefined,
        phoneNo: "",
        roles: "",
        photoUrl: "",
        status: 'Active',
        remarks: "",
      };
    form.reset(defaultFormValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const watchedPhotoUrl = form.watch("photoUrl");
  useEffect(() => {
    if (isValidWebUrl(watchedPhotoUrl) && !isPlaceholderUrl(watchedPhotoUrl)) {
      setImagePreview(watchedPhotoUrl);
      setImageLoadError(false);
    } else if (watchedPhotoUrl === "" || isPlaceholderUrl(watchedPhotoUrl)) {
      setImagePreview(null);
      setImageLoadError(false);
    }
  }, [watchedPhotoUrl]);


  const handleCalendarInteraction = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-custom-controls-container') || target.closest('[data-radix-select-content]')) e.preventDefault();
  };

  const handleFormSubmitInternal = (data: StaffMemberFormData) => {
    const dataToSubmit = {...data, remarks: data.remarks || "" }; 
    onSubmit(dataToSubmit);
  };

  const canExpandImage = imagePreview && !imageLoadError && !isPlaceholderUrl(imagePreview);

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
              <FormItem className="flex flex-col">
                <FormLabel>Date of Birth</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        {field.value ? format(new Date(field.value), "dd/MM/yyyy") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start" onFocusOutside={handleCalendarInteraction} onPointerDownOutside={handleCalendarInteraction}>
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={field.onChange}
                    />
                  </PopoverContent>
                </Popover>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
           <FormField
            control={form.control}
            name="photoUrl"
            render={({ field }) => (
                <FormItem className="space-y-2 md:col-span-2">
                    <FormLabel>Staff Photo URL</FormLabel>
                    <div className="flex items-start gap-4">
                        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                          <DialogTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "relative h-24 w-24 rounded-md border flex items-center justify-center cursor-default",
                                canExpandImage && "cursor-pointer hover:opacity-80 transition-opacity"
                              )}
                              onClick={() => canExpandImage && setIsImageModalOpen(true)}
                              disabled={!canExpandImage}
                              aria-label={canExpandImage ? "View larger image" : "Image preview"}
                            >
                              {imagePreview && !imageLoadError && (
                                <Image
                                    src={imagePreview}
                                    alt="Staff photo preview"
                                    width={96}
                                    height={96}
                                    className="rounded-md object-cover h-full w-full"
                                    data-ai-hint="person face"
                                    onError={() => {
                                        setImagePreview(null);
                                        setImageLoadError(true);
                                    }}
                                />
                              )}
                              {(!imagePreview || imageLoadError) && (
                                  <div className="h-full w-full bg-muted flex items-center justify-center rounded-md">
                                      {imageLoadError ? (
                                          <Unplug className="h-10 w-10 text-destructive" />
                                      ) : (
                                          <ImageUp className="h-10 w-10 text-muted-foreground" />
                                      )}
                                  </div>
                              )}
                              {canExpandImage && (
                                <div className="absolute bottom-1 right-1 bg-black/50 p-1 rounded-sm">
                                  <Expand className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </button>
                          </DialogTrigger>
                           {canExpandImage && imagePreview && (
                            <DialogContent className="sm:max-w-[600px] p-2">
                              <DialogHeader>
                                <DialogTitle className="text-sm">{form.getValues("name") || "Staff Photo"}</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center items-center max-h-[80vh] overflow-hidden">
                                <img src={imagePreview} alt="Staff photo enlarged" className="max-w-full max-h-[75vh] object-contain rounded-md"/>
                              </div>
                            </DialogContent>
                          )}
                        </Dialog>

                        <div className="flex-1">
                            <FormControl>
                                <Input 
                                    placeholder="https://example.com/photo.jpg" 
                                    {...field} 
                                    value={field.value || ""}
                                    onChange={(e) => {
                                        const newUrl = e.target.value;
                                        field.onChange(newUrl);
                                        setImageLoadError(false); 
                                        if (isValidWebUrl(newUrl) && !isPlaceholderUrl(newUrl)) {
                                            setImagePreview(newUrl);
                                        } else if (newUrl === "" || isPlaceholderUrl(newUrl)) {
                                          setImagePreview(null);
                                        } else {
                                            setImagePreview(null); 
                                            if (newUrl !== "") setImageLoadError(true);
                                        }
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                Enter a direct public URL. Uploading files is not supported.
                            </FormDescription>
                             {imageLoadError && <p className="text-xs text-destructive mt-1">Invalid or unloadable URL</p>}
                        </div>
                    </div>
                    <FormMessage />
                </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="roles"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
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
              <FormItem className="md:col-span-1">
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
