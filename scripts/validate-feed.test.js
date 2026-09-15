import { describe, it, expect } from 'vitest'
import validateFeed, { coverUrl } from './validate-feed.js'

// xml2js（explicitArray: false）が返す形で書く。
// 過去に踏んだ形（#48）をそのまま置いておくのが目的。

const episode = (extra = {}) => ({
  title: '第1回',
  pubDate: 'Sat, 13 Sep 2026 00:00:00 +0900',
  enclosure: { $: { url: 'https://example.com/1.mp3', type: 'audio/mpeg' } },
  'itunes:duration': '01:02:03',
  ...extra
})

const feed = (channel = {}) => ({
  rss: {
    channel: {
      title: 'noracast',
      link: 'https://noracast.jp/',
      'itunes:image': { $: { href: 'https://noracast.jp/cover.jpg' } },
      item: [episode()],
      ...channel
    }
  }
})

describe('validateFeed', () => {
  it('ふつうのポッドキャストは通る', () => {
    const result = validateFeed(feed())
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.info).toMatchObject({
      title: 'noracast',
      link: 'https://noracast.jp/',
      items: 1,
      withAudio: 1,
      cover: 'https://noracast.jp/cover.jpg'
    })
  })

  it('読めないものは止める。番組ページの URL を送られた場合など', () => {
    const result = validateFeed({ html: { body: {} } })
    expect(result.ok).toBe(false)
    expect(result.errors[0]).toContain('読めません')
  })

  it('エピソードが1件も無ければ止める', () => {
    const result = validateFeed(feed({ item: [] }))
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('エピソード')
  })

  it('音声を持つエピソードが1件も無ければ止める（#48 の本題）', () => {
    // 記事用のフィードを掴むと、item はあるのに enclosure が無い。
    // clfreaks・denkiya を実際にこれで登録してしまっていた
    const result = validateFeed(feed({ item: [{ title: '記事', pubDate: 'x' }] }))
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toContain('記事用のフィード')
  })

  it('itunes:block があれば止める。配信者が掲載を拒否している', () => {
    expect(validateFeed(feed({ 'itunes:block': 'yes' })).ok).toBe(false)
    expect(validateFeed(feed({ 'podcast:block': 'yes' })).ok).toBe(false)
  })

  it('空の block も止める。省略形で書く配信元がある', () => {
    expect(validateFeed(feed({ 'itunes:block': '' })).ok).toBe(false)
    expect(validateFeed(feed({ 'itunes:block': { $: { foo: 'bar' } } })).ok).toBe(false)
  })

  it('block: no は止めない。はっきり許可している', () => {
    expect(validateFeed(feed({ 'itunes:block': 'no' })).ok).toBe(true)
  })

  it('収録時間が読めなくても登録は通す。/errors に警告が出るだけ', () => {
    const result = validateFeed(feed({ item: [episode({ 'itunes:duration': 'ながい' })] }))
    expect(result.ok).toBe(true)
    expect(result.warnings.join()).toContain('itunes:duration')
    expect(result.info.withDuration).toBe(0)
  })

  it('収録時間が 0 のものは読めた数に入れない', () => {
    const result = validateFeed(feed({ item: [episode({ 'itunes:duration': '00:00:00' })] }))
    expect(result.info.withDuration).toBe(0)
  })

  it('カバー画像が無くても通すが、警告は出す', () => {
    const result = validateFeed(feed({ 'itunes:image': undefined }))
    expect(result.ok).toBe(true)
    expect(result.warnings.join()).toContain('カバー画像')
    expect(result.info.cover).toBeNull()
  })

  it('Atom のフィードも読める', () => {
    const result = validateFeed({
      feed: {
        title: 'noracast',
        link: [{ $: { href: 'https://noracast.jp/' } }],
        'itunes:image': { $: { href: 'https://noracast.jp/cover.jpg' } },
        entry: [{
          title: '第1回',
          link: [
            { $: { href: 'https://noracast.jp/1' } },
            { $: { href: 'https://noracast.jp/1.mp3', rel: 'enclosure' } }
          ],
          published: '2026-09-13T00:00:00+09:00',
          'itunes:duration': '01:02:03'
        }]
      }
    })
    expect(result.ok).toBe(true)
    expect(result.info.withAudio).toBe(1)
  })

  it('エピソードが1件のときも配列として数える（xml2js は単体を配列にしない）', () => {
    const result = validateFeed(feed({ item: episode() }))
    expect(result.info.items).toBe(1)
    expect(result.ok).toBe(true)
  })
})

describe('coverUrl', () => {
  it('itunes:image が最優先', () => {
    const channel = {
      'itunes:image': { $: { href: 'https://example.com/a.jpg' } },
      image: { url: 'https://example.com/b.jpg' }
    }
    expect(coverUrl(channel)).toBe('https://example.com/a.jpg')
  })

  it('無ければ image/url', () => {
    expect(coverUrl({ image: { url: 'https://example.com/b.jpg' } })).toBe('https://example.com/b.jpg')
  })

  it('どちらも無ければ null', () => {
    expect(coverUrl({})).toBeNull()
  })
})
