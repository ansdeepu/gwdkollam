// src/components/e-tender/utils.ts
import { format, isValid, parseISO } from 'date-fns';

export const formatDateForInput = (date: any, isDateTime: boolean = false): string => {
    if (!date) return '';
    try {
        // Handle case where date is already a formatted string that's valid for the input
        if (typeof date === 'string') {
            const parsed = new Date(date);
            if (isValid(parsed)) {
                return format(parsed, isDateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
            }
        }
        // Handle Date objects
        if (date instanceof Date && isValid(date)) {
            return format(date, isDateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
        }
        return '';
    } catch (e) {
        return '';
    }
};

export const formatDateSafe = (date: any, includeTime: boolean = false): string => {
    if (!date) return 'N/A';
    try {
        const d = date instanceof Date ? date : parseISO(String(date));
        if (!isValid(d)) return String(date); // Fallback for non-ISO strings that might be valid
        return format(d, includeTime ? 'dd/MM/yyyy hh:mm a' : 'dd/MM/yyyy');
    } catch {
        return String(date); // Fallback to original string if parsing fails
    }
};
