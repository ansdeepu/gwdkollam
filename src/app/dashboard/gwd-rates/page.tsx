// src/app/dashboard/gwd-rates/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ClipboardList,
  Upload,
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocs, query, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { GwdRateItemFormDataSchema, type GwdRateItem, type GwdRateItemFormData } from "@/lib/schemas";
import { z } from 'zod';
import { usePageHeader } from "@/hooks/usePageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDataStore, type RateDescriptionId } from "@/hooks/use-data-store";
import { useRouter } from "next/navigation";


export const dynamic = 'force-dynamic';

const db = getFirestore(app);
const RATES_COLLECTION = 'gwdRates';
const RATE_DESCRIPTIONS_COLLECTION = 'rateDescriptions';

const calculateFeeForYear = (baseAmount: number, baseYear: number, targetYear: number) => {
    let fee = baseAmount;
    const roundUpToNearest10 = (num: number) => Math.ceil(num / 10) * 10;

    for (let i = baseYear; i < targetYear; i++) {
        fee = roundUpToNearest10(fee * 1.05);
    }
    return fee;
};

const calculateRenewalFee = (baseAmount: number, renewalNum: number) => {
    let fee = baseAmount;
    const roundUpToNearest10 = (num: number) => Math.ceil(num / 10) * 10;
    
    for (let i = 1; i < renewalNum; i++) {
        fee = roundUpToNearest10(fee * 1.05);
    }
    return fee;
};


// Fee Details Dialog Component
const RigFeeDetailsContent = () => {
    const currentYear = new Date().getFullYear();
    const [selectedRegYear, setSelectedRegYear] = useState<number>(currentYear);
    const [selectedRenewalNum, setSelectedRenewalNum] = useState<number>(1);

    const registrationYears = Array.from({ length: 28 }, (_, i) => 2023 + i); // 2023 to 2050
    const renewalNumbers = Array.from({ length: 30 }, (_, i) => i + 1);
    
    const staticFees = [
        { description: 'Application Fee - Agency Registration', amount: 1000 },
        { description: 'Application Fee - Rig Registration', amount: 1000 },
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
        <div className="space-y-8 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">One-time Fees</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staticFees.map(item => (
                                    <TableRow key={item.description}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right font-mono">{item.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
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
                    <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
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
                    </div>
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
                     <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function GwdRatesPage() {
  const { setHeader } = usePageHeader();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { allRateDescriptions, refetchRateDescriptions } = useDataStore();
  const router = useRouter();


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
  
  const [editingRate, setEditingRate] = useState<{id: RateDescriptionId, title: string} | null>(null);

  useEffect(() => {
    setHeader('GWD Rates', 'A master list of all standard items and their approved rates used by the department.');
  }, [setHeader]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const itemsQuery = query(collection(db, RATES_COLLECTION), orderBy("order"));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const items = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();
        return {
          id: doc.id,
          itemName: data.itemName || "",
          rate: data.rate ?? 0,
          order: data.order,
          createdAt,
          updatedAt,
        } as GwdRateItem;
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
  
  const handleReorderItem = async ({ newPosition }: { newPosition: number }) => {
      if (!itemToReorder) return;
      setIsMoving(true);

      try {
          const ratesSnapshot = await getDocs(query(collection(db, RATES_COLLECTION), orderBy("order")));
          let currentItems: GwdRateItem[] = ratesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as GwdRateItem));
          
          const itemToMoveIndex = currentItems.findIndex(i => i.id === itemToReorder.id);
          if (itemToMoveIndex === -1) throw new Error("Item to move not found.");

          const [itemToMove] = currentItems.splice(itemToMoveIndex, 1);
          currentItems.splice(newPosition - 1, 0, itemToMove);

          const batch = writeBatch(db);
          currentItems.forEach((item, index) => {
              const docRef = doc(db, RATES_COLLECTION, item.id);
              batch.set(docRef, { order: index }, { merge: true });
          });

          await batch.commit();
          toast({ title: 'Item Moved', description: `${itemToReorder.itemName} moved to position ${newPosition}.` });
          await fetchData();
      } catch (error: any) {
          console.error("Reordering failed:", error);
          toast({ title: 'Error', description: `Could not move item: ${error.message}`, variant: 'destructive' });
      } finally {
          setIsMoving(false);
          setItemToReorder(null);
          setIsReorderDialogOpen(false);
      }
  };


  const itemForm = useForm<GwdRateItemFormData>({ resolver: zodResolver(GwdRateItemFormDataSchema) });
  
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

  const handleOpenReorderDialog = (item: GwdRateItem) => {
    if (!canManage) return;
    const currentPosition = rateItems.findIndex(i => i.id === item.id) + 1;
    setItemToReorder(item);
    reorderForm.reset({ newPosition: currentPosition });
    setIsReorderDialogOpen(true);
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

  const handleOpenRateDescriptionEditor = (id: RateDescriptionId, title: string) => {
    if (!canManage) return;
    setEditingRate({ id, title });
  };
  
  const handleSaveRateDescription = async (newDescription: string) => {
    if (!editingRate || !canManage) return;

    setIsSubmitting(true);
    try {
        const docRef = doc(db, RATE_DESCRIPTIONS_COLLECTION, editingRate.id);
        await setDoc(docRef, { description: newDescription, updatedAt: serverTimestamp() }, { merge: true });
        refetchRateDescriptions();
        toast({ title: `${editingRate.title} Updated`, description: 'The description has been saved.' });
    } catch (error: any) {
        console.error("Error saving rate description:", error);
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setEditingRate(null);
        setIsSubmitting(false);
    }
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
       <Card className="rounded-lg">
        <CardContent className="p-4">
          <Tabs defaultValue="gwdRates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gwdRates">GWD Rates</TabsTrigger>
              <TabsTrigger value="rigRegFees">Rig Registration Fee Details</TabsTrigger>
              <TabsTrigger value="eTenderRates">e-Tender Rates</TabsTrigger>
            </TabsList>
            <TabsContent value="gwdRates" className="mt-4">
               <Card>
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Master Rate List</CardTitle>
                        {canManage && <Button size="sm" onClick={() => handleOpenItemForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Add New Item</Button>}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="max-h-[60vh] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
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
            </TabsContent>
            <TabsContent value="rigRegFees">
              <RigFeeDetailsContent />
            </TabsContent>
            <TabsContent value="eTenderRates">
               <div className="grid grid-cols-1 gap-6 mt-6">
                <RateDescriptionCard
                    title="Tender Fee"
                    description={allRateDescriptions.tenderFee}
                    onEditClick={canManage ? () => handleOpenRateDescriptionEditor('tenderFee', "Tender Fee") : undefined}
                />
                <RateDescriptionCard
                    title="Earnest Money Deposit (EMD)"
                    description={allRateDescriptions.emd}
                    onEditClick={canManage ? () => handleOpenRateDescriptionEditor('emd', "Earnest Money Deposit (EMD)") : undefined}
                />
                <RateDescriptionCard
                    title="Performance Guarantee"
                    description={allRateDescriptions.performanceGuarantee}
                    onEditClick={canManage ? () => handleOpenRateDescriptionEditor('performanceGuarantee', "Performance Guarantee") : undefined}
                />
                <RateDescriptionCard
                    title="Additional Performance Guarantee"
                    description={allRateDescriptions.additionalPerformanceGuarantee}
                    onEditClick={canManage ? () => handleOpenRateDescriptionEditor('additionalPerformanceGuarantee', "Additional Performance Guarantee") : undefined}
                />
                <RateDescriptionCard
                    title="Stamp Paper"
                    description={allRateDescriptions.stampPaper}
                    onEditClick={canManage ? () => handleOpenRateDescriptionEditor('stampPaper', "Stamp Paper") : undefined}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onItemFormSubmit)} className="space-y-4">
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
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsItemFormOpen(false)} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
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
            <form onSubmit={reorderForm.handleSubmit(handleReorderItem)} className="space-y-4 py-4">
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
      
      {editingRate && (
        <EditRateDescriptionDialog
            isOpen={!!editingRate}
            onClose={() => setEditingRate(null)}
            title={editingRate.title}
            initialDescription={allRateDescriptions[editingRate.id]}
            onSave={handleSaveRateDescription}
            isSaving={isSubmitting}
        />
      )}
    </div>
  );
}

// New component for the rate description card
const RateDescriptionCard = ({ title, description, onEditClick }: { title: string; description: string; onEditClick?: () => void }) => (
    <div className="border rounded-lg p-4 bg-background">
        <div className="flex flex-row items-start justify-between mb-2">
            <h4 className="text-lg font-semibold text-foreground">{title}</h4>
            {onEditClick && <Button variant="outline" size="sm" onClick={onEditClick}><Edit className="mr-2 h-4 w-4"/>Update Rate</Button>}
        </div>
        <div className="border-t pt-3">
             <p className="text-sm text-muted-foreground whitespace-pre-wrap" style={{ textAlign: 'justify' }}>{description || "No description provided."}</p>
        </div>
    </div>
);

// New component for the edit description dialog
const EditRateDescriptionDialog = ({ isOpen, onClose, title, initialDescription, onSave, isSaving }: { isOpen: boolean; onClose: () => void; title: string; initialDescription: string; onSave: (newDescription: string) => void, isSaving: boolean }) => {
    const [description, setDescription] = useState(initialDescription);
    
    const handleSave = () => {
        onSave(description);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Edit Rate Description: {title}</DialogTitle>
                </DialogHeader>
                <div className="px-6 space-y-4">
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={10}
                        placeholder="Enter the rate description..."
                    />
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Description
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
