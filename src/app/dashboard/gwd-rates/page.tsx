
// src/app/dashboard/gwd-rates/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocs, query, writeBatch } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { GwdRateItemFormDataSchema, type GwdRateItem, type GwdRateItemFormData } from "@/lib/schemas";
import { z } from 'zod';
import { usePageHeader } from "@/hooks/usePageHeader";

const db = getFirestore(app);
const RATES_COLLECTION = 'gwdRates';

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
  
  const handleExportExcel = () => {
    const reportTitle = "GWD Rates Report";
    const columnLabels = ["Sl. No.", "Name of Item", "Rate (₹)"];
    const dataRows = rateItems.map((item, index) => [
      index + 1,
      item.itemName,
      item.rate,
    ]);
    const sheetName = "GWDRates";
    const fileNamePrefix = "gwd_rates_report";

    if (dataRows.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    const headerRows = [
      ["Ground Water Department, Kollam"],
      [reportTitle],
      [], // Blank row
      [`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
      [], // Blank row
    ];

    const numCols = columnLabels.length;
    const footerColIndex = numCols > 1 ? numCols - 2 : 0;
    const footerRowData = new Array(numCols).fill("");
    footerRowData[footerColIndex] = "District Officer";
    const footerRows = [[], footerRowData];
    
    const finalData = [...headerRows, columnLabels, ...dataRows, ...footerRows];
    
    XLSX.utils.sheet_add_aoa(ws, finalData, { cellStyles: false });
    
    const merges = [];
    for (let i = 0; i < headerRows.length; i++) {
        if (headerRows[i].length > 0 && headerRows[i][0]) {
             merges.push({ s: { r: i, c: 0 }, e: { r: i, c: numCols - 1 } });
        }
    }
    const footerRowIndex = finalData.length - 1;
    if (numCols > 1) {
        merges.push({ s: { r: footerRowIndex, c: footerColIndex }, e: { r: footerRowIndex, c: numCols - 1 } });
    }
    ws['!merges'] = merges;

    const colWidths = finalData[0].map((_, i) => ({
      wch: Math.max(...finalData.map(row => (row[i] ? String(row[i]).length : 0))) + 2
    }));
    ws['!cols'] = colWidths;

    for (let R = 0; R < finalData.length; R++) {
      ws['!rows'] = ws['!rows'] || [];
      ws['!rows'][R] = { hpt: 20 };
      for (let C = 0; C < numCols; C++) {
        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
        
        ws[cellRef].s = {
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: { 
            top: { style: "thin" }, bottom: { style: "thin" }, 
            left: { style: "thin" }, right: { style: "thin" } 
          }
        };

        if (R < 2) {
             ws[cellRef].s.font = { bold: true, sz: R === 0 ? 16 : 14 };
        } else if (R < headerRows.length -1) {
             ws[cellRef].s.font = { italic: true };
             ws[cellRef].s.alignment!.horizontal = "left";
        }
        
        const columnLabelsRowIndex = headerRows.length;
        if (R === columnLabelsRowIndex) {
            ws[cellRef].s.font = { bold: true };
            ws[cellRef].s.fill = { fgColor: { rgb: "F0F0F0" } };
        }
        
        if (R === footerRowIndex) {
          ws[cellRef].s.border = {};
          if (C >= footerColIndex) {
             ws[cellRef].s.font = { bold: true };
             ws[cellRef].s.alignment!.horizontal = "right";
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const uniqueFileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, uniqueFileName);
    toast({ title: "Excel Exported", description: `Report downloaded as ${uniqueFileName}.` });
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
    </div>
  );
}
