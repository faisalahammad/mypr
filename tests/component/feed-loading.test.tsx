/**
 * Tests for feed loading page
 *
 * Tests for:
 * - Rendering skeleton placeholders
 * - Correct number of skeletons
 * - Skeleton structure
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import FeedLoading from '@/app/(app)/feed/loading'

describe('FeedLoading', () => {
  it('should render the page', () => {
    const { container } = render(<FeedLoading />)

    // Should render the loading component without crashing
    expect(container).toBeInTheDocument()
  })

  it('should render page header skeletons', () => {
    render(<FeedLoading />)

    // Page title skeleton
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should render 5 PR card skeletons', () => {
    const { container } = render(<FeedLoading />)

    // Find all card containers (they have border class)
    const cardSkeletons = container.querySelectorAll('.border')
    // Should have 5 PR card skeletons
    expect(cardSkeletons.length).toBe(5)
  })

  it('should render vertical line for timeline', () => {
    const { container } = render(<FeedLoading />)

    // Should have a vertical line (bg-border class with w-0.5)
    const verticalLine = container.querySelector('.w-0\\.5')
    expect(verticalLine).toBeInTheDocument()
  })

  it('should render dot markers on timeline', () => {
    const { container } = render(<FeedLoading />)

    // Should have 5 dots (one for each PR)
    const dots = container.querySelectorAll('.rounded-full.border-2')
    expect(dots.length).toBe(5)
  })

  it('should have correct structure for each PR skeleton', () => {
    const { container } = render(<FeedLoading />)

    // Each PR card should have:
    // - A title skeleton
    // - A repo badge skeleton
    // - Stats skeletons (3 of them)
    // - A date skeleton

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(20) // At least 5 cards * 4 elements each
  })
})
