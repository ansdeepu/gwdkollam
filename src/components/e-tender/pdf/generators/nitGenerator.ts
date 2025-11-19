// src/components/e-tender/pdf/generators/nitGenerator.ts
import { PDFDocument, PDFTextField } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';

export async function generateNIT(tender: E_tender): Promise<Uint8Array> {
    const templatePath = '/NIT.pdf';
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

    const tenderFee = tender.tenderFormFee || 0;
    const gst = tenderFee * 0.18;
    const displayTenderFee = tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)` : 'N/A';

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'pac': tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
        'emd': tender.emd ? `Rs. ${tender.emd.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
        'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'opening_date': formatDateSafe(tender.dateTimeOfOpening, true, false, true),
        'bid_submission_fee': displayTenderFee,
        'location': tender.location,
        'period_of_completion': tender.periodOfCompletion,
    };
    
    const allFields = form.getFields();

    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
            try {
                const textField = form.getTextField(fieldName);
                textField.setText(String(fieldMappings[fieldName] || ''));
                textField.updateAppearances(anjaliFont);
            } catch(e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
