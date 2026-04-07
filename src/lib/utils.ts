import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Captures a DOM element as a PNG and triggers a download.
 * Uses dynamic import so html2canvas is only loaded on the client.
 */
export async function downloadAsImage(element: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(element, { useCORS: true })
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}
