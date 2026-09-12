import { describe, it, expect } from 'vitest'
import requestFormValues from './request-form-values.js'

const channel = {
  title: 'fukabori.fm',
  feed: 'https://rss.art19.com/fukabori',
  apple: 'https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609'
}

describe('requestFormValues', () => {
  it('調べたフィードを、フォームの feed 欄へ渡す', () => {
    expect(requestFormValues({ channel }).feed).toBe('https://rss.art19.com/fukabori')
  })

  it('番組名と見ていたページは、本文へ入れる', () => {
    const { message } = requestFormValues({ channel, source: { url: 'https://open.spotify.com/show/abc' } })
    expect(message).toContain('番組名: fukabori.fm')
    expect(message).toContain('見ていたページ: https://open.spotify.com/show/abc')
  })

  // 見つからなかった番組も、分かっているぶんだけ持って行く
  it('フィードが無くても、分かっているぶんは渡す', () => {
    const values = requestFormValues({ channel: { title: 'なにか' }, source: { url: 'https://example.com' } })
    expect(values.feed).toBe(undefined)
    expect(values.message).toContain('番組名: なにか')
  })

  // 登録済みの番組から来た人の用は「登録」ではなく「修正」
  it('登録済みなら、キーを添えて修正のお願いにする', () => {
    const { message } = requestFormValues({ channel: { ...channel, matched: [{ key: 'fukabori', matchedBy: 'title' }] } })
    expect(message).toContain('登録済み: fukabori')
    expect(message).toContain('修正したい点をご記入ください。')
    expect(message).not.toContain('登録をお願いします。')
  })

  it('渡すものが無ければ、空のまま', () => {
    expect(requestFormValues()).toEqual({})
  })
})
