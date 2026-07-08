import dayjs from 'dayjs';
import Logo from "@/assets/jana.png"
import { useState, useEffect } from "react"

export default Logo

export const ENV_CONFIG = {
  BASE_API_URL: import.meta.env.DEV
    ? import.meta.env.VITE_BASE_API_URL
    : "/b3_portal/api",
}

export function useDebounce<T>(value: T, delay?: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Formats a date string into DD-MMM-YYYY format (e.g., 03-Jul-2026).
 * @param {string | Date | null | undefined} dateInput - The raw date from the backend.
 * @param {string} [fallback='-'] - Text to show if the date is invalid or missing.
 * @returns {string} Formatted date string for the UI.
 */
export const formatDateForUI = (dateInput: string | Date | null | undefined, fallback: string = '-'): string => {
  if (!dateInput || dateInput === 'unknown-date') {
    return fallback;
  }

  const parsedDate = dayjs(dateInput);
  
  if (!parsedDate.isValid()) {
    return fallback;
  }

  return parsedDate.format('DD-MMM-YYYY'); // Outputs: 03-Jul-2026
};
