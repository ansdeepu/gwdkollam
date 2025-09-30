// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, Building, MapPin, University, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { usePageHeader } from '@/hooks/usePageHeader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const dynamic = 'force-dynamic';

const db = getFirestore(app);

interface SettingItem {
  id: string;
  name: string;
}

interface SettingsCollectionCardProps {
  collectionName: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const SettingsCollectionCard: React.FC<SettingsCollectionCardProps> = ({ collectionName, title, description, icon: Icon }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'editor';
  const { toast } = useToast();
  const [items, setItems] = useState<SettingItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SettingItem | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setItems(fetchedItems);
      setIsLoading(false);
    }, (error) => {
      console.error(`Error fetching ${collectionName}:`, error);
      toast({ title: `Error loading ${title}`, description: error.message, variant: 'destructive' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [collectionName, toast, title]);

  const handleAddItem = async () => {
    if (!newItemName.trim() || !canManage) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, collectionName), { name: newItemName.trim() });
      toast({ title: `${title} Added`, description: `"${newItemName.trim()}" has been added.` });
      setNewItemName('');
    } catch (error: any) {
      toast({ title: `Error adding ${title}`, description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete || !canManage) return;
    try {
        await deleteDoc(doc(db, collectionName, itemToDelete.id));
        toast({ title: `${title} Deleted`, description: `"${itemToDelete.name}" has been removed.` });
    } catch (error: any) {
        toast({ title: `Error deleting ${title}`, description: error.message, variant: 'destructive' });
    } finally {
        setItemToDelete(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {canManage && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder={`New ${title}...`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={isSubmitting}
            />
            <Button onClick={handleAddItem} disabled={isSubmitting || !newItemName.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              <span className="ml-2">Add</span>
            </Button>
          </div>
        )}
        <ScrollArea className="h-60 w-full rounded-md border">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <span className="text-sm font-medium">{item.name}</span>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setItemToDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">No items added yet.</p>
            )}
          </div>
        </ScrollArea>
        
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the item "<strong>{itemToDelete?.name}</strong>". This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};


export default function SettingsPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();

  useEffect(() => {
    setHeader('Application Settings', 'Manage dropdown options and other application-wide settings.');
  }, [setHeader]);
  
  if (user?.role !== 'editor' && user?.role !== 'viewer') {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <div className="space-y-6 p-6 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <SettingsCollectionCard 
        collectionName="officeAddresses" 
        title="Office Addresses" 
        description="Manage the list of office addresses."
        icon={Building} 
      />
      <SettingsCollectionCard 
        collectionName="localSelfGovernments" 
        title="Local Self Governments" 
        description="Manage the list of local self governments."
        icon={University} 
      />
      <SettingsCollectionCard 
        collectionName="constituencies" 
        title="Constituencies (LAC)" 
        description="Manage the list of legislative assembly constituencies."
        icon={MapPin} 
      />
    </div>
  );
}
