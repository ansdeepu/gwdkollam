// src/components/e-tender/pdf/generators/technicalSummaryGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe } from '../../utils';
import type { StaffMember } from '@/hooks/use-data-store';

export async function generateTechnicalSummary(tender: E_tender, allStaffMembers: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Technical-Summary.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();

    const l1Bidder = (tender.bidders || []).length > 0 ? (tender.bidders || []).reduce((lowest, current) => (current.quotedAmount && lowest.quotedAmount && current.quotedAmount < lowest.quotedAmount) ? current : lowest) : null;
    let techSummaryText = `     The bids received were scrutinized and all participating contractors submitted the required documents. Upon verification, all bids were found to be technically qualified and hence accepted.`;
    if (l1Bidder && l1Bidder.quotedPercentage !== undefined && l1Bidder.aboveBelow) {
        techSummaryText += ` The lowest rate, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was quoted by ${l1Bidder.name || 'N/A'}.`;
    }
    techSummaryText += ' All technically qualified bids are recommended for financial evaluation.';
    
    const committeeMemberNames = [tender.technicalCommitteeMember1, tender.technicalCommitteeMember2, tender.technicalCommitteeMember3].filter(Boolean) as string[];
    const committeeMembersText = committeeMemberNames.map((name, index) => {
        const staffInfo = allStaffMembers.find(s => s.name === name);
        return `${index + 1}. ${name}, ${staffInfo?.designation || 'N/A'}`;
    }).join('\n');

    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header'];
    
    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'tech_summary': techSummaryText,
        'committee_members': committeeMembersText,
        'tech_date': formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening),
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
           try {
            const textField = form.getTextField(fieldName);
            const isBold = boldFields.includes(fieldName);
            
            textField.setText(String(fieldMappings[fieldName] || ''));
            
            if (fieldName === 'tech_summary') {
                textField.setAlignment(TextAlignment.Justify);
            }
            
            textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
           } catch(e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
           }
        }
    });

    form.flatten();
    return await pdfDoc.save();
}
