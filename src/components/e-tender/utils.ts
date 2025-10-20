// src/components/e-tender/utils.ts
import { format, isValid, parseISO, toDate } from 'date-fns';

export const formatDateForInput = (date: any, isDateTime: boolean = false): string => {
    if (!date) return '';
    try {
        const d = toDate(date);
        if (isValid(d)) {
            return format(d, isDateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
        }
        return '';
    } catch (e) {
        return '';
    }
};

export const formatDateSafe = (date: any, includeTime: boolean = false): string => {
    if (!date) return 'N/A';
    try {
        const d = toDate(date);
        if (!isValid(d)) return String(date); // Fallback for non-ISO strings that might be valid
        return format(d, includeTime ? 'dd/MM/yyyy, hh:mm a' : 'dd/MM/yyyy');
    } catch {
        return String(date); // Fallback to original string if parsing fails
    }
};
