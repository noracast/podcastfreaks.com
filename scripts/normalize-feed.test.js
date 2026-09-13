import { describe, it, expect } from 'vitest'
import normalizeFeed, { linkUrl } from './normalize-feed.js'

// xml2js（explicitArray: false）が返す形をそのまま書いている。
// 実際のフィードで踏んだ形を残しておくのが目的なので、
// 思いつきの入力ではなく「あった形」を並べる。

describe('linkUrl', () => {
  it('RSS の決まりどおり、本文に URL があるもの', () => {
    expect(linkUrl('https://example.com/1')).toBe('https://example.com/1')
  })

  it('RSS の中で Atom の書き方をしているもの（品モノラジオ）', () => {
    // <link href="http://shinamonoradio.github.io/blog/2023/10/21/065/"/>
    // これを素通しすると href の無い <a> が出来て、その番組だけ押せなくなる
    expect(linkUrl({ $: { href: 'https://example.com/2' } })).toBe('https://example.com/2')
  })

  it('属性が付いていても、本文があればそちらを使う', () => {
    expect(linkUrl({ _: 'https://example.com/3', $: { rel: 'alternate' } })).toBe('https://example.com/3')
  })

  it('複数並んでいたら、本文へのリンクを選ぶ（rel の付いた別物は飛ばす）', () => {
    const links = [
      { $: { href: 'https://example.com/feed.xml', rel: 'self' } },
      { $: { href: 'https://example.com/5' } }
    ]
    expect(linkUrl(links)).toBe('https://example.com/5')
  })

  it('前後の空白は落とす', () => {
    expect(linkUrl('  https://example.com/6\n')).toBe('https://example.com/6')
  })

  it('無いときは null。空文字を返すと、リンクとして出してしまう', () => {
    expect(linkUrl(null)).toBeNull()
    expect(linkUrl(undefined)).toBeNull()
    expect(linkUrl('')).toBeNull()
    expect(linkUrl('   ')).toBeNull()
    expect(linkUrl({})).toBeNull()
    expect(linkUrl({ $: { rel: 'self' } })).toBeNull()
  })
})

describe('normalizeFeed', () => {
  it('RSS 2.0 は channel をそのまま返す', () => {
    const channel = { title: 'foo', item: [] }
    expect(normalizeFeed({ rss: { channel } })).toBe(channel)
  })

  it('Atom は RSS の channel の形に直す', () => {
    const feed = {
      title: 'noracast',
      subtitle: 'テック系ポッドキャスト',
      link: [
        { $: { href: 'https://noracast.jp/feed.xml', rel: 'self' } },
        { $: { href: 'https://noracast.jp/' } }
      ],
      logo: 'https://noracast.jp/cover.png',
      entry: [{
        title: { _: '第1回', $: { type: 'text' } },
        link: { $: { href: 'https://noracast.jp/1' } },
        published: '2026-09-13T00:00:00+09:00',
        'itunes:duration': '01:02:03'
      }]
    }
    const channel = normalizeFeed({ feed })

    expect(channel.title).toBe('noracast')
    expect(channel.link).toBe('https://noracast.jp/')
    expect(channel.description).toBe('テック系ポッドキャスト')
    expect(channel.image.url).toBe('https://noracast.jp/cover.png')
    expect(channel.item).toHaveLength(1)
    // <title type="text"> のように属性が付くと { _, $ } になる
    expect(channel.item[0].title).toBe('第1回')
    expect(channel.item[0].link).toBe('https://noracast.jp/1')
    expect(channel.item[0].pubDate).toBe('2026-09-13T00:00:00+09:00')
  })

  it('Atom の enclosure は RSS の形に移す', () => {
    const feed = {
      entry: [{
        link: [
          { $: { href: 'https://noracast.jp/1' } },
          { $: { href: 'https://noracast.jp/1.mp3', rel: 'enclosure' } }
        ]
      }]
    }
    expect(normalizeFeed({ feed }).item[0].enclosure).toEqual({ $: { url: 'https://noracast.jp/1.mp3' } })
  })

  it('掲載拒否の指定は、Atom でも落とさずに渡す', () => {
    const channel = normalizeFeed({ feed: { 'itunes:block': 'yes', entry: [] } })
    expect(channel['itunes:block']).toBe('yes')
  })

  it('回が1つだけのときも配列にする（xml2js は単体を配列にしない）', () => {
    expect(normalizeFeed({ feed: { entry: { title: 'foo' } } }).item).toHaveLength(1)
  })

  it('対応していない形は null。中身の無いサイトを作らないため', () => {
    expect(normalizeFeed(null)).toBeNull()
    expect(normalizeFeed({})).toBeNull()
    expect(normalizeFeed({ html: {} })).toBeNull()
  })
})
