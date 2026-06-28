import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { todaySheetFromSearch } from '@/lib/today-actions'

describe('today-actions', () => {
  it('parses photo and text sheet intents from query string', () => {
    assert.equal(todaySheetFromSearch('?photo=1'), 'photo')
    assert.equal(todaySheetFromSearch('?text=1'), 'text')
    assert.equal(todaySheetFromSearch('?photo=1&text=1'), 'photo')
    assert.equal(todaySheetFromSearch(''), null)
  })
})
