// 再生位置の表示。プレーヤーを独立させたとき components/episode-player.vue から
// 切り出した。見た目の中でも数字なので、ここで固めておく。

import { describe, it, expect } from 'vitest'
import formatTime from './format-time.js'

describe('formatTime', () => {
  it('1時間未満は m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(9)).toBe('0:09')
    expect(formatTime(75)).toBe('1:15')
    expect(formatTime(3599)).toBe('59:59')
  })

  it('1時間以上は h:mm:ss（分は0で埋める）', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3661)).toBe('1:01:01')
    expect(formatTime(5172)).toBe('1:26:12')
  })

  it('秒未満は切り捨てる', () => {
    expect(formatTime(75.9)).toBe('1:15')
  })

  it("読み取れないときは '--:--'", () => {
    // フィードに長さが無い番組がある。音声を読み込むまで分からない
    expect(formatTime(NaN)).toBe('--:--')
    expect(formatTime(Infinity)).toBe('--:--')
    expect(formatTime(-1)).toBe('--:--')
    expect(formatTime(undefined)).toBe('--:--')
  })
})
