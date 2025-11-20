// src/components/e-tender/pdf/generators/dateExtensionCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum } from '@/lib/schemas/eTenderSchema';

export async function generateDateExtensionCorrigendum(tender: E_tender, corrigendum: Corrigendum): Promise<Uint8Array> {
    const templatePath = '/Corrigendum-DateExt.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const form = pdfDoc.getForm();
    
    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, true, false);
    const newLastDate = formatDateSafe(corrigendum.lastDateOfReceipt, true, true, false);
    const newOpeningDate = formatDateSafe(corrigendum.dateOfOpeningTender, true, false, true);
    
    const reasonText = corrigendum.reason || `The time period for submitting e-tenders expired on ${lastDate}, and only one valid bid was received for the above work. Consequently, the deadline for submitting e-tenders has been extended to ${newLastDate}, and the opening of the tender has been rescheduled to ${newOpeningDate}.`;

    const fieldMappings: Record<string, any> = {
        'File No': `GKT/${tender.fileNo || ''}`,
        'e-Tender No': tender.eTenderNo,
        'Date': formatDateSafe(corrigendum.corrigendumDate),
        'Name of Work': tender.nameOfWork,
        'Reason': reasonText,
        'Place': 'Kollam',
        'Date 2': formatDateSafe(corrigendum.corrigendumDate),
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const textField = form.getTextField(fieldName);
            textField.setText(String(value || ''));
            if (fieldName === 'Reason') {
                textField.setAlignment(TextAlignment.Justify);
            }
            textField.updateAppearances(timesRomanFont);
        } catch (e) {
            console.warn(`Could not fill field '${fieldName}':`, e);
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
