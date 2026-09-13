import { describe, it, expect } from 'vitest'
import fs from 'fs'
import addChannelEntry, { entryBlock } from './add-channel-entry.js'

const FILE = [
  '{',
  '  "10xfm": {',
  '    "feed": "https://anchor.fm/s/559fd878/podcast/rss",',
  '    "twitter": null,',
  '    "hashtag": "#10xfm"',
  '  },',
  '  "CEO.FM": {',
  '    "feed": "https://ceo.fm/feed",',
  '    "twitter": "@tchikuba",',
  '    "hashtag": null',
  '  },',
  '  "ossanfm": {',
  '    "feed": "https://ossan.fm/feed.xml",',
  '    "twitter": "@ossanfm",',
  '    "hashtag": "#ossanfm"',
  '  }',
  '}',
  ''
].join('\n')

const keysOf = (text) => Object.keys(JSON.parse(text))

describe('addChannelEntry', () => {
  it('並びの途中に挿し込む', () => {
    const next = addChannelEntry(FILE, { key: 'noracast', feed: 'https://noracast.jp/feed.xml', twitter: '@noracast_', hashtag: '#noracast' })
    expect(keysOf(next)).toEqual(['10xfm', 'CEO.FM', 'noracast', 'ossanfm'])
    expect(JSON.parse(next).noracast).toEqual({
      feed: 'https://noracast.jp/feed.xml',
      twitter: '@noracast_',
      hashtag: '#noracast'
    })
  })

  it('一番うしろにも足せる。直前の項目にカンマを足す', () => {
    const next = addChannelEntry(FILE, { key: 'zzz', feed: 'https://zzz.example/feed' })
    expect(keysOf(next)).toEqual(['10xfm', 'CEO.FM', 'ossanfm', 'zzz'])
    expect(next.endsWith('}\n')).toBe(true)
  })

  it('一番先頭にも足せる', () => {
    const next = addChannelEntry(FILE, { key: '01radio', feed: 'https://01.example/feed' })
    expect(keysOf(next)).toEqual(['01radio', '10xfm', 'CEO.FM', 'ossanfm'])
  })

  it('並びは素の比較。数字 → 大文字 → 小文字の順（いまのファイルに揃える）', () => {
    const next = addChannelEntry(FILE, { key: 'Design.FM', feed: 'https://design.example/feed' })
    expect(keysOf(next)).toEqual(['10xfm', 'CEO.FM', 'Design.FM', 'ossanfm'])
  })

  it('足した1件のぶん以外は、1バイトも動かさない', () => {
    const next = addChannelEntry(FILE, { key: 'noracast', feed: 'https://noracast.jp/feed.xml' })
    const added = next.split('\n').filter(line => !FILE.split('\n').includes(line))
    // 増えるのは新しい項目の行だけ（値が同じ行は元からあるものと区別できないので、
    // 行数の差で見る）
    expect(next.split('\n').length - FILE.split('\n').length).toBe(5)
    expect(added.join('\n')).toContain('noracast')
  })

  it('X とハッシュタグが無ければ null で書く', () => {
    const next = addChannelEntry(FILE, { key: 'noracast', feed: 'https://noracast.jp/feed.xml' })
    expect(next).toContain('"twitter": null')
    expect(JSON.parse(next).noracast.hashtag).toBeNull()
  })

  it('同じキーがあれば止める', () => {
    expect(() => addChannelEntry(FILE, { key: 'ossanfm', feed: 'https://other.example/feed' }))
      .toThrow(/すでに使われています/)
  })

  it('同じフィードがあれば止める。キーを変えても二重登録になる', () => {
    expect(() => addChannelEntry(FILE, { key: 'ossan2', feed: 'https://ossan.fm/feed.xml' }))
      .toThrow(/すでに登録されています/)
  })

  it('キーやフィードが欠けていれば止める', () => {
    expect(() => addChannelEntry(FILE, { feed: 'https://x.example/feed' })).toThrow()
    expect(() => addChannelEntry(FILE, { key: 'x' })).toThrow()
  })

  it('本物の data/rss.json に足しても、JSON として読めて1件だけ増える', () => {
    // noracast は既に登録されているので、まだ無いキーで試す
    const text = fs.readFileSync('data/rss.json', 'utf8')
    const before = keysOf(text)
    const next = addChannelEntry(text, { key: 'zz-example-fm', feed: 'https://zz-example.test/feed.xml', twitter: '@zz_example', hashtag: '#zzexample' })
    const after = keysOf(next)
    expect(after.length).toBe(before.length + 1)
    expect(after).toContain('zz-example-fm')
    // 既存の並びは変えない
    expect(after.filter(k => k !== 'zz-example-fm')).toEqual(before)
  })

  it('本物のファイルでも、足した行以外は変わらない', () => {
    const text = fs.readFileSync('data/rss.json', 'utf8')
    const next = addChannelEntry(text, { key: 'zz-example-fm', feed: 'https://zz-example.test/feed.xml' })
    // 増えた5行と、カンマが1つ増えた行を除けば、元の行がそのまま残っている
    expect(next.split('\n').length - text.split('\n').length).toBe(5)
  })
})

describe('entryBlock', () => {
  it('既存の項目と同じ書き方にする', () => {
    expect(entryBlock({ key: 'noracast', feed: 'https://noracast.jp/feed.xml', twitter: '@noracast_', hashtag: '#noracast' }))
      .toBe([
        '  "noracast": {',
        '    "feed": "https://noracast.jp/feed.xml",',
        '    "twitter": "@noracast_",',
        '    "hashtag": "#noracast"',
        '  }'
      ].join('\n'))
  })

  it('日本語のハッシュタグは、そのまま読める形で書く', () => {
    expect(entryBlock({ key: 'denkiya', feed: 'https://example.com/feed', hashtag: '#電器屋Walker' }))
      .toContain('"hashtag": "#電器屋Walker"')
  })
})
