// src/components/e-tender/pdf/generators/dateExtensionCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum } from '@/lib/schemas/eTenderSchema';

export async function generateDateExtensionCorrigendum(tender: E_tender, corrigendum: Corrigendum): Promise<Uint8Array> {
    const templatePath = '/CORRIGENDUM – DATE EXTENSION.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const form = pdfDoc.getForm();

    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, true);
    const newLastDate = formatDateSafe(corrigendum.lastDateOfReceipt, true, true);
    const newOpeningDate = formatDateSafe(corrigendum.dateOfOpeningTender, true, false, true);
    
    const reasonText = corrigendum.reason || `The time period for submitting e-tenders expired on ${lastDate}, and only one valid bid was received for the above work. Consequently, the deadline for submitting e-tenders has been extended to ${newLastDate}, and the opening of the tender has been rescheduled to ${newOpeningDate}.`;

    const fieldMappings: Record<string, any> = {
        'e_tender_no': tender.eTenderNo,
        'file_no': `GKT/${tender.fileNo || ''}`,
        'corrigendum_date': formatDateSafe(corrigendum.corrigendumDate),
        'name_of_work': tender.nameOfWork,
        'date-ext': reasonText,
        'new_last_date': newLastDate,
        'new_opening_date': newOpeningDate,
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const textField = form.getTextField(fieldName);
            textField.setText(String(value || ''));
            if (fieldName === 'date-ext') {
                textField.setAlignment(TextAlignment.Justify);
            }
            textField.updateAppearances(timesRomanFont);
        } catch (e) {
            console.warn(`Could not fill field ${fieldName}:`, e);
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
