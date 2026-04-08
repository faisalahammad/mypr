/**
 * Unit tests for downloadAsImage utility
 */

const mockToPng = jest.fn(() => Promise.resolve('data:image/png;base64,abc123'))

jest.mock('html-to-image', () => ({
  toPng: mockToPng,
}))

import { downloadAsImage } from '@/lib/utils'

describe('downloadAsImage', () => {
  let mockLink: { download: string; href: string; click: jest.Mock }
  let originalCreateElement: (tagName: string) => HTMLElement

  beforeEach(() => {
    jest.clearAllMocks()

    mockLink = { download: '', href: '', click: jest.fn() }

    originalCreateElement = document.createElement.bind(document)
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return mockLink as unknown as HTMLAnchorElement
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('calls toPng with the provided element and options', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockToPng).toHaveBeenCalledWith(element, expect.objectContaining({
      backgroundColor: '#ffffff',
      pixelRatio: 2,
    }))
  })

  it('sets the download filename on the anchor element', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'my-pr.png')
    expect(mockLink.download).toBe('my-pr.png')
  })

  it('sets the href to the data URL from toPng', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockLink.href).toBe('data:image/png;base64,abc123')
  })

  it('triggers a click to start the download', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'test.png')
    expect(mockLink.click).toHaveBeenCalledTimes(1)
  })

  it('works with different filenames', async () => {
    const element = originalCreateElement('div') as HTMLDivElement
    await downloadAsImage(element, 'pr-octocat-hello-world-42.png')
    expect(mockLink.download).toBe('pr-octocat-hello-world-42.png')
    expect(mockLink.click).toHaveBeenCalledTimes(1)
  })
})
