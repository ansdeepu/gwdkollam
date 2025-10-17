// src/components/e-tender/utils.ts

import { format, isValid, parseISO } from 'date-fns';

export const formatDateForInput = (date: any, isDateTime: boolean = false): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
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
        const d = date instanceof Date ? date : parseISO(date);
        if (!isValid(d)) return 'N/A';
        return format(d, includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy');
    } catch {
        return String(date); // Fallback to original string if parsing fails
    }
};
