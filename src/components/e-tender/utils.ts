// src/components/e-tender/utils.ts
import { format, isValid, parseISO, toDate } from 'date-fns';

export const formatDateForInput = (date: any, isDateTime: boolean = false): string => {
    if (!date) return '';
    try {
        const d = toDate(date);
        if (isValid(d)) {
            return format(d, isDateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
        }
        // If it's already a string in the correct format, return it
        if (typeof date === 'string') {
            const parsed = parseISO(date);
            if (isValid(parsed)) {
                 return format(parsed, isDateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
            }
        }
        return '';
    } catch (e) {
        return '';
    }
};

export const formatDateSafe = (date: any, includeTime: boolean = false): string => {
    if (date === null || date === undefined || date === '') {
        return 'N/A';
    }
    
    let d;
    if (date instanceof Date) {
        d = date;
    } else if (typeof date === 'object' && date !== null && typeof date.seconds === 'number') {
        // Handle Firestore Timestamp object
        d = new Date(date.seconds * 1000);
    } else {
        d = new Date(date);
    }

    if (!isValid(d)) {
        return String(date); // Fallback to original string if parsing fails
    }

    return format(d, includeTime ? 'dd/MM/yyyy, hh:mm a' : 'dd/MM/yyyy');
};
