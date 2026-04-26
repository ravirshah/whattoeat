import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflict. Safe to call with conditional objects. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
