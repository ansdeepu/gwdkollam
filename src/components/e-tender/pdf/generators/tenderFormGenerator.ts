// src/components/e-tender/pdf/generators/tenderFormGenerator.ts
import { PDFDocument, PDFTextField } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';

export async function generateTenderForm(tender: E_tender): Promise<Uint8Array> {
    const templatePath = '/Tender-Form.pdf';
    const [existingPdfBytes, fontBytes] = await Promise.all([
        fetch(templatePath).then(res => {
            if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
            return res.arrayBuffer();
        }),
        fetch('/AnjaliOldLipi.ttf').then(res => {
            if (!res.ok) throw new Error('Font file not found: AnjaliOldLipi.ttf');
            return res.arrayBuffer();
        })
    ]);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const anjaliFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();

    const fieldMappings: Record<string, any> = {
        'file_no': `GKT/${tender.fileNo || ''}`,
        'e_tender_no': tender.eTenderNo,
        'name_of_work': tender.nameOfWork,
        'pac': tender.estimateAmount ? `${tender.estimateAmount.toLocaleString('en-IN')}` : '',
        'emd': tender.emd ? `${tender.emd.toLocaleString('en-IN')}` : '',
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
            try {
                const textField = form.getTextField(fieldName);
                textField.setText(String(fieldMappings[fieldName] || ''));
                textField.updateAppearances(anjaliFont);
            } catch (e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });
    
    form.flatten();
    return await pdfDoc.save();
}
