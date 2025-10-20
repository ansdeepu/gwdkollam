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

export const toDateOrNull = (value: any): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    try {
      const ms = value.seconds * 1000 + (value.nanoseconds ? Math.round(value.nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    } catch { /* fallthrough */ }
  }
  if (typeof value === 'number' && isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const iso = Date.parse(trimmed);
    if (!isNaN(iso)) return new Date(iso);
    try {
      const fallback = new Date(trimmed);
      if (!isNaN(fallback.getTime())) return fallback;
    } catch { /* ignore */ }
  }
  return null;
};


export const formatDateSafe = (date: any, includeTime: boolean = false): string => {
    if (date === null || date === undefined || date === '') {
        return 'N/A';
    }
    
    const d = toDateOrNull(date);

    if (!d || !isValid(d)) {
        return String(date); // Fallback to original string if parsing fails
    }

    return format(d, includeTime ? 'dd/MM/yyyy, hh:mm a' : 'dd/MM/yyyy');
};
