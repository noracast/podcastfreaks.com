import { describe, it, expect } from 'vitest'
import parseQuery from './parse-query.js'

describe('parseQuery', () => {
  it('URL と番組名を分ける', () => {
    expect(parseQuery('https://open.spotify.com/show/abc fukabori.fm')).toEqual({
      urls: ['https://open.spotify.com/show/abc'],
      name: 'fukabori.fm'
    })
  })

  it('URL はいくつでも受け取る', () => {
    const { urls } = parseQuery('https://fukabori.fm/ https://podcasts.apple.com/jp/podcast/x/id1 https://rss.art19.com/fukabori')
    expect(urls.length).toBe(3)
  })

  // 案内はしていないが、カンマで打たれても困らないようにする
  it('URL でない語は、カンマでも分ける', () => {
    expect(parseQuery('fukabori.fm,ゆる言語学ラジオ').name).toBe('fukabori.fm ゆる言語学ラジオ')
    expect(parseQuery('fukabori.fm、ゆる言語学ラジオ').name).toBe('fukabori.fm ゆる言語学ラジオ')
  })

  it('URL の前後に付いたカンマは落とす', () => {
    expect(parseQuery('https://example.com/feed, ゆる言語学ラジオ')).toEqual({
      urls: ['https://example.com/feed'],
      name: 'ゆる言語学ラジオ'
    })
  })

  // カンマは URL の中にも入りうる。区切りにすると URL を壊す
  it('URL の途中のカンマは、URL の一部として残す', () => {
    expect(parseQuery('https://example.com/a,b').urls).toEqual(['https://example.com/a,b'])
  })

  // 番組名に空白が入る形はそのまま残す
  it('URL でない語は繋ぎ直して番組名にする', () => {
    expect(parseQuery('Apple News Radio ワンボタンの声').name).toBe('Apple News Radio ワンボタンの声')
  })

  // 番組名がドメインの形をしていることが多い。/ が無ければ名前として扱う
  it('/ を含まないドメイン風の語は番組名', () => {
    expect(parseQuery('fukabori.fm')).toEqual({ urls: [], name: 'fukabori.fm' })
  })

  it('スキームが無くても、/ があれば URL として補う', () => {
    expect(parseQuery('radio.voiceofonebutton.net/').urls).toEqual(['https://radio.voiceofonebutton.net/'])
  })

  it('空なら何も返さない', () => {
    expect(parseQuery('')).toEqual({ urls: [], name: '' })
    expect(parseQuery('   ')).toEqual({ urls: [], name: '' })
  })
})
