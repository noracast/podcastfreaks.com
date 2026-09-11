// 収録時間の文字列と秒の行き来。
//
// moment を外したときに書いた。moment.utc(ms).format('HH:mm:ss') は
// 24時間で一周してしまい、25時間の値が 01:00:00 になっていたので、
// そこだけ振る舞いを変えてある。

import { describe, it, expect } from 'vitest'
import { toSeconds, toHHMMSS, toLocalSeconds, toStamp } from './format-seconds.js'

describe('toSeconds', () => {
  it('HH:mm:ss を秒にする', () => {
    expect(toSeconds('01:22:14')).toBe(4934)
    expect(toSeconds('00:00:01')).toBe(1)
    expect(toSeconds('00:00:00')).toBe(0)
  })

  it('時が2桁を超えても読める', () => {
    expect(toSeconds('100:00:00')).toBe(360000)
  })

  it('読めない値は null', () => {
    expect(toSeconds('1:2')).toBe(null)
    expect(toSeconds('ほげ')).toBe(null)
    expect(toSeconds(null)).toBe(null)
  })
})

describe('toHHMMSS', () => {
  it('秒を HH:mm:ss にする', () => {
    expect(toHHMMSS(4934)).toBe('01:22:14')
    expect(toHHMMSS(0)).toBe('00:00:00')
    expect(toHHMMSS(59)).toBe('00:00:59')
  })

  it('24時間を超えても一周せず繰り上がる', () => {
    // moment.utc(ms).format('HH:mm:ss') は 01:00:00 を返していた
    expect(toHHMMSS(25 * 3600)).toBe('25:00:00')
  })

  it('端数は切り捨てる', () => {
    // 平均や中央値を取ると 0.5 秒が出る
    expect(toHHMMSS(90.5)).toBe('00:01:30')
  })

  it('読めない値は null', () => {
    expect(toHHMMSS(-1)).toBe(null)
    expect(toHHMMSS(NaN)).toBe(null)
  })

  it('toSeconds と往復して元に戻る', () => {
    for (const v of ['00:00:00', '00:12:34', '01:22:14', '12:34:56']) {
      expect(toHHMMSS(toSeconds(v))).toBe(v)
    }
  })
})

describe('toLocalSeconds', () => {
  it("moment の HTML5_FMT.DATETIME_LOCAL_SECONDS と同じ形にする", () => {
    // テストは TZ=UTC で走る（vitest.config.js）
    expect(toLocalSeconds(new Date('2026-09-10T23:06:45Z'))).toBe('2026-09-10T23:06:45')
  })

  it('1桁の月日時分秒を0で埋める', () => {
    expect(toLocalSeconds(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05')
  })

  it('null を渡したら null', () => {
    expect(toLocalSeconds(null)).toBe(null)
  })
})

describe('toStamp', () => {
  it('退避したディレクトリの名前に使う形', () => {
    expect(toStamp(new Date('2026-09-10T23:06:45Z'))).toBe('20260910-230645')
  })
})
