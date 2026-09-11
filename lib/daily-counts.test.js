import { describe, it, expect } from 'vitest'
import countByDay, { jstDay } from './daily-counts.js'

describe('jstDay', () => {
  it('日本時間の日付に切る', () => {
    expect(jstDay('Fri, 11 Sep 2026 11:06:52 GMT')).toBe('2026-09-11')
  })

  it('UTC で日をまたぐ時刻も、日本時間の日付になる', () => {
    // 日本時間では翌日の午前8時
    expect(jstDay('Thu, 10 Sep 2026 23:00:00 GMT')).toBe('2026-09-11')
  })

  it('日本時間の 0:00 はその日になる', () => {
    expect(jstDay('Thu, 10 Sep 2026 15:00:00 GMT')).toBe('2026-09-11')
  })

  it('読めない値は null', () => {
    expect(jstDay('明日')).toBe(null)
    expect(jstDay(null)).toBe(null)
    expect(jstDay(undefined)).toBe(null)
  })
})

describe('countByDay', () => {
  it('日ごとに数える', () => {
    expect(countByDay([
      { pubDate: 'Fri, 11 Sep 2026 11:00:00 GMT' },
      { pubDate: 'Fri, 11 Sep 2026 20:00:00 GMT' },
      { pubDate: 'Wed, 09 Sep 2026 01:00:00 GMT' }
    ])).toEqual({ '2026-09-11': 1, '2026-09-12': 1, '2026-09-09': 1 })
  })

  it('番組をまたいで積み上げられる', () => {
    const into = countByDay([{ pubDate: 'Fri, 11 Sep 2026 01:00:00 GMT' }])
    countByDay([{ pubDate: 'Fri, 11 Sep 2026 02:00:00 GMT' }], into)
    expect(into).toEqual({ '2026-09-11': 2 })
  })

  it('日付を読めない回は数えない', () => {
    expect(countByDay([{ pubDate: null }, { title: '回' }])).toEqual({})
  })

  it('空でも落ちない', () => {
    expect(countByDay(null)).toEqual({})
    expect(countByDay([])).toEqual({})
  })
})
