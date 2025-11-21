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

    // --- Diagnostic Code ---
    // This will log the names of all fields in your PDF to the server console.
    const fields = form.getFields();
    console.log('--- DIAGNOSTIC: Found Fillable Fields in Agreement.pdf ---');
    fields.forEach(field => {
        const type = field.constructor.name;
        const name = field.getName();
        console.log(`${type}: ${name}`);
    });
    console.log('---------------------------------------------------------');
    // --- End Diagnostic Code ---

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

    const fieldMappings: Record<string, any> = {
        'file_no_header': `GKT/${tender.fileNo || '__________'}`,
        'e_tender_no_header': tender.eTenderNo || '__________',
        'agreement_date': formatDateSafe(tender.agreementDate),
        'agreement': agreementText,
    };

    // Attempt to fill fields based on the assumed names. This may still result in a blank PDF.
    // The important part is the console log above.
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
        try {
            const field = form.getTextField(fieldName);
            field.setText(String(value || ''));
        } catch (e) {
            // Suppress errors for now, as we just want the diagnostic output.
        }
    });

    // To avoid confusion, we will return the original blank template for now.
    // The console will have the information we need.
    return existingPdfBytes;
}
