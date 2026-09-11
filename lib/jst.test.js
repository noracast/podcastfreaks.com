// 日付を日本時間に固定する部分。
//
// 実行時のタイムゾーンに任せると、UTC の Netlify で事前レンダリングした結果と
// JST の閲覧者のブラウザでの再計算が食い違い、ハイドレーションが壊れる。
// 一度 /episodes/ が真っ白になった前例がある（issue #224）。
//
// このテストは TZ=UTC で走る（vitest.config.js）。ローカルが JST でも
// 気づけるように、あえて UTC で確かめている。

import { describe, it, expect } from 'vitest'
import { jst, jstDate, JST_OFFSET } from './jst.js'

describe('jst', () => {
  it('UTC で走らせても日本時間で返る', () => {
    // 2026-09-10T23:06:45Z は日本時間では翌日の朝8時
    expect(jst('2026-09-10T23:06:45.600Z').format('YYYY.MM.DD')).toBe('2026.09.11')
    expect(jst('2026-09-10T23:06:45.600Z').format('H:mm:ss')).toBe('8:06:45')
  })

  it('日付が変わる境目をまたいでも、日本時間の日付になる', () => {
    // UTC の 15:00 が日本時間の 0:00
    expect(jst('2026-09-10T14:59:59Z').format('YYYY.MM.DD')).toBe('2026.09.10')
    expect(jst('2026-09-10T15:00:00Z').format('YYYY.MM.DD')).toBe('2026.09.11')
  })

  it('午前/午後と曜日が日本語で出る', () => {
    // moment のロケールは webpack が全部抱き込んでいたので何もしなくても
    // 日本語だったが、Vite では読み込む指定が要る
    const d = jst('2026-09-10T23:06:45Z')
    expect(d.format('A')).toBe('午前')
    expect(d.format('ddd')).toBe('金')
  })

  it('ずらす量は9時間', () => {
    expect(JST_OFFSET).toBe(9 * 60)
    expect(jst('2026-09-10T00:00:00Z').utcOffset()).toBe(9 * 60)
  })
})

describe('jstDate', () => {
  it('時刻を持たない表記は、その日の始まりとして扱う', () => {
    // 一覧の New! バッジは、表示と同じ YYYY.MM.DD で比べている
    const d = jstDate('2026.09.11', 'YYYY.MM.DD')
    expect(d.format('YYYY.MM.DD')).toBe('2026.09.11')
    expect(d.format('HH:mm')).toBe('00:00')
  })

  it('タイムゾーンだけを移し、表記の日付は動かさない', () => {
    // keepLocalTime。ここが false だと、UTC で走らせたときに
    // 前日になってしまう
    expect(jstDate('2026-09-11', 'YYYY-MM-DD').format('YYYY.MM.DD')).toBe('2026.09.11')
  })

  it('前後の比較ができる', () => {
    const base = jstDate('2026.09.10', 'YYYY.MM.DD')
    expect(jstDate('2026.09.11', 'YYYY.MM.DD').isAfter(base)).toBe(true)
    expect(jstDate('2026.09.09', 'YYYY.MM.DD').isAfter(base)).toBe(false)
  })
})
