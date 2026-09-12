import { describe, it, expect } from 'vitest'
import requestFormLink from './request-form-link.js'

const channel = {
  title: 'fukabori.fm',
  feed: 'https://rss.art19.com/fukabori',
  apple: 'https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609'
}

describe('requestFormLink', () => {
  it('調べたフィードを、フォームの feed 欄へ渡す', () => {
    const url = new URL(requestFormLink({ channel }), 'https://podcastfreaks.com')
    expect(url.pathname).toBe('/request/')
    expect(url.searchParams.get('feed')).toBe('https://rss.art19.com/fukabori')
  })

  it('番組名と見ていたページは、本文へ入れる', () => {
    const url = new URL(requestFormLink({ channel, source: { url: 'https://open.spotify.com/show/abc' } }), 'https://podcastfreaks.com')
    const message = url.searchParams.get('message')
    expect(message).toContain('番組名: fukabori.fm')
    expect(message).toContain('見ていたページ: https://open.spotify.com/show/abc')
  })

  // 見つからなかった番組も、分かっているぶんだけ持って行く
  it('フィードが無くても、分かっているぶんは渡す', () => {
    const url = new URL(requestFormLink({ channel: { title: 'なにか' }, source: { url: 'https://example.com' } }), 'https://podcastfreaks.com')
    expect(url.searchParams.get('feed')).toBe(null)
    expect(url.searchParams.get('message')).toContain('番組名: なにか')
  })

  it('渡すものが無ければ、そのままフォームへ', () => {
    expect(requestFormLink()).toBe('/request/')
  })
})
