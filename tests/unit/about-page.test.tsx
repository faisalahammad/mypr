import React from 'react'
import { render } from '@testing-library/react'

const mockGetUserProfile = jest.fn()

jest.mock('@/components/layout/Header', () => () => <div data-testid="header" />)
jest.mock('@/components/layout/Footer', () => () => <div data-testid="footer" />)
jest.mock('@/components/ui/ScrollToTop', () => () => <div data-testid="scroll-to-top" />)
jest.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="app-shell">{children}</div>,
}))

jest.mock('@/lib/supabase', () => ({
  getUserProfile: () => mockGetUserProfile(),
}))

describe('about page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserProfile.mockResolvedValue(null)
  })

  it('exports the expected metadata', async () => {
    const aboutModule = await import('@/app/about/page')

    expect(aboutModule.metadata).toMatchObject({
      title: 'About Faisal Ahammad — Customer Support Engineer & Open Source Contributor',
      description:
        'Faisal Ahammad is a Customer Support Engineer and open source contributor based in Dhaka, Bangladesh, with over a decade of experience in the WordPress ecosystem. Awarded the Yoast Care Fund 2025. Creator of mypr.pro.bd.',
      alternates: {
        canonical: 'https://mypr.pro.bd/about',
      },
      openGraph: {
        title: 'Faisal Ahammad — Customer Support Engineer & Open Source Contributor',
        type: 'profile',
        url: 'https://mypr.pro.bd/about',
      },
    })

    expect(aboutModule.metadata.keywords).toEqual([
      'Faisal Ahammad',
      'Faisal Ahammad WordPress',
      'Faisal Ahammad developer',
      'Faisal Ahammad Bangladesh',
      'Faisal Ahammad open source',
      'WordPress support engineer Bangladesh',
      'WordPress open source contributor',
      'WordCamp Dhaka',
      'MyPR',
      'Customer Support Engineer',
      'Gravity Forms',
      'Yoast Care Fund',
      'LifterLMS',
      'faisalahammad24@gmail.com',
    ])
  })

  it('renders the person structured data script in the public page shell', async () => {
    const AboutPage = (await import('@/app/about/page')).default

    const view = await AboutPage()
    const { container, getByTestId } = render(view as React.ReactElement)

    expect(getByTestId('header')).toBeInTheDocument()
    expect(getByTestId('app-shell')).toBeInTheDocument()
    expect(getByTestId('footer')).toBeInTheDocument()

    const jsonLdScript = container.querySelector('script[type="application/ld+json"]')
    expect(jsonLdScript).toBeInTheDocument()

    const personSchema = JSON.parse(jsonLdScript?.textContent ?? '{}') as {
      '@type'?: string
      name?: string
      jobTitle?: string
      sameAs?: string[]
      address?: {
        addressLocality?: string
        addressCountry?: string
      }
    }

    expect(personSchema).toMatchObject({
      '@type': 'Person',
      name: 'Faisal Ahammad',
      jobTitle: 'Customer Support Engineer & Open Source Contributor',
      address: {
        addressLocality: 'Dhaka',
        addressCountry: 'Bangladesh',
      },
    })
    expect(personSchema.sameAs).toEqual([
      'https://github.com/faisalahammad',
      'https://linkedin.com/in/faisalahammad',
      'https://profiles.wordpress.org/faisalahammad',
      'https://twitter.com/faisalahammad',
      'https://community.gravityforms.com/u/faisalahammad/summary',
      'https://wordpress.org/photos/author/faisalahammad/',
      'https://yoast.com/community/care-fund/recipients/faisal-ahammad/',
    ])
  })
})
