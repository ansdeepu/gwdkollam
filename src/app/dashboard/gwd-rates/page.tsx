
// src/app/dashboard/gwd-rates/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DollarSign,
  PlusCircle,
  FileDown,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
  ShieldAlert,
  ArrowUpDown,
  ClipboardList
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocs, query, writeBatch } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { GwdRateItemFormDataSchema, type GwdRateItem, type GwdRateItemFormData } from "@/lib/schemas";
import { z } from 'zod';
import { usePageHeader } from "@/hooks/usePageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const dynamic = 'force-dynamic';

const db = getFirestore(app);
const RATES_COLLECTION = 'gwdRates';

// Fee Details Dialog Component
const RigFeeDetailsDialog = () => {
    const currentYear = new Date().getFullYear();
    const [selectedRegYear, setSelectedRegYear] = useState<number>(currentYear);
    const [selectedRenewalNum, setSelectedRenewalNum] = useState<number>(1);

    const registrationYears = Array.from({ length: 28 }, (_, i) => 2023 + i); // 2023 to 2050
    const renewalNumbers = Array.from({ length: 30 }, (_, i) => i + 1);

    const calculateFeeForYear = useCallback((baseAmount: number, baseYear: number, targetYear: number) => {
        let fee = baseAmount;
        const roundUpToNearest10 = (num: number) => Math.ceil(num / 10) * 10;

        for (let i = baseYear; i < targetYear; i++) {
            fee = roundUpToNearest10(fee * 1.05);
        }
        return fee;
    }, []);

    const calculateRenewalFee = useCallback((baseAmount: number, renewalNum: number) => {
        let fee = baseAmount;
        const roundUpToNearest10 = (num: number) => Math.ceil(num / 10) * 10;
        
        // A 1st renewal happens on the base amount. A 2nd renewal has one 5% increment, etc.
        for (let i = 1; i < renewalNum; i++) {
            fee = roundUpToNearest10(fee * 1.05);
        }
        return fee;
    }, []);
    
    const staticFees = [
        { description: 'Application Fee - Agency Registration', amount: 1000 },
        { description: 'Application Fee - Rig Registration', amount: 1000 },
        { description: 'Agency Registration Fee as on 24-01-2023', amount: 60000 },
        { description: 'Fine without valid registration as on 24-01-2023', amount: 100000 },
    ];
    
    const registrationFeeItems = [
        { description: 'Agency Registration Fee', baseAmount: 60000, baseYear: 2023 },
        { description: 'Rig Registration Fee - DTH, Rotary, Dismantling Rig, Calyx', baseAmount: 12000, baseYear: 2023 },
        { description: 'Agency Registration Fee - Filterpoint, Hand bore', baseAmount: 15000, baseYear: 2023 },
        { description: 'Rig Registration Fee - Filterpoint, Hand bore', baseAmount: 5000, baseYear: 2023 },
    ];
    
    const renewalFeeItems = [
        { description: 'Rig Registration Renewal Fee - DTH, Rotary, Dismantling Rig, Calyx', baseAmount: 6000 },
        { description: 'Rig Registration Renewal Fee - Filterpoint, Hand bore', baseAmount: 3000 },
    ];
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">One-time Fees</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {staticFees.map(item => (
                                <TableRow key={item.description}><TableCell>{item.description}</TableCell><TableCell className="text-right font-mono">{item.amount.toLocaleString('en-IN')}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Yearly Registration Fees</CardTitle>
                    <CardDescription>Fees with a 5% yearly increment, rounded up to the nearest ₹10.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Label htmlFor="reg-year-select" className="shrink-0">Select Year:</Label>
                        <Select value={String(selectedRegYear)} onValueChange={(val) => setSelectedRegYear(Number(val))}>
                            <SelectTrigger id="reg-year-select" className="w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {registrationYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Fee for {selectedRegYear}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrationFeeItems.map(item => (
                                <TableRow key={item.description}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {calculateFeeForYear(item.baseAmount, item.baseYear, selectedRegYear).toLocaleString('en-IN')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Yearly Renewal Fees</CardTitle>
                    <CardDescription>Renewal fees with a 5% yearly increment, rounded up to the nearest ₹10.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Label htmlFor="renewal-num-select" className="shrink-0">Select Renewal:</Label>
                        <Select value={String(selectedRenewalNum)} onValueChange={(val) => setSelectedRenewalNum(Number(val))}>
                            <SelectTrigger id="renewal-num-select" className="w-[180px]">
                                <SelectValue placeholder="Select Renewal No." />
                            </SelectTrigger>
                            <SelectContent>
                                {renewalNumbers.map(num => <SelectItem key={num} value={String(num)}>{num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Renewal</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Fee for Renewal #{selectedRenewalNum}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renewalFeeItems.map(item => (
                                 <TableRow key={item.description}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {calculateRenewalFee(item.baseAmount, selectedRenewalNum).toLocaleString('en-IN')}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default function GwdRatesPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('GWD Rates', 'A master list of all standard items and their approved rates used by the department.');
  }, [setHeader]);

  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [rateItems, setRateItems] = useState<GwdRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [isFeeDetailsOpen, setIsFeeDetailsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GwdRateItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GwdRateItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const [itemToReorder, setItemToReorder] = useState<GwdRateItem | null>(null);

  const canManage = user?.role === 'editor';

  // Define the Zod schema for the reorder form inside the component
  const reorderFormSchema = z.object({
    newPosition: z.coerce
      .number({ invalid_type_error: "Please enter a valid number." })
      .int("Position must be a whole number.")
      .min(1, "Position cannot be less than 1.")
      .max(rateItems.length, `Position cannot be greater than ${rateItems.length}.`),
  });
  type ReorderFormData = z.infer<typeof reorderFormSchema>;

  const reorderForm = useForm<ReorderFormData>({
    resolver: zodResolver(reorderFormSchema),
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const itemsQuery = query(collection(db, RATES_COLLECTION));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const items = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();
        return {
          id: doc.id,
          itemName: data.itemName || "",
          rate: data.rate ?? 0,
          order: data.order, // Can be undefined
          createdAt,
          updatedAt,
        } as GwdRateItem;
      });

      items.sort((a, b) => {
        const orderA = a.order ?? Infinity;
        const orderB = b.order ?? Infinity;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
      });
      
      const finalItems = items.map((item, index) => ({...item, order: item.order ?? index}));
      setRateItems(finalItems);
      
    } catch (error: any) {
      console.error("Firestore Error (GWD Rates): ", error);
      if (error.code === 'resource-exhausted') {
        toast({ title: "Quota Exceeded", description: "The database has reached its usage limit for today. Please try again later.", variant: "destructive", duration: 9000 });
      } else {
        toast({ title: "Error Loading Data", description: "Could not load rate data. Check permissions or data integrity.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading, fetchData]);

  const handleReorderItem = async (itemId: string, newPosition: number) => {
    if (!canManage || isMoving) return;

    const oldIndex = rateItems.findIndex(item => item.id === itemId);
    if (oldIndex === -1) {
      toast({ title: "Error", description: "Item to move was not found.", variant: "destructive" });
      return;
    }

    const newIndex = newPosition - 1; // Convert 1-based user input to 0-based index

    if (newIndex < 0 || newIndex >= rateItems.length) {
      toast({ title: "Error", description: "The new position is outside the valid range.", variant: "destructive" });
      return;
    }

    setIsMoving(true);

    const reorderedItems = Array.from(rateItems);
    const [movedItem] = reorderedItems.splice(oldIndex, 1);
    reorderedItems.splice(newIndex, 0, movedItem);

    try {
      const batch = writeBatch(db);
      reorderedItems.forEach((item, index) => {
        const docRef = doc(db, RATES_COLLECTION, item.id);
        batch.update(docRef, { order: index });
      });
      await batch.commit();
      
      toast({ title: "Item Moved", description: "The item order has been successfully updated." });
      await fetchData(); // Refresh data from server to ensure correct order is displayed
    } catch (error: any)
    {
      console.error("Item reorder error:", error);
      toast({ title: "Error", description: error.message || "Could not reorder the items.", variant: "destructive" });
      await fetchData(); // Refresh data to revert to last known good state
    } finally {
      setIsMoving(false);
    }
  };


  const itemForm = useForm<GwdRateItemFormData>({ resolver: zodResolver(GwdRateItemFormDataSchema) });
  
  const handleOpenReorderDialog = (item: GwdRateItem) => {
    if (!canManage) return;
    const currentPosition = rateItems.findIndex(i => i.id === item.id) + 1;
    setItemToReorder(item);
    reorderForm.reset({ newPosition: currentPosition });
    setIsReorderDialogOpen(true);
  };
  
  const onReorderSubmit: SubmitHandler<ReorderFormData> = async (data) => {
    if (!itemToReorder) return;
    await handleReorderItem(itemToReorder.id, data.newPosition);
    setIsReorderDialogOpen(false);
    setItemToReorder(null);
  };

  const handleOpenItemForm = (item: GwdRateItem | null) => {
    if (!canManage) return;
    setEditingItem(item);
    itemForm.reset(item ? { itemName: item.itemName, rate: item.rate } : { itemName: "", rate: undefined });
    setIsItemFormOpen(true);
  };

  const onItemFormSubmit = async (data: GwdRateItemFormData) => {
    if (!canManage) {
        toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        itemName: data.itemName,
        rate: Number(data.rate),
      };

      if (editingItem) {
        const itemDocRef = doc(db, RATES_COLLECTION, editingItem.id);
        await updateDoc(itemDocRef, { ...payload, updatedAt: serverTimestamp() });
        toast({ title: "Item Updated", description: "The rate item has been successfully updated." });
      } else {
        const newOrder = rateItems.length > 0 ? Math.max(...rateItems.map(item => item.order ?? -1)) + 1 : 0;
        await addDoc(collection(db, RATES_COLLECTION), { ...payload, order: newOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: "Item Added", description: "The new rate item has been added." });
      }
      setIsItemFormOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (error: any) {
      console.error("Item form submission error:", error);
      toast({ title: "Error", description: error.message || "Could not save the item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!canManage || !itemToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, RATES_COLLECTION, itemToDelete.id));
      toast({ title: "Item Deleted", description: `"${itemToDelete.itemName}" has been removed.` });
      setItemToDelete(null);
      await fetchData();
    } catch (error: any) {
      console.error("Item deletion error:", error);
      toast({ title: "Error", description: error.message || "Could not delete the item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleExportExcel = async () => {
    if (rateItems.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GWD_Rates");

    worksheet.addRow(["Ground Water Department, Kollam"]).commit();
    worksheet.addRow(["GWD Rates Report"]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit();

    worksheet.mergeCells('A1:C1');
    worksheet.mergeCells('A2:C2');
    worksheet.mergeCells('A3:C3');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };

    const headerRow = worksheet.addRow(["Sl. No.", "Name of Item", "Rate (₹)"]);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
    });

    rateItems.forEach((item, index) => {
      worksheet.addRow([index + 1, item.itemName, item.rate]);
    });

    worksheet.columns = [
      { header: 'Sl. No.', key: 'slNo', width: 10 },
      { header: 'Name of Item', key: 'itemName', width: 50 },
      { header: 'Rate (₹)', key: 'rate', width: 20, style: { numFmt: '"₹"#,##0.00' } },
    ];
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gwd_rates_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Excel Exported", description: `Report downloaded.` });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user?.isApproved) {
    return (
       <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4">
                <Button variant="outline" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
                <Button variant="outline" onClick={() => setIsFeeDetailsOpen(true)}><ClipboardList className="mr-2 h-4 w-4" /> Rig Registration Fee Details</Button>
                {canManage && <Button onClick={() => handleOpenItemForm(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>}
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] h-auto py-3 px-4">Sl. No.</TableHead>
                  <TableHead className="h-auto py-3 px-4">Name of Item</TableHead>
                  <TableHead className="text-right h-auto py-3 px-4">Rate (₹)</TableHead>
                  <TableHead className="w-[140px] text-center h-auto py-3 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateItems.length > 0 ? rateItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-2 px-4">{index + 1}</TableCell>
                    <TableCell className="font-medium py-2 px-4">{item.itemName}</TableCell>
                    <TableCell className="text-right py-2 px-4">{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-center py-2 px-4">
                      {canManage ? (
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenItemForm(item)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenReorderDialog(item)} disabled={isMoving}><ArrowUpDown className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItemToDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View Only</span>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">No items found. {canManage && "Add one to get started."}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemFormSubmit)} className="space-y-4 py-4">
              <FormField name="itemName" control={itemForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of Item</FormLabel>
                  <FormControl><Input placeholder="e.g., BWC 110mm" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="rate" control={itemForm.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate (₹)</FormLabel>
                  <FormControl><Input
                    type="number"
                    placeholder="0.00"
                    {...field}
                    onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                    value={field.value ?? ''}
                  /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsItemFormOpen(false)} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the item "{itemToDelete?.itemName}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isReorderDialogOpen} onOpenChange={setIsReorderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Item</DialogTitle>
            <DialogDescription>
              Move "{itemToReorder?.itemName}" to a new position.
            </DialogDescription>
          </DialogHeader>
          <Form {...reorderForm}>
            <form onSubmit={reorderForm.handleSubmit(onReorderSubmit)} className="space-y-4 py-4">
              <FormField
                control={reorderForm.control}
                name="newPosition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Serial Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max={rateItems.length}
                        placeholder={`Enter a number from 1 to ${rateItems.length}`}
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      The list will be re-arranged accordingly.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsReorderDialogOpen(false)} disabled={isMoving}>
                  <X className="mr-2 h-4 w-4" />Cancel
                </Button>
                <Button type="submit" disabled={isMoving}>
                  {isMoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUpDown className="mr-2 h-4 w-4" />}
                  Move
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isFeeDetailsOpen} onOpenChange={setIsFeeDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Rig Registration Fee Details</DialogTitle>
            <DialogDescription>A detailed breakdown of all fees associated with rig registration and renewals.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-1">
            <RigFeeDetailsDialog />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
