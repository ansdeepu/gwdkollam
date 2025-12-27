// src/components/e-tender/pdf/generators/workAgreementGenerator.ts
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { format, isValid } from 'date-fns';
import { formatTenderNoForFilename } from '../../utils';
import type { StaffMember } from '@/lib/schemas';
import { numberToWords, getAttachedFilesString } from './utils';

const cm = (cmValue: number) => cmValue * 28.3465;

export async function generateWorkAgreement(tender: E_tender, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const l1Bidder = (tender.bidders || []).find(b => b.status === 'Accepted') || 
                     ((tender.bidders || []).length > 0 ? (tender.bidders || []).reduce((prev, curr) => (prev.quotedAmount ?? Infinity) < (curr.quotedAmount ?? Infinity) ? prev : curr, {} as any) : null);

    let agreementDateFormatted = '__________';
    let agreementDateForHeading = '__________';
    if (tender.agreementDate) {
        try {
            const d = new Date(tender.agreementDate);
            if (!isNaN(d.getTime())) {
                agreementDateFormatted = format(d, 'dd MMMM yyyy');
                agreementDateForHeading = format(d, 'dd/MM/yyyy');
            }
        } catch (e) {
            console.warn("Could not parse agreement date:", tender.agreementDate);
        }
    }

    const fileNo = tender.fileNo || '__________';
    const eTenderNo = tender.eTenderNo || '__________';
    const bidderDetails = (l1Bidder && l1Bidder.name) ? `${l1Bidder.name}, ${l1Bidder.address || ''}` : '____________________';
    
    let workName = tender.nameOfWork || '____________________';
    if (workName.endsWith('.')) {
        workName = workName.slice(0, -1);
    }
    
    const completionPeriod = tender.periodOfCompletion || '___';
    const leftMargin = cm(2.5);
    const rightMargin = cm(2.5);
    const paragraphWidth = width - leftMargin - rightMargin;
    const headingFontSize = 12;
    const regularFontSize = 12;
    const paragraphLineHeight = 14;

    // 1. Draw the heading at exactly 17cm from the top
    let currentY = height - cm(17);
    const headingText = `AGREEMENT NO. GKT/${fileNo}/${eTenderNo} DATED ${agreementDateForHeading}`;
    const headingTextWidth = timesRomanBoldFont.widthOfTextAtSize(headingText, headingFontSize);
    const headingX = (width - headingTextWidth) / 2; // Center alignment
    
    page.drawText(headingText, {
        x: headingX,
        y: currentY,
        font: timesRomanBoldFont,
        size: headingFontSize,
        color: rgb(0, 0, 0),
    });
    
    const textWidth = timesRomanBoldFont.widthOfTextAtSize(headingText, headingFontSize);
    page.drawLine({
        start: { x: headingX, y: currentY - 2 },
        end: { x: headingX + textWidth, y: currentY - 2 },
        thickness: 1,
        color: rgb(0, 0, 0),
    });

    // 2. Draw the main agreement paragraph below the heading
    currentY -= (2 * paragraphLineHeight); // Two lines of space after heading
    const paragraphIndent = "     ";
    const paragraphText = `Agreement executed on ${agreementDateFormatted} between the District Officer, Groundwater Department, Kollam, for and on behalf of the Governor of Kerala, on the first part, and ${bidderDetails}, on the other part, for the ${workName}. The second party agrees to execute the work at the sanctioned rate as per the approved tender schedule and to complete the same within ${completionPeriod} days from the date of receipt of the work order, in accordance with the contract conditions approved by the District Officer, Groundwater Department, Kollam.`;

    const words = paragraphText.split(' ');
    const lines = [];
    let currentLine = paragraphIndent; // Start the first line with an indent

    for (const word of words) {
        const testLine = currentLine === paragraphIndent ? `${currentLine}${word}` : `${currentLine} ${word}`;
        const testWidth = timesRomanFont.widthOfTextAtSize(testLine, regularFontSize);

        if (testWidth <= paragraphWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    lines.forEach((line) => {
        page.drawText(line, {
            x: leftMargin,
            y: currentY,
            font: timesRomanFont,
            size: regularFontSize,
            maxWidth: paragraphWidth,
            color: rgb(0, 0, 0),
        });
        currentY -= paragraphLineHeight;
    });

    // 3. Draw the witness text
    currentY -= (2 * paragraphLineHeight); // 2 line spaces

    const witnessText = "Signed and delivered by the above mentioned in the presence of witness\n\n1.\n\n2.";
    page.drawText(witnessText, {
      x: leftMargin,
      y: currentY,
      font: timesRomanFont,
      size: regularFontSize,
      lineHeight: paragraphLineHeight,
      color: rgb(0, 0, 0),
    });
    
    const signatureText = "District Officer";
    const signatureWidth = timesRomanBoldFont.widthOfTextAtSize(signatureText, regularFontSize);
    const signatureX = width - rightMargin - signatureWidth;
    
    page.drawText(signatureText, {
        x: signatureX,
        y: currentY,
        font: timesRomanBoldFont,
        size: regularFontSize,
        color: rgb(0, 0, 0),
    });


    // 4. No attached files text for this document.

    return await pdfDoc.save();
}
