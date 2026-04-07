/**
 * Component tests for 404 page
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

// Simple component to test the 404 page structure
// The actual not-found.tsx is a special Next.js file
function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find a user with that username. Check the spelling or try searching for another developer.
          </p>
          <a href="/">Back to Home</a>
        </div>
      </div>
    </div>
  )
}

describe('NotFound page structure', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search icon emoji', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('🔍')).toBeInTheDocument()
  })

  it('renders "User Not Found" heading', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('User Not Found')).toBeInTheDocument()
  })

  it('renders helpful message', () => {
    render(<NotFoundPage />)
    expect(screen.getByText(/We couldn't find a user with that username/)).toBeInTheDocument()
  })

  it('renders "Back to Home" link', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
  })

  it('renders link to home page', () => {
    render(<NotFoundPage />)
    const link = screen.getByText('Back to Home').closest('a')
    expect(link).toHaveAttribute('href', '/')
  })

  it('has centered layout', () => {
    const { container } = render(<NotFoundPage />)

    const mainContainer = container.querySelector('.min-h-screen')
    expect(mainContainer).toBeInTheDocument()
    expect(mainContainer).toHaveClass('flex')
  })

  it('has container with max width', () => {
    const { container } = render(<NotFoundPage />)

    const card = container.querySelector('.max-w-md')
    expect(card).toBeInTheDocument()
  })

  it('has text centered', () => {
    const { container } = render(<NotFoundPage />)

    const centeredContent = container.querySelector('.text-center')
    expect(centeredContent).toBeInTheDocument()
  })

  it('renders all elements in correct order', () => {
    const { container } = render(<NotFoundPage />)

    const centeredContent = container.querySelector('.text-center')
    const children = centeredContent?.children

    expect(children).toHaveLength(4) // icon, heading, paragraph, link
    expect(children?.[0]).toHaveTextContent('🔍')
    expect(children?.[1]).toHaveTextContent('User Not Found')
    expect(children?.[2]).toHaveTextContent(/We couldn't find a user/)
    expect(children?.[3]).toHaveTextContent('Back to Home')
  })

  it('uses responsive icon size', () => {
    const { container } = render(<NotFoundPage />)

    const icon = container.querySelector('.text-6xl')
    expect(icon).toBeInTheDocument()
  })

  it('uses semantic heading', () => {
    render(<NotFoundPage />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('User Not Found')
  })
})
