import { describe, it, expect } from 'vitest'
import sortByGenre, { isTechish, mainGenre } from './tech-genres.js'

const tech = { title: 'Rebuild', genres: ['テクノロジー', 'ポッドキャスト'] }
const news = { title: 'NHKラジオニュース', genres: ['ニュース', 'ポッドキャスト'] }
const design = { title: 'Design Podcast', genres: ['デザイン', 'ポッドキャスト'] }

describe('mainGenre', () => {
  it('「ポッドキャスト」は飛ばして、最初のジャンルを出す', () => {
    expect(mainGenre(tech)).toBe('テクノロジー')
    expect(mainGenre({ genres: ['ポッドキャスト'] })).toBe('')
    expect(mainGenre()).toBe('')
  })
})

describe('isTechish', () => {
  it('テック寄りのジャンルを見分ける', () => {
    expect(isTechish(tech)).toBe(true)
    expect(isTechish(design)).toBe(true)
    expect(isTechish(news)).toBe(false)
  })
})

describe('sortByGenre', () => {
  it('テック寄りを前に出す', () => {
    expect(sortByGenre([news, tech]).map(c => c.title)).toEqual(['Rebuild', 'NHKラジオニュース'])
  })

  // 同じ組の中では、iTunes が返した順（確からしい順）を崩さない
  it('同じ組の中の順は変えない', () => {
    const a = { title: 'A', genres: ['ニュース'] }
    const b = { title: 'B', genres: ['コメディ'] }
    expect(sortByGenre([a, b, tech]).map(c => c.title)).toEqual(['Rebuild', 'A', 'B'])
  })

  it('元の配列は触らない', () => {
    const list = [news, tech]
    sortByGenre(list)
    expect(list[0].title).toBe('NHKラジオニュース')
  })
})

// 出している先頭のジャンルだけで見る。裏のジャンルで前に出ると、
// 画面に「マネジメント」と書いてあるのに上にいる、という見え方になる
describe('isTechish（2つ目以降のジャンル）', () => {
  it('先頭がテック寄りでなければ、後ろにテック寄りがあっても前に出さない', () => {
    const hbr = { title: 'HBR IdeaCast', genres: ['マネジメント', 'ポッドキャスト', 'ビジネス'] }
    expect(isTechish(hbr)).toBe(false)
    expect(sortByGenre([hbr, tech]).map(c => c.title)).toEqual(['Rebuild', 'HBR IdeaCast'])
  })
})
