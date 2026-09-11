// RSS の pubDate の解析。
//
// フィードは配信者ごとに書き方がまちまちで、ここが狂うと一覧の日付が
// 最大1日ずれる。過去に実際に踏んだ形をそのままテストにしてある。

import { describe, it, expect } from 'vitest'
import parsePubDate from './parse-pub-date.js'

// 期待値は UTC の ISO 文字列で書く。実行環境のタイムゾーンに左右されない
const iso = (date) => date.toISOString()

describe('parsePubDate', () => {
  it('RFC2822（数字のタイムゾーン）', () => {
    expect(iso(parsePubDate('Wed, 10 Sep 2026 23:06:45 +0900'))).toBe('2026-09-10T14:06:45.000Z')
  })

  it('GMT のような名前のタイムゾーンも読める', () => {
    // 以前は 'ddd, DD MMM YYYY HH:mm:ss ZZ' で解析していて、GMT を無視して
    // ローカル時刻として扱っていた。全222フィード中117件がこの書き方だった
    expect(iso(parsePubDate('Wed, 10 Sep 2026 14:00:00 GMT'))).toBe('2026-09-10T14:00:00.000Z')
  })

  it('曜日が実際と食い違っていても読める', () => {
    // kakakikikeke の "Tue, 30 Oct 2024" は実際には水曜日。
    // 曜日の整合性を見る書式だと、これだけで Invalid date になっていた
    expect(iso(parsePubDate('Tue, 30 Oct 2024 12:00:00 +0900'))).toBe('2024-10-30T03:00:00.000Z')
  })

  it('Atom の RFC3339（ISO 8601）', () => {
    expect(iso(parsePubDate('2026-09-10T23:06:45Z'))).toBe('2026-09-10T23:06:45.000Z')
  })

  it('曜日が無くても読める（RFC2822 では省略できる）', () => {
    expect(iso(parsePubDate('10 Sep 2026 23:06:45 +0900'))).toBe('2026-09-10T14:06:45.000Z')
  })

  it('前後の空白は落とす', () => {
    // 要素の中で改行して書くフィードがある
    expect(iso(parsePubDate('\n  Wed, 10 Sep 2026 14:00:00 GMT\n'))).toBe('2026-09-10T14:00:00.000Z')
  })

  // ここから下は、実際に配信されている234フィードから pubDate を23,154通り
  // 集めて、書き方の形ごとに代表を1つずつ拾ったもの。
  // 「こう書かれることがある」という事実の記録でもある
  describe('実際のフィードにある書き方', () => {
    const cases = [
      // 日が1桁（0 で埋めないフィードがある）
      ['Wed, 1 Dec 2021 00:00:00 +0000', '2021-12-01T00:00:00.000Z'],
      // マイナスのゼロ。+0000 と同じ意味だが、書き方として実在する
      ['Fri, 10 Jan 2025 05:49:57 -0000', '2025-01-10T05:49:57.000Z'],
      // 日を0で埋めたもの
      ['Fri, 03 Aug 2018 05:10:11 +0000', '2018-08-03T05:10:11.000Z'],
      // Z ひとつだけ。RFC2822 の本文には無い書き方だが使われている
      ['Tue, 27 Apr 2021 12:00:00 Z', '2021-04-27T12:00:00.000Z'],
      // 名前のタイムゾーン。23,154通りのうち14,251がこの形だった
      ['Tue, 25 Aug 2026 22:00:00 GMT', '2026-08-25T22:00:00.000Z'],
      // Atom の RFC3339
      ['2023-10-22T12:16:05+00:00', '2023-10-22T12:16:05.000Z']
    ]
    for (const [input, expected] of cases) {
      it(input, () => {
        expect(iso(parsePubDate(input))).toBe(expected)
      })
    }
  })

  it('読めない値は null で返る（例外にはしない）', () => {
    // 呼び出し側が null で弾ける。moment を使っていた頃は Invalid な
    // moment オブジェクトが返り、isValid() で確かめる決まりだった
    expect(parsePubDate('これは日付ではない')).toBe(null)
    expect(parsePubDate('')).toBe(null)
    expect(parsePubDate(null)).toBe(null)
    expect(parsePubDate(undefined)).toBe(null)
  })
})
