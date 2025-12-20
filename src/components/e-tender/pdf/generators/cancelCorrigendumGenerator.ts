// src/components/e-tender/pdf/generators/cancelCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum, StaffMember } from '@/lib/schemas';
import { getAttachedFilesString } from './utils';

export async function generateCancelCorrigendum(tender: E_tender, corrigendum: Corrigendum, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Corrigendum-Cancel.pdf';
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
    
    const defaultReason = "the said work has been allotted to the Departmental Rig for execution";
    const reason = corrigendum.reason || defaultReason;

    const reasonText = `     The tender invited for the above work is hereby cancelled, as ${reason}. Hence, further processing of the tender is not required. Any bids received in response to this tender shall be treated as withdrawn, and no further correspondence in this regard will be entertained. It is also noted that the tender for this work was published mistakenly, and the same stands cancelled accordingly.`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': `Dated ${formatDateSafe(tender.tenderDate)}`,
        'name_of_work': tender.nameOfWork,
        'cancel': reasonText,
        'date': formatDateSafe(corrigendum.corrigendumDate),
    };

    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'name_of_work'];
    const justifyFields = ['name_of_work', 'cancel'];

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const textField = form.getTextField(fieldName);
            const isBold = boldFields.includes(fieldName);
            textField.setText(String(value || ''));
            if (justifyFields.includes(fieldName)) {
                textField.setAlignment(TextAlignment.Left);
            }
            if (fieldName === 'cancel') {
                textField.setFontSize(10);
            }
            textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
        } catch (e) {
            console.warn(`Could not fill field ${fieldName}:`, e);
        }
    });

    form.flatten();
    
    // Add Attached Files line
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

    return await pdfDoc.save();
}
