
// src/components/e-tender/TenderDetails.tsx
"use client";

import { useState } from 'react';
import { useTenderData } from './TenderDataContext';
import { useE_tenders } from '@/hooks/useE_tenders';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Building, GitBranch, FolderOpen, ScrollText, Loader2, Save } from 'lucide-react';
import BasicDetailsForm from './BasicDetailsForm';
// Other form imports will be added here
import { toast } from '@/hooks/use-toast';
import { BasicDetailsFormData } from '@/lib/schemas/eTenderSchema';
import { ScrollArea } from '../ui/scroll-area';

type ModalType = 'basic' | 'corrigendum' | 'opening' | 'workOrder' | null;

export default function TenderDetails() {
    const router = useRouter();
    const { tender, updateTender } = useTenderData();
    const { addTender, updateTender: saveTenderToDb } = useE_tenders();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async (data: any, type: ModalType) => {
        setIsSubmitting(true);
        try {
            const updatedData = { ...tender, ...data };
            updateTender(data); // Update local context state first for UI responsiveness

            if (tender.id === 'new') {
                const newTenderId = await addTender(updatedData);
                toast({ title: "Tender Created", description: "The new e-Tender has been saved." });
                router.replace(`/dashboard/e-tender/${newTenderId}`); // Replace URL to prevent re-creation on refresh
            } else {
                await saveTenderToDb(tender.id, data);
                toast({ title: `Tender Details Updated`, description: `The ${type} details have been saved.` });
            }
        } catch (error: any) {
            toast({ title: "Error Saving Tender", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setActiveModal(null);
        }
    };
    
    const handleFinalSave = async () => {
        if (tender.id === 'new') {
            toast({ title: "Save Required", description: "Please fill out and save 'Basic Details' first to create the tender before saving all changes.", variant: "default" });
            return;
        }
        setIsSubmitting(true);
        try {
            await saveTenderToDb(tender.id, tender);
            toast({ title: "All Changes Saved", description: "All tender details have been successfully updated." });
        } catch (error: any) {
            toast({ title: "Error Saving Changes", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>e-Tender Details</CardTitle>
                    <CardDescription>Fill out the sections below to generate all necessary tender documents.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="p-8 justify-start text-left h-auto" onClick={() => setActiveModal('basic')}>
                        <div className="flex items-center gap-4">
                            <Building className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-bold text-base">Basic Details</p>
                                <p className="text-sm text-muted-foreground">eTender No, Dates, Name of Work</p>
                            </div>
                        </div>
                    </Button>
                    <Button variant="outline" className="p-8 justify-start text-left h-auto" onClick={() => setActiveModal('corrigendum')}>
                        <div className="flex items-center gap-4">
                            <GitBranch className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-bold text-base">Corrigendum Details</p>
                                <p className="text-sm text-muted-foreground">Revised dates and bid info</p>
                            </div>
                        </div>
                    </Button>
                    <Button variant="outline" className="p-8 justify-start text-left h-auto" onClick={() => setActiveModal('opening')}>
                        <div className="flex items-center gap-4">
                            <FolderOpen className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-bold text-base">Tender Opening Details</p>
                                <p className="text-sm text-muted-foreground">Bidder info and committee members</p>
                            </div>
                        </div>
                    </Button>
                    <Button variant="outline" className="p-8 justify-start text-left h-auto" onClick={() => setActiveModal('workOrder')}>
                        <div className="flex items-center gap-4">
                            <ScrollText className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-bold text-base">Work / Supply Order Details</p>
                                <p className="text-sm text-muted-foreground">Agreement, Engineer, Supervisor</p>
                            </div>
                        </div>
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={activeModal === 'basic'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <ScrollArea>
                        <BasicDetailsForm 
                            initialData={tender} 
                            onSubmit={(data) => handleSave(data, 'basic')}
                            onCancel={() => setActiveModal(null)}
                            isSubmitting={isSubmitting}
                        />
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <Dialog open={activeModal === 'corrigendum'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <div className="flex-1 p-6">
                        <p>Corrigendum Details Form will go here.</p>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={activeModal === 'opening'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                     <div className="flex-1 p-6">
                        <p>Tender Opening Details Form will go here.</p>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={activeModal === 'workOrder'} onOpenChange={(isOpen) => !isOpen && setActiveModal(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
                     <div className="flex-1 p-6">
                        <p>Work/Supply Order Details Form will go here.</p>
                    </div>
                </DialogContent>
            </Dialog>

             <div className="flex justify-end pt-4">
                <Button onClick={handleFinalSave} disabled={isSubmitting || tender.id === 'new'}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>
        </div>
    );
}
