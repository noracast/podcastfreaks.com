// フィードから拾った値の集計。
//
// moment を外したときに書いた。突き合わせは配信中の234フィードに対して
// 旧実装（moment）と並べて行い、getDuration 23,244件・平均・中央値は
// 全件一致、更新間隔と直近2週間の差は下のテストにある2つの理由だけだった。

import { describe, it, expect } from 'vitest'
import Util from './pf-util.js'

const util = new Util()
// 警告はテストでは黙らせる
util.onWarn = () => {}

// pubDate だけを持つエピソードの列を作る
const eps = (...pubDates) => pubDates.map(pubDate => ({ pubDate }))

describe('getDuration', () => {
  it('HH:mm:ss はそのまま', () => {
    expect(util.getDuration('01:22:14')).toBe('01:22:14')
  })

  it('1桁でも0で埋めて返す', () => {
    expect(util.getDuration('1:2:3')).toBe('01:02:03')
  })

  it('mm:ss は時に繰り上げる', () => {
    // 82分14秒
    expect(util.getDuration('82:14')).toBe('01:22:14')
  })

  it('数字だけなら秒として読む', () => {
    expect(util.getDuration('1812')).toBe('00:30:12')
  })

  it('24時間を超えても一周しない', () => {
    // moment({ hour: 25 }) は Invalid date になっていた
    expect(util.getDuration('90000')).toBe('25:00:00')
  })

  it('0は zero、読めない形は wrong-format', () => {
    expect(util.getDuration('00:00:00')).toBe('zero')
    expect(util.getDuration('0')).toBe('zero')
    expect(util.getDuration('ほげ')).toBe('wrong-format')
    expect(util.getDuration('')).toBe('wrong-format')
  })
})

describe('getDurationAverage', () => {
  it('平均を HH:mm:ss で返す', () => {
    expect(util.getDurationAverage(['00:10:00', '00:20:00', '00:30:00'])).toBe('00:20:00')
  })

  it('割り切れないときは切り捨てる', () => {
    expect(util.getDurationAverage(['00:00:01', '00:00:02'])).toBe('00:00:01')
  })

  it('空なら null', () => {
    expect(util.getDurationAverage([])).toBe(null)
  })
})

describe('getDurationMedian', () => {
  it('奇数個は真ん中', () => {
    expect(util.getDurationMedian(['00:30:00', '00:10:00', '00:20:00'])).toBe('00:20:00')
  })

  it('偶数個は中央2つの平均', () => {
    expect(util.getDurationMedian(['00:10:00', '00:20:00', '00:30:00', '00:40:00'])).toBe('00:25:00')
  })

  it('渡された配列は並べ替えない', () => {
    const input = ['00:30:00', '00:10:00', '00:20:00']
    util.getDurationMedian(input)
    expect(input).toEqual(['00:30:00', '00:10:00', '00:20:00'])
  })

  it('空なら null', () => {
    expect(util.getDurationMedian([])).toBe(null)
  })
})

describe('getUpdateInterval', () => {
  it('毎週の番組は7日', () => {
    expect(util.getUpdateInterval(eps(
      'Tue, 26 Aug 2026 21:00:00 +0900',
      'Tue, 19 Aug 2026 21:00:00 +0900',
      'Tue, 12 Aug 2026 21:00:00 +0900'
    ))).toBe(7)
  })

  it('平均ではなく中央値を返す', () => {
    // 1日 / 1日 / 100日 → 平均なら34日だが、中央値は1日
    expect(util.getUpdateInterval(eps(
      'Mon, 04 May 2026 12:00:00 +0900',
      'Sun, 03 May 2026 12:00:00 +0900',
      'Sat, 02 May 2026 12:00:00 +0900',
      'Fri, 22 Jan 2026 12:00:00 +0900'
    ))).toBe(1)
  })

  it('同じ日に複数話あっても1回の更新として数える', () => {
    // abefm は全5話が同じ時刻、meetsfm は4話が7分の間に並ぶ。
    // 話数で数えると間隔0日＝「毎日」になってしまう
    expect(util.getUpdateInterval(eps(
      'Tue, 26 Aug 2026 21:05:00 +0900',
      'Tue, 26 Aug 2026 21:00:00 +0900',
      'Tue, 19 Aug 2026 21:00:00 +0900',
      'Tue, 12 Aug 2026 21:00:00 +0900'
    ))).toBe(7)
  })

  it('日はJSTで切る（ビルドがUTCで走っても結果が変わらない）', () => {
    // 上2つは JST ではどちらも 8/26 で、1回の更新として数えたい。
    // UTC で切ると 8/25 と 8/26 に分かれ、間隔0.9日＝「毎日」に寄ってしまう
    expect(util.getUpdateInterval(eps(
      'Wed, 26 Aug 2026 23:00:00 +0900',
      'Wed, 26 Aug 2026 00:30:00 +0900',
      'Wed, 19 Aug 2026 23:00:00 +0900'
    ))).toBe(7)
  })

  it('日数には丸めない', () => {
    // 境界に乗った番組が「毎週」と「隔週」の間で行き来しないよう、
    // 日でまとめたあとの間隔は実際の時刻から測る
    expect(util.getUpdateInterval(eps(
      'Thu, 10 Sep 2026 12:00:00 +0900',
      'Wed, 02 Sep 2026 00:00:00 +0900'
    ))).toBe(8.5)
  })

  it('0.1日（約2.4時間）より細かい差は見ない', () => {
    // 8日と23時間 = 8.958…日
    expect(util.getUpdateInterval(eps(
      'Thu, 10 Sep 2026 12:00:00 +0900',
      'Tue, 01 Sep 2026 13:00:00 +0900'
    ))).toBe(9)
  })

  it('新しい順に並んでいなくても同じ結果になる', () => {
    // フィードの並び順は保証されていない
    expect(util.getUpdateInterval(eps(
      'Tue, 12 Aug 2026 21:00:00 +0900',
      'Tue, 26 Aug 2026 21:00:00 +0900',
      'Tue, 19 Aug 2026 21:00:00 +0900'
    ))).toBe(7)
  })

  it('読めない日付は数えない', () => {
    expect(util.getUpdateInterval(eps(
      'Tue, 26 Aug 2026 21:00:00 +0900',
      'ほげ',
      'Tue, 19 Aug 2026 21:00:00 +0900'
    ))).toBe(7)
  })

  it('更新した日が1日分しかなければ null', () => {
    expect(util.getUpdateInterval(eps('Tue, 26 Aug 2026 21:00:00 +0900'))).toBe(null)
    expect(util.getUpdateInterval([])).toBe(null)
  })

  it('直近のぶんだけ見る', () => {
    // 昔どうだったかではなく、今どのくらいの間隔で出ているかを知りたい。
    // 直近3件（毎日）だけを見れば1日、全部見れば中央値が延びる
    const items = eps(
      'Thu, 27 Aug 2026 12:00:00 +0900',
      'Wed, 26 Aug 2026 12:00:00 +0900',
      'Tue, 25 Aug 2026 12:00:00 +0900',
      'Mon, 25 May 2026 12:00:00 +0900',
      'Sun, 25 Jan 2026 12:00:00 +0900'
    )
    expect(util.getUpdateInterval(items, 3)).toBe(1)
    expect(util.getUpdateInterval(items)).toBeGreaterThan(1)
  })
})

describe('getEpisodesIn2Weeks', () => {
  const iso = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z')

  it('14日前の JST 00:00 より後のものを返す', () => {
    const now = new Date()
    const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
    const items = [
      { pubDate: iso(daysAgo(1)) },
      { pubDate: iso(daysAgo(13)) },
      { pubDate: iso(daysAgo(30)) }
    ]
    const res = util.getEpisodesIn2Weeks(items, 'somekey', 'ある番組')
    expect(res.length).toBe(2)
  })

  it('番組の情報を各エピソードに足す', () => {
    const items = [{ pubDate: new Date().toISOString() }]
    const res = util.getEpisodesIn2Weeks(items, 'somekey', 'ある番組')
    expect(res[0].key).toBe('somekey')
    expect(res[0].channel_title).toBe('ある番組')
  })

  it('読めない日付のエピソードは落とす（例外にしない）', () => {
    const items = [{ pubDate: 'ほげ' }, { pubDate: new Date().toISOString() }]
    expect(util.getEpisodesIn2Weeks(items, 'k', 't').length).toBe(1)
  })
})
