import { describe, it, expect } from 'vitest'
import suggestKey, { fromHost, fromPath } from './suggest-key.js'

describe('fromHost', () => {
  it('独自ドメインは、そのまま番組名のことが多い', () => {
    expect(fromHost('https://fukabori.fm/')).toBe('fukabori.fm')
    expect(fromHost('https://www.ossan.fm/')).toBe('ossan.fm')
  })

  it('co.jp のような二段の TLD だけは落とす', () => {
    expect(fromHost('https://example.co.jp/')).toBe('example')
  })

  it('配信基盤のホストからは取らない。番組名にならない', () => {
    expect(fromHost('https://anchor.fm/s/107747d74/podcast/rss')).toBe('')
    expect(fromHost('https://feeds.soundcloud.com/users/soundcloud:users:1/sounds.rss')).toBe('')
    expect(fromHost('https://noracast.github.io/feed.xml')).toBe('')
  })

  it('URL でなければ空', () => {
    expect(fromHost('分かりません')).toBe('')
    expect(fromHost(null)).toBe('')
  })
})

describe('fromPath', () => {
  it('パスの末尾から slug を取る', () => {
    expect(fromPath('https://rss.art19.com/fukabori')).toBe('fukabori')
    expect(fromPath('https://listen.style/p/dotfm/rss')).toBe('dotfm')
  })

  it('feed や rss のような語は飛ばす', () => {
    expect(fromPath('https://example.com/blog/feed.xml')).toBe('blog')
    expect(fromPath('https://example.com/podcast/rss')).toBe('')
  })

  it('中身を持たない id は飛ばす（anchor.fm/s/<hex>）', () => {
    expect(fromPath('https://anchor.fm/s/107747d74/podcast/rss')).toBe('')
  })

  it('大文字や記号は、既存のキーに倣って落とす', () => {
    expect(fromPath('https://example.com/Design_FM/rss')).toBe('design-fm')
  })
})

describe('suggestKey', () => {
  it('本人の希望を先頭に置く', () => {
    const keys = suggestKey({
      wanted: 'noracast',
      link: 'https://noracast.jp/',
      feed: 'https://noracast.jp/feed.xml'
    })
    expect(keys[0]).toBe('noracast')
  })

  it('希望が無ければ、番組サイトの独自ドメインから', () => {
    const keys = suggestKey({
      link: 'https://fukabori.fm/',
      feed: 'https://rss.art19.com/fukabori',
      author: 'iwashi'
    })
    expect(keys[0]).toBe('fukabori.fm')
    expect(keys).toContain('fukabori')
  })

  it('配信基盤しか無いときは、パスの slug と itunes:author が頼り', () => {
    const keys = suggestKey({
      link: 'https://podcasters.spotify.com/pod/show/moozaru',
      feed: 'https://anchor.fm/s/107747d74/podcast/rss',
      author: 'moozaru',
      title: 'ムーザルのプログラミング絶望ラジオ'
    })
    expect(keys).toContain('moozaru')
    // 日本語だけの番組名からはキーを作れない
    expect(keys).not.toContain('')
  })

  it('同じ候補は1つにまとめる', () => {
    const keys = suggestKey({ wanted: 'ossan.fm', link: 'https://ossan.fm/', feed: 'https://ossan.fm/feed' })
    expect(keys.filter(k => k === 'ossan.fm')).toHaveLength(1)
  })

  it('1文字の候補は出さない。何の番組か分からない', () => {
    expect(suggestKey({ author: 'a' })).toEqual([])
  })

  it('手がかりが無ければ空。人が決める', () => {
    expect(suggestKey({})).toEqual([])
    expect(suggestKey({ title: 'のらきゃすと' })).toEqual([])
  })
})
