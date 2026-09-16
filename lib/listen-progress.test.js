import { describe, it, expect } from 'vitest'
import crossedMilestones from './listen-progress.js'

describe('crossedMilestones', () => {
  it('越えた区切りを返す', () => {
    expect(crossedMilestones(300, 1000)).toEqual([10, 25])
  })
  it('送り済みの区切りは返さない', () => {
    expect(crossedMilestones(300, 1000, [10])).toEqual([25])
    expect(crossedMilestones(300, 1000, [10, 25])).toEqual([])
  })
  it('ちょうど区切りの位置なら越えたとみなす', () => {
    expect(crossedMilestones(100, 1000)).toEqual([10])
  })
  it('長さが分からないときは何も返さない', () => {
    expect(crossedMilestones(300, NaN)).toEqual([])
    expect(crossedMilestones(300, 0)).toEqual([])
    expect(crossedMilestones(300, Infinity)).toEqual([])
  })
})
