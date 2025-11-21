// src/components/e-tender/pdf/generators/workAgreementGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import { format } from 'date-fns';

export async function generateWorkAgreement(tender: E_tender): Promise<Uint8Array> {
    const templatePath = '/Agreement.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found at ${templatePath}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const form = pdfDoc.getForm();

    const l1Bidder = (tender.bidders || []).find(b => b.status === 'Accepted') || 
                     (tender.bidders || []).reduce((prev, curr) => (prev.quotedAmount ?? Infinity) < (curr.quotedAmount ?? Infinity) ? prev : curr, {} as any);
    
    let agreementDateFormatted = '__________';
    if (tender.agreementDate) {
        const d = new Date(tender.agreementDate);
        if (!isNaN(d.getTime())) {
            agreementDateFormatted = format(d, 'dd MMMM yyyy');
        }
    }

    const bidderDetails = (l1Bidder && l1Bidder.name) ? `${l1Bidder.name}, ${l1Bidder.address || ''}` : '____________________';
    const workName = tender.nameOfWork || '____________________';
    const completionPeriod = tender.periodOfCompletion || '___';

    const agreementText = `Agreement executed on ${agreementDateFormatted} between the District officer, Groundwater Department, Kollam, for and on behalf of the Governor of Kerala on the first part and ${bidderDetails} on the other part for the ${workName}. The second party agrees to execute the work in the sanctioned rate as per tender schedule and complete the same within ${completionPeriod} days from the date of receipt of work order and the contract approved by the District Officer, Groundwater Department, Kollam.`;
    
    // Fallback data mapping in case the robust logic fails
    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'agreement_date': formatDateSafe(tender.agreementDate),
        'agreement': agreementText,
    };

    const allFields = form.getFields();
    
    allFields.forEach(field => {
        if (field instanceof PDFTextField) {
            const fieldName = field.getName();
            const text = field.getText() || '';

            // Robustly fill based on placeholder content
            if (text.includes('GKT/')) {
                field.setText(`GKT/${tender.fileNo || ''}`);
            } else if (text.toLowerCase().includes('e-tender no')) {
                field.setText(tender.eTenderNo || '');
            } else if (text.toLowerCase().includes('agreement executed on')) {
                field.setText(agreementText);
                field.setAlignment(TextAlignment.Justify);
            } else if (text.includes('Dated:')) { // Assuming a simple date field placeholder
                 field.setText(formatDateSafe(tender.agreementDate));
            }
            // Fallback for explicitly named fields if the above fails
            else if (fieldName in fieldMappings) {
                 field.setText(String(fieldMappings[fieldName] || ''));
                 if (fieldName === 'agreement') {
                    field.setAlignment(TextAlignment.Justify);
                 }
            }
             field.updateAppearances(timesRomanFont);
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
