// src/components/e-tender/pdf/generators/dateExtensionCorrigendumGenerator.ts
import { PDFDocument, StandardFonts, TextAlignment } from "pdf-lib";
import type { E_tender } from "@/hooks/useE_tenders";
import type { Corrigendum } from "@/lib/schemas/eTenderSchema";
import { formatDateSafe } from "../../utils";

export async function generateDateExtensionCorrigendum(
    tender: E_tender,
    corrigendum: Corrigendum
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

    // Format dates from the tender and corrigendum
    const lastDate = formatDateSafe(tender.dateTimeOfReceipt, true, false, false);
    const newLastDate = formatDateSafe(corrigendum.lastDateOfReceipt, true, false, false);
    const newOpeningDate = formatDateSafe(corrigendum.dateOfOpeningTender, true, false, false);

    // Construct the reason text as specified
    const reasonText = `The time period for submitting e-tenders expired on ${lastDate}, and ${corrigendum.reason || 'a sufficient number of bids were not received'}. Consequently, the deadline for submitting e-tenders has been extended to ${newLastDate}, and the opening of the tender has been rescheduled to ${newOpeningDate}.`;

    // Correct field names for PDF mapping
    const fieldMappings: Record<string, string> = {
        file_no_header: `GKT/${tender.fileNo || ""}`,
        e_tender_no_header: tender.eTenderNo || "",
        tender_date_header: formatDateSafe(tender.tenderDate),
        name_of_work: tender.nameOfWork || "",
        date_ext: reasonText, // This is the main paragraph field
        date: formatDateSafe(corrigendum.corrigendumDate),
    };

    // Fill fields safely
    for (const [fieldName, value] of Object.entries(fieldMappings)) {
        try {
            const field = form.getTextField(fieldName);
            field.setText(value);

            // Ensure multiline text is justified
            if (fieldName === "date_ext") {
                field.setAlignment(TextAlignment.Justify);
            }

            field.updateAppearances(font);
        } catch (err) {
            console.warn(`⚠️ Could not fill field '${fieldName}':`, err);
        }
    }

    form.flatten();

    return await pdfDoc.save();
}
