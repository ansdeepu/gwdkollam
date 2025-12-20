// src/components/e-tender/pdf/generators/retenderCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum, StaffMember } from '@/lib/schemas';
import { getAttachedFilesString } from './utils';

export async function generateRetenderCorrigendum(tender: E_tender, corrigendum: Corrigendum, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Corrigendum-Retender.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();

    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, true, false);
    const reasonText = corrigendum.reason || `no bids were received`;

    const fullParagraph = `     The time period for submitting e-tenders expired on ${lastDate}, and ${reasonText}. Hence, it has been decided to retender the above work.`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': `Dated ${formatDateSafe(tender.tenderDate)}`,
        'name_of_work': tender.nameOfWork,
        'retender': fullParagraph,
        'new_last_date': formatDateSafe(corrigendum.lastDateOfReceipt, true, true, false),
        'new_opening_date': formatDateSafe(corrigendum.dateOfOpeningTender, true, false, true),
        'date': formatDateSafe(corrigendum.corrigendumDate),
        'date_2': formatDateSafe(corrigendum.corrigendumDate),
    };
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'name_of_work'];
    const justifyFields = ['name_of_work', 'retender'];

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const field = form.getField(fieldName);
            if (field instanceof PDFTextField) {
                const isBold = boldFields.includes(fieldName);
                field.setText(String(value || ''));
                 if (justifyFields.includes(fieldName)) {
                    field.setAlignment(TextAlignment.Left);
                }
                field.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
            }
        } catch (e) {
            // It's okay if a field doesn't exist, especially the fallback date fields
            if (!['date', 'date_2'].includes(fieldName)) {
                 console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });

    const attachedFilesText = getAttachedFilesString(tender);
    if (attachedFilesText) {
        page.drawText(attachedFilesText, {
            x: 56.7, // approx 2cm margin
            y: 56.7, // approx 2cm margin
            font: timesRomanFont,
            size: 10,
            color: rgb(0.3, 0.3, 0.3),
        });
    }

    form.flatten();

    return await pdfDoc.save();
}
