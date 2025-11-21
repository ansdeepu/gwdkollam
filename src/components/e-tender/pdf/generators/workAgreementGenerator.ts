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

    // Remove any existing fields to avoid overlap before drawing text manually
    const fieldNames = form.getFields().map(f => f.getName());
    fieldNames.forEach(fieldName => {
        try { form.removeField(form.getField(fieldName)); } catch (e) { /* Ignore errors */ }
    });

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Draw the main agreement paragraph at the top of the page
    firstPage.drawText(agreementText, {
        x: 72, // Left margin (1 inch)
        y: firstPage.getHeight() - 120, // Vertical position from top
        font: timesRomanFont,
        size: 12,
        lineHeight: 18,
        textAlign: TextAlignment.Justify,
        maxWidth: firstPage.getWidth() - 144, // Page width minus 2-inch margins
        color: rgb(0, 0, 0),
        wordBreaks: [' '],
    });

    // Construct and draw the AGREEMENT NO heading
    const headingText = `AGREEMENT NO. GKT/${tender.fileNo || '__________'} / ${tender.eTenderNo || '__________'}   DATED ${formatDateSafe(tender.agreementDate)}`;
    firstPage.drawText(headingText, {
        x: firstPage.getWidth() / 2, // Centered
        y: firstPage.getHeight() - 450, // Positioned below the main text
        font: timesRomanBoldFont,
        size: 12,
        color: rgb(0, 0, 0),
        textAlign: TextAlignment.Center,
    });
    
    // Draw signature lines at the bottom
    const contractorSignatureY = firstPage.getHeight() - 650;
    firstPage.drawText(`Signed and delivered by the contractor in the presence of witness`, {
        x: 72,
        y: contractorSignatureY,
        font: timesRomanFont,
        size: 12,
    });

    const officerSignatureY = firstPage.getHeight() - 650;
    firstPage.drawText(`For and on behalf of the Governor of Kerala\nDistrict Officer`, {
        x: firstPage.getWidth() - 250,
        y: officerSignatureY,
        font: timesRomanFont,
        size: 12,
        textAlign: TextAlignment.Center,
        lineHeight: 15,
    });

    // Flatten to make the drawn text part of the page content
    form.flatten();
    return await pdfDoc.save();
}
