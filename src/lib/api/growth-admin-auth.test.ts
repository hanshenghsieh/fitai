import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { isAdminEmail, resetAdminConfigWarningForTests } from './auth'

function readRepoFile(relativePath: string): string {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8')
}

const ORIGINAL_ADMIN_EMAILS = process.env.ADMIN_EMAILS

function withAdminEmails(value: string | undefined, run: () => void) {
  if (value === undefined) {
    delete process.env.ADMIN_EMAILS
  } else {
    process.env.ADMIN_EMAILS = value
  }
  try {
    run()
  } finally {
    if (ORIGINAL_ADMIN_EMAILS === undefined) {
      delete process.env.ADMIN_EMAILS
    } else {
      process.env.ADMIN_EMAILS = ORIGINAL_ADMIN_EMAILS
    }
  }
}

describe('isAdminEmail (P0-5 admin allowlist)', () => {
  it('normal user → not admin (fails closed when ADMIN_EMAILS unset)', () => {
    withAdminEmails(undefined, () => {
      assert.equal(isAdminEmail('regular-user@example.com'), false)
    })
  })

  it('normal user → not admin even when an allowlist is configured', () => {
    withAdminEmails('founder@betterbit.tw', () => {
      assert.equal(isAdminEmail('regular-user@example.com'), false)
      assert.equal(isAdminEmail(null), false)
      assert.equal(isAdminEmail(undefined), false)
      assert.equal(isAdminEmail(''), false)
    })
  })

  it('admin user → allowed', () => {
    withAdminEmails('founder@betterbit.tw', () => {
      assert.equal(isAdminEmail('founder@betterbit.tw'), true)
    })
  })

  it('is case-insensitive and trims whitespace on both sides', () => {
    withAdminEmails(' Founder@BetterBit.tw , other@example.com ', () => {
      assert.equal(isAdminEmail('founder@betterbit.tw'), true)
      assert.equal(isAdminEmail('FOUNDER@BETTERBIT.TW'), true)
      assert.equal(isAdminEmail('  founder@betterbit.tw  '), true)
      assert.equal(isAdminEmail('other@example.com'), true)
      assert.equal(isAdminEmail('not-listed@example.com'), false)
    })
  })

  it('empty ADMIN_EMAILS string denies everyone (fail closed, not fail open)', () => {
    withAdminEmails('', () => {
      assert.equal(isAdminEmail('anyone@example.com'), false)
    })
  })
})

describe('requireAdminUser / /growth surface — regression locks (content assertions)', () => {
  it('src/lib/api/auth.ts defines requireAdminUser layered on requireApiUser + isAdminEmail, returning 403 for non-admins', () => {
    const source = readRepoFile('src/lib/api/auth.ts')
    const fnStart = source.indexOf('export async function requireAdminUser(')
    assert.ok(fnStart >= 0, 'expected requireAdminUser to be exported from src/lib/api/auth.ts')
    const fnSource = source.slice(fnStart)
    assert.match(fnSource, /await requireApiUser\(request\)/)
    assert.match(fnSource, /isAdminEmail\(auth\.user\.email\)/)
    assert.match(fnSource, /403/)
  })

  const growthApiRoutes = [
    'src/app/api/growth/collectors/route.ts',
    'src/app/api/growth/posts/route.ts',
    'src/app/api/growth/posts/[id]/route.ts',
    'src/app/api/growth/collect/fetch-url/route.ts',
    'src/app/api/growth/collect/search/route.ts',
    'src/app/api/growth/collect/import/route.ts',
  ]

  for (const route of growthApiRoutes) {
    it(`${route} uses requireAdminUser, not the plain requireApiUser`, () => {
      const source = readRepoFile(route)
      assert.match(source, /import \{ requireAdminUser \} from '@\/lib\/api\/auth'/)
      assert.doesNotMatch(source, /requireApiUser/)
    })
  }

  it('/growth page layout enforces an admin check server-side (not just the API routes)', () => {
    const source = readRepoFile('src/app/growth/layout.tsx')
    assert.match(source, /isAdminEmail\(user\?\.email\)/)
    assert.match(source, /redirect\('\/login'\)/)
  })
})

describe('Phase 2 PRE-TASK B — ADMIN_EMAILS production safety', () => {
  it('logs a clear, PII-free warning when ADMIN_EMAILS is missing, and stays fail-closed', () => {
    resetAdminConfigWarningForTests()
    const originalError = console.error
    const logged: unknown[][] = []
    console.error = (...args: unknown[]) => {
      logged.push(args)
    }
    try {
      withAdminEmails(undefined, () => {
        assert.equal(isAdminEmail('anyone@example.com'), false)
      })
    } finally {
      console.error = originalError
      resetAdminConfigWarningForTests()
    }

    const joined = logged.map(args => args.join(' ')).join('\n')
    assert.match(joined, /ADMIN_EMAILS/)
    assert.match(joined, /admin-config/)
    // Must never print an actual email or the raw env value.
    assert.doesNotMatch(joined, /@/)
  })

  it('only warns once per server instance, not once per request', () => {
    resetAdminConfigWarningForTests()
    const originalError = console.error
    const logged: unknown[][] = []
    console.error = (...args: unknown[]) => {
      logged.push(args)
    }
    try {
      withAdminEmails(undefined, () => {
        isAdminEmail('a@example.com')
        isAdminEmail('b@example.com')
        isAdminEmail('c@example.com')
      })
    } finally {
      console.error = originalError
      resetAdminConfigWarningForTests()
    }
    assert.equal(logged.length, 1)
  })

  it('does not warn when ADMIN_EMAILS is configured', () => {
    resetAdminConfigWarningForTests()
    const originalError = console.error
    const logged: unknown[][] = []
    console.error = (...args: unknown[]) => {
      logged.push(args)
    }
    try {
      withAdminEmails('founder@betterbit.tw', () => {
        assert.equal(isAdminEmail('founder@betterbit.tw'), true)
      })
    } finally {
      console.error = originalError
      resetAdminConfigWarningForTests()
    }
    assert.equal(logged.length, 0)
  })

  it('src/instrumentation.ts runs a startup check for ADMIN_EMAILS without printing secret values', () => {
    const source = readRepoFile('src/instrumentation.ts')
    assert.match(source, /export async function register/)
    assert.match(source, /ADMIN_EMAILS/)
    assert.match(source, /console\.error/)
    // Must reference the presence check only, never interpolate the value itself.
    assert.doesNotMatch(source, /\$\{process\.env\.ADMIN_EMAILS\}/)
  })
})
