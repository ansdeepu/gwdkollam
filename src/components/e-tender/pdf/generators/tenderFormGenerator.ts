
// src/components/e-tender/pdf/generators/tenderFormGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe, formatTenderNoForFilename } from '../../utils';
import type { StaffMember } from '@/lib/schemas';
import { getAttachedFilesString } from './utils';

export async function generateTenderForm(tender: E_tender, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Tender-Form.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    
    const isRetender = tender.retenders && tender.retenders.some(
        r => r.lastDateOfReceipt === tender.dateTimeOfReceipt && r.dateOfOpeningTender === tender.dateTimeOfOpening
    );

    const tenderFee = tender.tenderFormFee || 0;
    const gst = tenderFee * 0.18;
    const displayTenderFee = tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN')} + Rs. ${gst.toLocaleString('en-IN')} (GST)` : 'N/A';
    
    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null) return '';
        return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
    const fileName = `bTenderForm${formattedTenderNo}.pdf`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': `${tender.eTenderNo || ''}${isRetender ? ' (Re-Tender)' : ''}`,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'file_no': `GKT/${tender.fileNo || ''}`,
        'e_tender_no': tender.eTenderNo,
        'tender_no_page_2': tender.eTenderNo,
        'date_page_2': formatDateSafe(tender.tenderDate),
        'tender_no_form_83': tender.eTenderNo,
        'date_form_83': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'pac': formatCurrency(tender.estimateAmount),
        'pac_2': formatCurrency(tender.estimateAmount),
        'emd': formatCurrency(tender.emd),
        'emd_2': formatCurrency(tender.emd),
        'last_date_submission': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'opening_date': formatDateSafe(tender.dateTimeOfOpening, true, false, true),
        'bid_submission_fee': displayTenderFee,
        'location': tender.location,
        'last_date_receipt': formatDateSafe(tender.dateTimeOfReceipt, true, true, false),
        'period_of_completion': tender.periodOfCompletion,
        'sl_no_4': '4',
        'sl_no_22': '22',
        'rs_25500': 'Rs. 25,500.00',
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
            try {
                const textField = form.getTextField(fieldName);
                let font = timesRomanFont;
                if (['tender_no_form_83', 'date_form_83'].includes(fieldName)) {
                    font = timesRomanBoldFont;
                }
                textField.setText(String(fieldMappings[fieldName] || ''));
                textField.updateAppearances(font);
            } catch (e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });
    
    form.flatten();
    
    return await pdfDoc.save();
}
