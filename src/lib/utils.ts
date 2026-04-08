import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DownloadImageOptions {
  backgroundColor?: string
  pixelRatio?: number
  maxHeight?: number
}

export async function downloadAsImage(
  element: HTMLElement,
  filename: string,
  options: DownloadImageOptions = {}
): Promise<void> {
  const { toPng } = await import('html-to-image')
  const targetHeight = options.maxHeight
    ? Math.min(element.scrollHeight, options.maxHeight)
    : undefined
  const dataUrl = await toPng(element, {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    pixelRatio: options.pixelRatio ?? 2,
    height: targetHeight,
    style: targetHeight
      ? {
          maxHeight: `${targetHeight}px`,
          height: `${targetHeight}px`,
          overflow: 'hidden',
        }
      : undefined,
  })
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}
