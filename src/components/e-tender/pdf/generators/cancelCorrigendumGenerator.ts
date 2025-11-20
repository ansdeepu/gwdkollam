// src/components/e-tender/pdf/generators/cancelCorrigendumGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { Corrigendum } from '@/lib/schemas/eTenderSchema';

export async function generateCancelCorrigendum(tender: E_tender, corrigendum: Corrigendum): Promise<Uint8Array> {
    const templatePath = '/Corrigendum-Cancel.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const form = pdfDoc.getForm();

    const reasonText = corrigendum.reason || `The tender invited for the above work is hereby cancelled, as the said work has been allotted to the Departmental Rig for execution. Hence, further processing of the tender is not required. Any bids received in response to this tender shall be treated as withdrawn, and no further correspondence in this regard will be entertained. It is also noted that the tender for this work was published mistakenly, and the same stands cancelled accordingly.`;

    const fieldMappings: Record<string, any> = {
        'e_tender_no': tender.eTenderNo,
        'file_no': `GKT/${tender.fileNo || ''}`,
        'corrigendum_date': formatDateSafe(corrigendum.corrigendumDate),
        'name_of_work': tender.nameOfWork,
        'reason': reasonText,
    };

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const textField = form.getTextField(fieldName);
            textField.setText(String(value || ''));
            if (fieldName === 'reason') {
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
