import { describe, it, expect } from 'vitest'
import formatDate from './format-date.js'

describe('formatDate', () => {
  it('build_info.json の日付を一覧の表記に直す', () => {
    expect(formatDate('2026-09-11T08:06:45')).toBe('2026.09.11')
  })

  it('時刻は落とす', () => {
    expect(formatDate('2026-01-05T23:59:59')).toBe('2026.01.05')
  })

  it('月日は2桁に揃える', () => {
    expect(formatDate('2026-01-05T00:00:00')).toBe('2026.01.05')
  })
})
