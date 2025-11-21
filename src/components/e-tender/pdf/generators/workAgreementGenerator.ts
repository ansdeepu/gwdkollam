// src/components/e-tender/pdf/generators/workAgreementGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb, LineCap, CharCode } from 'pdf-lib';
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
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();

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
    
    // Header
    firstPage.drawText(`File No. GKT/${tender.fileNo || '__________'}`, { x: 72, y: height - 72, font: timesRomanFont, size: 12 });
    firstPage.drawText(`e-Tender No. ${tender.eTenderNo || '__________'}`, { x: 72, y: height - 88, font: timesRomanFont, size: 12 });
    
    // Agreement Date
    firstPage.drawText(`Dated: ${formatDateSafe(tender.agreementDate)}`, { x: width - 150, y: height - 104, font: timesRomanFont, size: 12 });

    // Main Agreement Text - Justified
    const textWidth = width - 72 - 72; // Page width minus margins
    const fontSize = 12;
    const lines = [];
    const words = agreementText.split(' ');
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
        const currentWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);
        if (currentWidth < textWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);

    let yPosition = height - 150;
    const lineHeight = fontSize * 1.5;

    lines.forEach((line, index) => {
        const lineWidth = timesRomanFont.widthOfTextAtSize(line, fontSize);
        const isLastLine = index === lines.length - 1;
        
        if (!isLastLine) { // Justify all lines except the last one
            const wordsInLine = line.split(' ');
            if (wordsInLine.length > 1) {
                const totalWordWidth = timesRomanFont.widthOfTextAtSize(wordsInLine.join(''), fontSize);
                const spaceWidth = (textWidth - totalWordWidth) / (wordsInLine.length - 1);
                let currentX = 72;
                wordsInLine.forEach(word => {
                    firstPage.drawText(word, { x: currentX, y: yPosition, font: timesRomanFont, size: fontSize, color: rgb(0, 0, 0) });
                    currentX += timesRomanFont.widthOfTextAtSize(word, fontSize) + spaceWidth;
                });
            } else { // Single word line, just draw it
                 firstPage.drawText(line, { x: 72, y: yPosition, font: timesRomanFont, size: fontSize, color: rgb(0, 0, 0) });
            }
        } else { // Draw the last line left-aligned
             firstPage.drawText(line, { x: 72, y: yPosition, font: timesRomanFont, size: fontSize, color: rgb(0, 0, 0) });
        }
        yPosition -= lineHeight;
    });

    return await pdfDoc.save();
}
