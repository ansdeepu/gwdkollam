// src/components/e-tender/pdf/generators/workAgreementGenerator.ts
import { PDFDocument, StandardFonts, TextAlignment, rgb, PageSizes } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import { format } from 'date-fns';
import { numberToWords } from './utils';


// Helper function to convert cm to points (1 cm = 28.3465 points)
const cm = (cmValue: number) => cmValue * 28.3465;

export async function generateWorkAgreement(tender: E_tender): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const l1Bidder = (tender.bidders || []).find(b => b.status === 'Accepted') || 
                     ((tender.bidders || []).length > 0 ? (tender.bidders || []).reduce((prev, curr) => (prev.quotedAmount ?? Infinity) < (curr.quotedAmount ?? Infinity) ? prev : curr, {} as any) : null);

    // Format the date
    let agreementDateFormatted = '__________';
    let agreementDateForHeading = '__________';
    if (tender.agreementDate) {
        const d = new Date(tender.agreementDate);
        if (!isNaN(d.getTime())) {
            agreementDateFormatted = format(d, 'dd MMMM yyyy');
            agreementDateForHeading = format(d, 'dd/MM/yyyy');
        }
    }

    const fileNo = tender.fileNo || '__________';
    const eTenderNo = tender.eTenderNo || '__________';
    const bidderDetails = (l1Bidder && l1Bidder.name) ? `${l1Bidder.name}, ${l1Bidder.address || ''}` : '____________________';
    const workName = tender.nameOfWork || '____________________';
    const completionPeriod = tender.periodOfCompletion || '___';

    // 1. Draw the heading 17cm from the top
    const headingTopMargin = cm(17); // 17cm in points
    const headingY = height - headingTopMargin;
    const headingText = `AGREEMENT NO. GKT/${fileNo} / ${eTenderNo} DATED ${agreementDateForHeading}`;
    
    page.drawText(headingText, {
        x: width / 2,
        y: headingY,
        font: timesRomanBoldFont,
        size: 12,
        color: rgb(0, 0, 0),
        textAlign: TextAlignment.Center,
    });
    
    // 2. Draw the main agreement paragraph below the heading
    const paragraphTopMargin = cm(1);
    const paragraphY = headingY - paragraphTopMargin;
    const leftMargin = cm(1.5);
    const rightMargin = cm(1.5);
    const paragraphWidth = width - leftMargin - rightMargin;
    const indent = "     "; // 5 spaces for indentation

    const paragraphText = `${indent}Agreement executed on ${agreementDateFormatted} between the District Officer, Groundwater Department, Kollam, for and on behalf of the Governor of Kerala, on the first part, and ${bidderDetails}, on the other part, for the ${workName}. The second party agrees to execute the work at the sanctioned rate as per the approved tender schedule and to complete the same within ${completionPeriod} days from the date of receipt of the work order, in accordance with the contract conditions approved by the District Officer, Groundwater Department, Kollam.`;

    page.drawText(paragraphText, {
        x: leftMargin,
        y: paragraphY,
        font: timesRomanFont,
        size: 12,
        lineHeight: 15,
        textAlign: TextAlignment.Justify,
        maxWidth: paragraphWidth,
        color: rgb(0, 0, 0),
    });

    // 3. Draw the witness text
    // This is an approximation. A more robust solution would calculate the exact height.
    const approximateLines = Math.ceil(timesRomanFont.widthOfTextAtSize(paragraphText, 12) / paragraphWidth) + (paragraphText.split('\n').length -1);
    const paragraphHeight = approximateLines * 15; // lines * lineHeight
    const witnessY = paragraphY - paragraphHeight - cm(1); // 1cm below paragraph
    
    const witnessText = "Signed and delivered by the above mentioned in the presence of witness\n1.\n2.";
    page.drawText(witnessText, {
      x: leftMargin,
      y: witnessY,
      font: timesRomanFont,
      size: 12,
      lineHeight: 18,
      textAlign: TextAlignment.Left,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
}