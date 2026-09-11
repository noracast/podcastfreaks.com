// 一覧の並べ替え。vue-tables-2 から自前の table へ移したときに、
// 234行の並びが1つも変わらないことを確かめながら移植した部分。
// ここが変わると表の見え方が変わるので、振る舞いを固めておく。

import { describe, it, expect } from 'vitest'
import { compareBy, compareInterval } from './compare.js'

const sort = (rows, cmp) => rows.slice().sort(cmp)

describe('compareBy', () => {
  it('文字列を昇順・降順に並べる', () => {
    const rows = [{ t: 'banana' }, { t: 'apple' }, { t: 'cherry' }]
    expect(sort(rows, compareBy('t', true)).map(r => r.t)).toEqual(['apple', 'banana', 'cherry'])
    expect(sort(rows, compareBy('t', false)).map(r => r.t)).toEqual(['cherry', 'banana', 'apple'])
  })

  it('大文字小文字を区別しない', () => {
    const rows = [{ t: 'Zebra' }, { t: 'apple' }]
    expect(sort(rows, compareBy('t', true)).map(r => r.t)).toEqual(['apple', 'Zebra'])
  })

  it('数値を大小で並べる（文字列としてではなく）', () => {
    const rows = [{ n: 9 }, { n: 100 }, { n: 30 }]
    expect(sort(rows, compareBy('n', true)).map(r => r.n)).toEqual([9, 30, 100])
  })

  it('null と空文字は「空」として同じ扱いになり、昇順では先頭に来る', () => {
    // Duration が N/A の番組がこれ。値を持つものより前に集まる
    const rows = [{ d: '02:00:00' }, { d: null }, { d: '00:30:00' }, { d: '' }]
    const asc = sort(rows, compareBy('d', true)).map(r => r.d)
    expect(asc.slice(0, 2).every(v => !v)).toBe(true)
    expect(asc.slice(2)).toEqual(['00:30:00', '02:00:00'])
  })

  it('0 も「空」として扱われる（|| の挙動をそのまま引き継いでいる）', () => {
    const rows = [{ n: 5 }, { n: 0 }, { n: 3 }]
    expect(sort(rows, compareBy('n', true)).map(r => r.n)).toEqual([0, 3, 5])
  })

  it('同じ値でも 0 を返さない', () => {
    // Array#sort の作法からは外れるが、vue-tables-2 の既定がこうだった。
    // 直すと同じ日付・同じ話数の行の並びが変わってしまう
    const cmp = compareBy('t', true)
    expect(cmp({ t: 'same' }, { t: 'same' })).toBe(-1)
    expect(compareBy('t', false)({ t: 'same' }, { t: 'same' })).toBe(1)
  })

  it('日付は YYYY-MM-DD の文字列のまま比べても並ぶ', () => {
    const rows = [
      { d: '2026-09-10T12:00:00' },
      { d: '2025-07-20T09:00:00' },
      { d: '2026-09-11T08:00:00' }
    ]
    expect(sort(rows, compareBy('d', false)).map(r => r.d[8] + r.d[9])).toEqual(['11', '10', '20'])
  })
})

describe('compareInterval', () => {
  it('間隔の短い順・長い順に並べる', () => {
    const rows = [{ updateInterval: 7 }, { updateInterval: 1 }, { updateInterval: 30 }]
    expect(sort(rows, compareInterval(true)).map(r => r.updateInterval)).toEqual([1, 7, 30])
    expect(sort(rows, compareInterval(false)).map(r => r.updateInterval)).toEqual([30, 7, 1])
  })

  it('算出できない番組（N/A）は昇順でも降順でも末尾に集まる', () => {
    // 更新した日が1日分しかない番組がこれ。数値の間に紛れると
    // N/A が飛び飛びに現れて読みにくい
    const rows = [{ updateInterval: 7 }, { updateInterval: null }, { updateInterval: 1 }]
    expect(sort(rows, compareInterval(true)).map(r => r.updateInterval)).toEqual([1, 7, null])
    expect(sort(rows, compareInterval(false)).map(r => r.updateInterval)).toEqual([7, 1, null])
  })

  it('N/A どうしは同じ扱い', () => {
    expect(compareInterval(true)({ updateInterval: null }, { updateInterval: null })).toBe(0)
  })
})
