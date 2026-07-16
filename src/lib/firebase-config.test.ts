import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isFirebasePublicConfigValid,
  type FirebasePublicConfig,
} from '@/lib/firebase'

const validConfig: FirebasePublicConfig = {
  apiKey: `AIza${'a'.repeat(36)}`,
  authDomain: 'example.firebaseapp.com',
  projectId: 'example-project',
  storageBucket: 'example-project.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef123456',
  vapidKey: 'A'.repeat(80),
}

describe('Firebase public configuration fail-safe', () => {
  it('accepts a complete public configuration shape', () => {
    assert.equal(isFirebasePublicConfigValid(validConfig), true)
  })

  it('rejects missing and malformed public configuration', () => {
    assert.equal(isFirebasePublicConfigValid({}), false)
    assert.equal(
      isFirebasePublicConfigValid({ ...validConfig, apiKey: 'not-a-firebase-key' }),
      false
    )
    assert.equal(isFirebasePublicConfigValid({ ...validConfig, vapidKey: '' }), false)
  })
})
