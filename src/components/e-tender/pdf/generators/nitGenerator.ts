
// src/components/e-tender/pdf/generators/nitGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe, formatTenderNoForFilename } from '../../utils';
import type { StaffMember } from '@/lib/schemas';
import { getAttachedFilesString } from './utils';

export async function generateNIT(tender: E_tender, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/NIT.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0];
    
    const isRetender = tender.retenders && tender.retenders.some(
        r => r.lastDateOfReceipt === tender.dateTimeOfReceipt && r.dateOfOpeningTender === tender.dateTimeOfOpening
    );

    const tenderFee = tender.tenderFormFee || 0;
    const gst = tenderFee * 0.18;
    const displayTenderFee = tender.tenderFormFee ? `Rs. ${tenderFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} & Rs. ${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (GST 18%)` : 'N/A';
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header'];
    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
    const fileName = `aNIT${formattedTenderNo}.pdf`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': `${tender.eTenderNo || ''}${isRetender ? ' (Re-Tender)' : ''}`,
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
                const isBold = boldFields.includes(fieldName);
                
                if (fieldName === 'name_of_work') {
                    textField.setFontSize(14); // Set a larger font size
                }
                
                textField.setText(String(fieldMappings[fieldName] || ''));
                textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
            } catch(e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });

    // Manually draw the additional file numbers as there are no form fields for them.
    const additionalFileNos = [tender.fileNo2, tender.fileNo3, tender.fileNo4].filter(Boolean);
    if (additionalFileNos.length > 0) {
        const fileNoField = form.getTextField('file_no_header');
        const widgets = fileNoField.acroField.getWidgets();
        if (widgets.length > 0) {
            const { x, y, width, height } = widgets[0].getRectangle();
            let currentY = y - 12; // Start drawing below the first file number
            additionalFileNos.forEach(fn => {
                page.drawText(`GKT/${fn}`, {
                    x: x,
                    y: currentY,
                    font: timesRomanBoldFont,
                    size: 10,
                });
                currentY -= 12; // Move down for the next line
            });
        }
    }

    form.flatten();
    
    return await pdfDoc.save();
}
