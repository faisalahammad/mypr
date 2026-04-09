describe('root layout metadata', () => {
  it('exports the expected site-wide SEO metadata', async () => {
    const layoutModule = await import('@/app/layout')

    expect(layoutModule.metadata).toMatchObject({
      metadataBase: new URL('https://mypr.pro.bd'),
      title: {
        default: 'MyPR',
        template: '%s | MyPR',
      },
      description: 'MyPR helps developers turn merged pull requests into a public portfolio they can share anywhere.',
      alternates: {
        canonical: '/',
      },
      openGraph: {
        title: 'MyPR',
        url: 'https://mypr.pro.bd',
        siteName: 'MyPR',
        images: [
          expect.objectContaining({
            url: '/og-placeholder.jpg',
          }),
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'MyPR',
        images: ['/og-placeholder.jpg'],
      },
      robots: {
        index: true,
        follow: true,
      },
    })

    expect(layoutModule.metadata.keywords).toEqual([
      'MyPR',
      'pull request portfolio',
      'developer portfolio',
      'GitHub pull requests',
      'merged PR timeline',
      'open source contributions',
      'engineering portfolio',
      'shareable PR profile',
    ])
  })
})
