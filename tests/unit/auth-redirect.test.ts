import {
  appendNextParam,
  getSafeAuthRedirectPath,
} from '@/lib/auth-redirect'

describe('auth redirect helpers', () => {
  describe('getSafeAuthRedirectPath', () => {
    it('returns the default settings path when no redirect is provided', () => {
      expect(getSafeAuthRedirectPath(null)).toBe('/settings')
      expect(getSafeAuthRedirectPath(undefined)).toBe('/settings')
      expect(getSafeAuthRedirectPath('')).toBe('/settings')
    })

    it('allows known protected member routes', () => {
      expect(getSafeAuthRedirectPath('/feed')).toBe('/feed')
      expect(getSafeAuthRedirectPath('/settings')).toBe('/settings')
      expect(getSafeAuthRedirectPath('/settings?tab=profile')).toBe('/settings?tab=profile')
    })

    it('rejects external or malformed redirect targets', () => {
      expect(getSafeAuthRedirectPath('https://evil.com')).toBe('/settings')
      expect(getSafeAuthRedirectPath('//evil.com')).toBe('/settings')
      expect(getSafeAuthRedirectPath('javascript:alert(1)')).toBe('/settings')
      expect(getSafeAuthRedirectPath('/login')).toBe('/settings')
    })
  })

  describe('appendNextParam', () => {
    it('adds the next parameter when the destination is not the default', () => {
      expect(appendNextParam('https://mypr.pro.bd/api/auth/callback', '/feed')).toBe(
        'https://mypr.pro.bd/api/auth/callback?next=%2Ffeed'
      )
    })

    it('skips the next parameter for the default destination', () => {
      expect(appendNextParam('https://mypr.pro.bd/api/auth/callback', '/settings')).toBe(
        'https://mypr.pro.bd/api/auth/callback'
      )
    })
  })
})
