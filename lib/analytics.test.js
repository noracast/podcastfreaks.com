import { describe, it, expect } from 'vitest'
import { clean } from './analytics.js'

describe('clean', () => {
  it('空の値は送らない', () => {
    expect(clean({ a: '', b: null, c: undefined, d: 0 })).toEqual({ d: 0 })
  })
  it('真偽値は文字列にする', () => {
    expect(clean({ a: true, b: false })).toEqual({ a: 'true', b: 'false' })
  })
  it('文字列は100文字で切る', () => {
    expect(clean({ a: 'x'.repeat(150) }).a).toHaveLength(100)
  })
})
