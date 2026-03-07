import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind + clsx helper (shadcn-style)
 * Pure JS (no TS types) to avoid parse errors if a loader is misconfigured.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
