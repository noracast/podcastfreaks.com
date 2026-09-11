// 収録時間の丸め方。段の境目を間違えるとバッジの色と数字が変わる。
//
// このテストを書いたのは、moment から dayjs へ移したときに
// hours() / minutes()（moment の書き方）がそのまま残っていて、
// dayjs には無いために画面が500で落ちたため。同じ取りこぼしを防ぐ。

import { describe, it, expect } from 'vitest'
import { roughlyMinutes, durationClass, minutesOf, isOver, durationTooltip } from './duration-label.js'

describe('roughlyMinutes', () => {
  it('段ごとに丸める', () => {
    expect(roughlyMinutes('00:10:00')).toBe('15')
    expect(roughlyMinutes('00:25:00')).toBe('30')
    expect(roughlyMinutes('00:40:00')).toBe('45')
    expect(roughlyMinutes('00:50:00')).toBe('60')
    expect(roughlyMinutes('01:10:00')).toBe('90')
    expect(roughlyMinutes('01:45:00')).toBe('120')
    expect(roughlyMinutes('02:30:00')).toBe('120+')
  })

  it('段の境目は秒まで見る（About の凡例どおり）', () => {
    // 〜15分00秒
    expect(roughlyMinutes('00:15:00')).toBe('15')
    // 15分を超えて30分まで
    expect(roughlyMinutes('00:15:01')).toBe('30')
    expect(roughlyMinutes('00:30:00')).toBe('30')
    // 30分を超えて45分まで
    expect(roughlyMinutes('00:30:01')).toBe('45')
    expect(roughlyMinutes('00:45:00')).toBe('45')
    // 45分を超えて1時間未満
    expect(roughlyMinutes('00:45:01')).toBe('60')
    expect(roughlyMinutes('00:59:59')).toBe('60')
    // 1時間から1時間29分まで
    expect(roughlyMinutes('01:00:00')).toBe('90')
    expect(roughlyMinutes('01:29:59')).toBe('90')
    // 1時間30分から1時間59分まで
    expect(roughlyMinutes('01:30:00')).toBe('120')
    expect(roughlyMinutes('01:59:59')).toBe('120')
    // 2時間以上
    expect(roughlyMinutes('02:00:00')).toBe('120+')
  })

  it('読み取れない番組は null', () => {
    expect(roughlyMinutes(null)).toBe(null)
    expect(roughlyMinutes('')).toBe(null)
    expect(roughlyMinutes('これは時間ではない')).toBe(null)
  })
})

describe('バッジの見た目', () => {
  it('色分けのクラス名', () => {
    expect(durationClass('00:10:00')).toBe('min15')
    expect(durationClass('02:30:00')).toBe('min120plus')
    expect(durationClass(null)).toBe(null)
  })

  it('数値と + を分けて出す', () => {
    // 「120+分」ではなく「120分+」と並べたいため
    expect(minutesOf('02:30:00')).toBe('120')
    expect(isOver('02:30:00')).toBe(true)
    expect(minutesOf('00:10:00')).toBe('15')
    expect(isOver('00:10:00')).toBe(false)
  })
})

describe('durationTooltip', () => {
  it('1時間を超えるものは秒を出さない', () => {
    expect(durationTooltip('01:15:30')).toBe('収録時間の中央値: 1時間15分')
    expect(durationTooltip('02:00:00')).toBe('収録時間の中央値: 2時間')
  })

  it('1時間未満は分と秒', () => {
    expect(durationTooltip('00:25:40')).toBe('収録時間の中央値: 25分40秒')
    expect(durationTooltip('00:25:00')).toBe('収録時間の中央値: 25分')
  })

  it('1分に満たない番組は秒だけ', () => {
    // フィードの値がおかしいものが実際にある。
    // 分だけで出すと「0分」になってしまう
    expect(durationTooltip('00:00:45')).toBe('収録時間の中央値: 45秒')
  })

  it('読み取れないものは null', () => {
    expect(durationTooltip(null)).toBe(null)
    expect(durationTooltip('だめな値')).toBe(null)
  })
})
