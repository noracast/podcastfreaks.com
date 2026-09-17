import { describe, it, expect } from 'vitest'
import parseRequestIssue, { normalizeTwitter, normalizeHashtag } from './parse-request-issue.js'
import { issueBody } from '../lib/register-request-issue.js'

describe('parseRequestIssue', () => {
  it('リクエストページが作った本文を、そのまま読める', () => {
    // 送り出す側（lib/register-request-issue.js）と噛み合っていることを、
    // 文字列を書き写さずに確かめる。片方だけ直しても気づけるように
    const body = issueBody({
      channel: {
        title: 'noracast',
        feed: 'https://noracast.jp/feed.xml',
        apple: 'https://podcasts.apple.com/jp/podcast/noracast/id1234567890',
        trackCount: 42,
        releaseDate: '2026-09-13T00:00:00Z',
        genres: ['テクノロジー', 'ポッドキャスト']
      },
      source: { url: 'https://noracast.jp/', title: 'noracast' }
    })
    const parsed = parseRequestIssue(body)

    expect(parsed.isRequest).toBe(true)
    expect(parsed.title).toBe('noracast')
    expect(parsed.feed).toBe('https://noracast.jp/feed.xml')
    expect(parsed.apple).toBe('https://podcasts.apple.com/jp/podcast/noracast/id1234567890')
    expect(parsed.sourceUrl).toBe('https://noracast.jp/')
    // 空のまま送られる欄
    expect(parsed.twitter).toBeNull()
    expect(parsed.hashtag).toBeNull()
    expect(parsed.key).toBeNull()
  })

  it('人が書き足した欄も読む', () => {
    const parsed = parseRequestIssue([
      '- 番組名: noracast',
      '- フィード: https://noracast.jp/feed.xml',
      '- X: @noracast_',
      '- ハッシュタグ: #noracast',
      '- キーの希望: noracast'
    ].join('\n'))
    expect(parsed.twitter).toBe('@noracast_')
    expect(parsed.hashtag).toBe('#noracast')
    expect(parsed.key).toBe('noracast')
  })

  it('こちらが本文に書いた案内（引用）は読まない', () => {
    const parsed = parseRequestIssue([
      '- フィード: ',
      '> フィード（RSS）の URL が分かれば、上の「フィード」に書き足してください。',
      '- 番組名: noracast'
    ].join('\n'))
    expect(parsed.feed).toBeNull()
    expect(parsed.title).toBe('noracast')
  })

  it('書き方の揺れを吸収する（全角コロン・強調・マークダウンのリンク）', () => {
    const parsed = parseRequestIssue([
      '* **フィード**：[RSS](https://noracast.jp/feed.xml)',
      '+ タイトル: `noracast`'
    ].join('\n'))
    expect(parsed.feed).toBe('https://noracast.jp/feed.xml')
    expect(parsed.title).toBe('noracast')
  })

  it('フィードも番組名も無ければ、リクエストとして扱わない', () => {
    expect(parseRequestIssue('ただの雑談です').isRequest).toBe(false)
    expect(parseRequestIssue('').isRequest).toBe(false)
    expect(parseRequestIssue(null).isRequest).toBe(false)
  })

  it('番組名だけでもリクエストとして扱う。フィードは人が足せる', () => {
    expect(parseRequestIssue('- 番組名: noracast').isRequest).toBe(true)
  })

  it('フィードの欄に URL でないものが入っていたら受け取らない', () => {
    expect(parseRequestIssue('- フィード: 分かりません').feed).toBeNull()
    expect(parseRequestIssue('- フィード: ftp://example.com/feed').feed).toBeNull()
  })

  it('同じラベルが2回あれば、最初のものを採る', () => {
    const parsed = parseRequestIssue([
      '- フィード: https://a.example/1',
      '- フィード: https://b.example/2'
    ].join('\n'))
    expect(parsed.feed).toBe('https://a.example/1')
  })

  it('キーは英数字とハイフンだけ。それ以外は人が決め直す', () => {
    expect(parseRequestIssue('- キーの希望: design-fm').key).toBe('design-fm')
    expect(parseRequestIssue('- キーの希望: CEO.FM').key).toBe('CEO.FM')
    expect(parseRequestIssue('- キーの希望: のらきゃすと').key).toBeNull()
    expect(parseRequestIssue('- キーの希望: ../../etc/passwd').key).toBeNull()
    expect(parseRequestIssue('- キーの希望: a b').key).toBeNull()
  })
})

describe('normalizeTwitter', () => {
  it('@ の有無どちらでも受ける', () => {
    expect(normalizeTwitter('@noracast_')).toBe('@noracast_')
    expect(normalizeTwitter('noracast_')).toBe('@noracast_')
  })

  it('URL で書かれても拾う', () => {
    expect(normalizeTwitter('https://x.com/noracast_')).toBe('@noracast_')
    expect(normalizeTwitter('https://twitter.com/@noracast_')).toBe('@noracast_')
  })

  it('アカウント名として成り立たないものは受け取らない', () => {
    expect(normalizeTwitter('')).toBeNull()
    expect(normalizeTwitter('分かりません')).toBeNull()
    expect(normalizeTwitter('@' + 'a'.repeat(16))).toBeNull()
  })
})

describe('normalizeHashtag', () => {
  it('# の有無どちらでも受ける（全角も）', () => {
    expect(normalizeHashtag('#noracast')).toBe('#noracast')
    expect(normalizeHashtag('noracast')).toBe('#noracast')
    expect(normalizeHashtag('＃電器屋Walker')).toBe('#電器屋Walker')
  })

  it('検索の URL で書かれても拾う', () => {
    expect(normalizeHashtag('https://x.com/search?q=%23noracast')).toBe('#noracast')
  })

  it('空白を含むものは受け取らない。タグとして成り立たない', () => {
    expect(normalizeHashtag('no racast')).toBeNull()
    expect(normalizeHashtag('')).toBeNull()
  })
})
