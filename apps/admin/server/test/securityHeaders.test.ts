import { describe, expect, it } from 'vitest'
import { ADMIN_SECURITY_HEADERS, adminContentSecurityPolicy } from '../utils/adminSecurityHeaders'

describe('admin security headers', () => {
  it('keep the panel out of search engines', () => {
    expect(ADMIN_SECURITY_HEADERS['X-Robots-Tag']).toBe('noindex, nofollow')
  })

  it('forbid any site, even our own, from framing the panel', () => {
    expect(ADMIN_SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(ADMIN_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
  })

  it('give the camera to nobody (the admin has no QR reader)', () => {
    expect(ADMIN_SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()')
  })

  it('run only scripts carrying the nonce of the response, and keep the frame lock', () => {
    const policy = adminContentSecurityPolicy('abc')
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).not.toContain("frame-ancestors 'self'")
  })
})
