// src/components/e-tender/pdf/generators/workAgreementGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment } from 'pdf-lib';
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
    const form = pdfDoc.getForm();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const l1Bidder = (tender.bidders || []).find(b => b.status === 'Accepted') || 
                     ((tender.bidders || []).length > 0 ? (tender.bidders || []).reduce((prev, curr) => (prev.quotedAmount ?? Infinity) < (curr.quotedAmount ?? Infinity) ? prev : curr, {} as any) : null);
    
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

    const agreementText = `     Agreement executed on ${agreementDateFormatted} between the District officer, Groundwater Department, Kollam, for and on behalf of the Governor of Kerala on the first part and ${bidderDetails} on the other part for the ${workName}. The second party agrees to execute the work in the sanctioned rate as per tender schedule and complete the same within ${completionPeriod} days from the date of receipt of work order and the contract approved by the District Officer, Groundwater Department, Kollam.`;
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'agreement_date'];

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || '__________'}`,
        'e_tender_no_header': tender.eTenderNo || '__________',
        'agreement_date': formatDateSafe(tender.agreementDate),
        'agreement': agreementText,
    };
    
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const field = form.getField(fieldName);
            if (field instanceof PDFTextField) {
                const isBold = boldFields.includes(fieldName);
                field.setText(String(value || ''));
                if (fieldName === 'agreement') {
                    field.setAlignment(TextAlignment.Justify);
                }
                field.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
            }
        } catch (e) {
            console.warn(`Could not fill field ${fieldName}:`, e);
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
