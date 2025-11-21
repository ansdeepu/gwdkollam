// src/components/e-tender/pdf/generators/retenderCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum } from '@/lib/schemas/eTenderSchema';

export async function generateRetenderCorrigendum(tender: E_tender, corrigendum: Corrigendum): Promise<Uint8Array> {
    const templatePath = '/Corrigendum-Retender.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();

    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, true, false);
    const reasonText = corrigendum.reason || `no bids were received`;

    const fullParagraph = `     The time period for submitting e-tenders expired at ${lastDate}, and ${reasonText}. Hence, it has been decided to retender the above work.`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': formatDateSafe(corrigendum.corrigendumDate),
        'name_of_work': tender.nameOfWork,
        'retender': fullParagraph,
        'new_last_date': formatDateSafe(corrigendum.lastDateOfReceipt, true, true, false),
        'new_opening_date': formatDateSafe(corrigendum.dateOfOpeningTender, true, false, true),
        'date_2': formatDateSafe(corrigendum.corrigendumDate),
    };
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header'];

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const textField = form.getTextField(fieldName);
            const isBold = boldFields.includes(fieldName);
            textField.setText(String(value || ''));
             if (fieldName === 'retender') {
                textField.setAlignment(TextAlignment.Justify);
            }
            textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
        } catch (e) {
            console.warn(`Could not fill field ${fieldName}:`, e);
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
