import { describe, it, expect } from 'vitest'
import frequencyLabel, { frequencyLevel } from './frequency-label.js'

describe('frequencyLabel', () => {
  it('更新間隔（日）を言葉に丸める', () => {
    expect(frequencyLabel(1)).toBe('毎日')
    expect(frequencyLabel(3)).toBe('週2〜3')
    expect(frequencyLabel(7)).toBe('毎週')
    expect(frequencyLabel(14)).toBe('隔週')
    expect(frequencyLabel(30)).toBe('月1')
    expect(frequencyLabel(60)).toBe('数ヶ月')
    expect(frequencyLabel(200)).toBe('年数回')
  })

  it('段の境目', () => {
    // under は「未満」
    expect(frequencyLabel(1.9)).toBe('毎日')
    expect(frequencyLabel(2)).toBe('週2〜3')
    expect(frequencyLabel(4.9)).toBe('週2〜3')
    expect(frequencyLabel(5)).toBe('毎週')
  })

  it('算出できない番組は null', () => {
    // 更新した日が1日分しかないと間隔を求められない
    expect(frequencyLabel(null)).toBe(null)
    expect(frequencyLabel(undefined)).toBe(null)
  })

  it('色分けに使う name も返る', () => {
    expect(frequencyLevel(7).name).toBe('weekly')
    expect(frequencyLevel(null)).toBe(null)
  })
})
