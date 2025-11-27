// src/components/e-tender/pdf/generators/dateExtensionCorrigendumGenerator.ts
import { PDFDocument, StandardFonts, TextAlignment } from "pdf-lib";
import type { E_tender } from "@/hooks/useE_tenders";
import type { Corrigendum, StaffMember } from "@/lib/schemas";
import { formatDateSafe } from "../../utils";

export async function generateDateExtensionCorrigendum(
    tender: E_tender,
    corrigendum: Corrigendum,
    staff?: StaffMember[]
): Promise<Uint8Array> {
    
    const templatePath = "/Corrigendum-DateExt.pdf";

    const existingPdfBytes = await fetch(templatePath).then((res) => {
        if (!res.ok)
            throw new Error(
                `Template file not found: ${templatePath.split("/").pop()}`
            );
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Format dates
    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, true, false);
    const newLastDate = formatDateSafe(corrigendum.lastDateOfReceipt, true, true, false);
    const newOpeningDate = formatDateSafe(corrigendum.dateOfOpeningTender, true, false, true);

    // Auto-generate reason only if not provided
    const reasonText =
        corrigendum.reason ||
        `No bid was received for the above work`;

    const fullParagraph = `     The time period for submitting e-tenders expired on ${lastDate}, and ${reasonText}. Consequently, the deadline for submitting e-tenders has been extended to ${newLastDate}, and the opening of the tender has been rescheduled to ${newOpeningDate}.`;

    const fieldMappings: Record<string, string> = {
        file_no_header: `GKT/${tender.fileNo || ""}`,
        e_tender_no_header: tender.eTenderNo || "",
        tender_date_header: `Dated ${formatDateSafe(tender.tenderDate)}`,
        name_of_work: tender.nameOfWork || "",
        date_ext: fullParagraph, // multiline box (4096 flag)
        date: formatDateSafe(corrigendum.corrigendumDate),
    };
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'name_of_work'];
    const justifyFields = ['name_of_work', 'date_ext'];

    // Fill fields safely
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
        try {
            const field = form.getTextField(fieldName);
            const selectedFont = boldFields.includes(fieldName) ? boldFont : font;
            
            if (justifyFields.includes(fieldName)) {
                field.setAlignment(TextAlignment.Left); // Use Left since Justify is not supported
            }

            field.setText(value);
            field.updateAppearances(selectedFont);
        } catch (err) {
            console.warn(`⚠️ Could not fill field '${fieldName}':`, err);
        }
    }

    form.flatten();

    return await pdfDoc.save();
}
