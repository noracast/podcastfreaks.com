import { describe, it, expect } from 'vitest'
import linkify from './linkify.js'

describe('linkify', () => {
  it('裸の URL をリンクにする', () => {
    expect(linkify('詳しくは https://example.com/ をどうぞ')).toBe(
      '詳しくは <a href="https://example.com/" target="_blank" rel="noopener">https://example.com/</a> をどうぞ'
    )
  })

  it('すでにリンクになっている URL は触らない', () => {
    const html = '<a href="https://example.com/">example</a>'
    expect(linkify(html)).toBe(html)
  })

  it('リンクの中に URL が書かれていても二重にしない', () => {
    const html = '<a href="https://example.com/">https://example.com/</a>'
    expect(linkify(html)).toBe(html)
  })

  it('タグの属性は対象にしない', () => {
    const html = '<p><a href="https://example.com/" target="_blank">見る</a></p>'
    expect(linkify(html)).toBe(html)
  })

  it('リンクを閉じたあとのテキストは対象にする', () => {
    expect(linkify('<a href="https://a.example/">a</a> と https://b.example/')).toBe(
      '<a href="https://a.example/">a</a> と <a href="https://b.example/" target="_blank" rel="noopener">https://b.example/</a>'
    )
  })

  it('1つのテキストに複数あってもすべてリンクにする', () => {
    expect(linkify('https://a.example/ https://b.example/')).toBe(
      '<a href="https://a.example/" target="_blank" rel="noopener">https://a.example/</a> ' +
      '<a href="https://b.example/" target="_blank" rel="noopener">https://b.example/</a>'
    )
  })

  it('URL のあとの句読点は本文として残す', () => {
    expect(linkify('https://example.com/。')).toBe(
      '<a href="https://example.com/" target="_blank" rel="noopener">https://example.com/</a>。'
    )
    expect(linkify('https://example.com/path.')).toBe(
      '<a href="https://example.com/path" target="_blank" rel="noopener">https://example.com/path</a>.'
    )
    expect(linkify('https://example.com/,')).toBe(
      '<a href="https://example.com/" target="_blank" rel="noopener">https://example.com/</a>,'
    )
  })

  it('閉じ括弧は、対になる開き括弧が URL に無いときだけ外す', () => {
    expect(linkify('(https://example.com/)')).toBe(
      '(<a href="https://example.com/" target="_blank" rel="noopener">https://example.com/</a>)'
    )
    expect(linkify('https://example.com/a_(b)')).toBe(
      '<a href="https://example.com/a_(b)" target="_blank" rel="noopener">https://example.com/a_(b)</a>'
    )
  })

  it('クエリ付きの URL をそのまま通す', () => {
    expect(linkify('https://example.com/?a=1&amp;b=2')).toBe(
      '<a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener">https://example.com/?a=1&amp;b=2</a>'
    )
  })

  it('全角文字は URL に含めない', () => {
    expect(linkify('https://example.com/です')).toBe(
      '<a href="https://example.com/" target="_blank" rel="noopener">https://example.com/</a>です'
    )
  })

  it('http と https 以外は対象にしない', () => {
    const html = 'mailto:foo@example.com と ftp://example.com/'
    expect(linkify(html)).toBe(html)
  })

  it('空の値はそのまま返す', () => {
    expect(linkify(null)).toBe(null)
    expect(linkify('')).toBe('')
  })
})
