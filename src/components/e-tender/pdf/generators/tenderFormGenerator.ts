// src/components/e-tender/pdf/generators/tenderFormGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';

export async function generateTenderForm(tender: E_tender): Promise<Uint8Array> {
    const templatePath = '/Tender-Form.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const form = pdfDoc.getForm();
    
    const tenderFee = tender.tenderFormFee || 0;
    const gst = tenderFee * 0.18;
    const displayTenderFee = tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN')} + Rs. ${gst.toLocaleString('en-IN')} (GST)` : 'N/A';

    const fieldMappings: Record<string, any> = {
        'file_no': `GKT/${tender.fileNo || ''}`,
        'e_tender_no': tender.eTenderNo,
        'name_of_work': tender.nameOfWork,
        'pac': tender.estimateAmount ? `${tender.estimateAmount.toLocaleString('en-IN')}` : '',
        'pac_2': tender.estimateAmount ? `${tender.estimateAmount.toLocaleString('en-IN')}` : '',
        'emd': tender.emd ? `${tender.emd.toLocaleString('en-IN')}` : '',
        'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'opening_date': formatDateSafe(tender.dateTimeOfOpening, true, false, true),
        'bid_submission_fee': displayTenderFee,
        'location': tender.location,
        'last_date_receipt': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'sl_no_4': '4',
        'sl_no_22': '22',
        'rs_25500': '25,500',
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
            try {
                const textField = form.getTextField(fieldName);
                textField.setText(String(fieldMappings[fieldName] || ''));
                textField.updateAppearances(timesRomanFont);
            } catch (e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });
    
    form.flatten();
    return await pdfDoc.save();
}
