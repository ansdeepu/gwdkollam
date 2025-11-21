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
    const form = pdfDoc.getForm();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const firstPage = pdfDoc.getPages()[0];


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
    
    const agreementText = `     Agreement executed on ${agreementDateFormatted} between the District Officer, Groundwater Department, Kollam, for and on behalf of the Governor of Kerala, on the first part, and ${bidderDetails}, on the other part, for the ${workName}. The second party agrees to execute the work at the sanctioned rate as per the approved tender schedule and to complete the same within ${completionPeriod} days from the date of receipt of the work order, in accordance with the contract conditions approved by the District Officer, Groundwater Department, Kollam.`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || '__________'}`,
        'e_tender_no_header': tender.eTenderNo || '__________',
        'agreement_date': formatDateSafe(tender.agreementDate),
    };
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'agreement_date'];

    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const field = form.getField(fieldName);
            if (field instanceof PDFTextField) {
                const isBold = boldFields.includes(fieldName);
                field.setText(String(value || ''));
                field.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
            }
        } catch (e) {
            console.warn(`Could not fill field ${fieldName}:`, e);
        }
    });

    // Draw the main agreement text directly for justification
    firstPage.drawText(agreementText, {
      x: 72, // Left margin (1 inch)
      y: firstPage.getHeight() - 250, // Starting Y position from top
      font: timesRomanFont,
      size: 12,
      lineHeight: 15,
      textAlign: TextAlignment.Justify,
      maxWidth: firstPage.getWidth() - 144, // Page width - 2 inches of margin
      color: rgb(0, 0, 0),
    });

    form.flatten();
    return await pdfDoc.save();
}
