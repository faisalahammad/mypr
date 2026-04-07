/**
 * Unit tests for downloadAsImage utility
 */

// Mock html2canvas before importing anything
const mockToDataURL = jest.fn(() => 'data:image/png;base64,abc123')
const mockCanvas = { toDataURL: mockToDataURL }
const mockHtml2canvas = jest.fn(() => Promise.resolve(mockCanvas))

jest.mock('html2canvas', () => ({
  __esModule: true,
  default: mockHtml2canvas
}))

import { downloadAsImage } from '@/lib/utils'

describe('downloadAsImage', () => {
  let mockLink: { download: string; href: string; click: jest.Mock }
  let originalCreateElement: (tagName: string) => HTMLElement

  beforeEach(() => {
    jest.clearAllMocks()

    mockLink = { download: '', href: '', click: jest.fn() }

    // Save original before mocking to avoid infinite recursion
    originalCreateElement = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockLink as unknown as HTMLAnchorElement
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('calls html2canvas with the provided element and useCORS option', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockHtml2canvas).toHaveBeenCalledWith(element, { useCORS: true })
  })

  it('sets the download filename on the anchor element', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'my-pr.png')
    expect(mockLink.download).toBe('my-pr.png')
  })

  it('sets the href to the canvas data URL', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockLink.href).toBe('data:image/png;base64,abc123')
  })

  it('triggers a click to start the download', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockLink.click).toHaveBeenCalledTimes(1)
  })

  it('calls toDataURL with image/png format', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockToDataURL).toHaveBeenCalledWith('image/png')
  })

  it('works with different filenames', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'pr-octocat-hello-world-42.png')
    expect(mockLink.download).toBe('pr-octocat-hello-world-42.png')
    expect(mockLink.click).toHaveBeenCalledTimes(1)
  })
})
