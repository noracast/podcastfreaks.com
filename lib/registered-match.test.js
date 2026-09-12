import { describe, it, expect } from 'vitest'
import matchRegistered, { normalizeFeed, normalizeTitle } from './registered-match.js'

// static/registered.json と同じ形（#229）
const registered = {
  fukabori: { feed: 'https://fukabori.fm/feed.xml', title: 'fukabori.fm' },
  rebuild: { feed: 'https://feeds.rebuild.fm/rebuildfm', title: 'Rebuild' },
  // フィードが落ちていて取得できなかった番組は、番組名が入らない
  broken: { feed: 'https://example.com/feed', title: null }
}

describe('normalizeFeed', () => {
  it('プロトコル・www・末尾のスラッシュの違いを無視する', () => {
    expect(normalizeFeed('http://www.Example.com/feed/')).toBe('example.com/feed')
  })

  it('クエリは残す（クエリで番組を分けるフィードがある）', () => {
    expect(normalizeFeed('https://example.com/feed?show=2')).toBe('example.com/feed?show=2')
  })
})

describe('normalizeTitle', () => {
  it('全角・半角・空白・大文字小文字の違いを無視する', () => {
    expect(normalizeTitle('ｆｕｋａｂｏｒｉ.ｆｍ')).toBe(normalizeTitle('Fukabori.fm'))
    expect(normalizeTitle('ゆる コンピュータ　科学ラジオ')).toBe('ゆるコンピュータ科学ラジオ')
  })
})

describe('matchRegistered', () => {
  it('フィードの URL が一致すれば登録済み', () => {
    const matched = matchRegistered(registered, { feed: 'https://fukabori.fm/feed.xml', title: '別の名前' })
    expect(matched).toHaveLength(1)
    expect(matched[0].key).toBe('fukabori')
    expect(matched[0].matchedBy).toBe('feed')
  })

  // こちらが FeedBurner 経由などで登録していると、Apple 側の feedUrl と
  // 食い違う。番組名でも見ないと取りこぼす
  it('フィードが違っても、番組名が一致すれば登録済みとして出す', () => {
    const matched = matchRegistered(registered, { feed: 'https://rss.art19.com/fukabori', title: 'fukabori.fm' })
    expect(matched).toHaveLength(1)
    expect(matched[0].key).toBe('fukabori')
    expect(matched[0].matchedBy).toBe('title')
  })

  it('どちらも当たらなければ空', () => {
    expect(matchRegistered(registered, { feed: 'https://example.org/rss', title: '新しい番組' })).toEqual([])
  })

  it('番組名を持たない登録（取得に失敗した番組）は、フィードだけで見る', () => {
    expect(matchRegistered(registered, { feed: 'https://example.com/feed', title: '' })[0].key).toBe('broken')
    expect(matchRegistered(registered, { feed: '', title: '' })).toEqual([])
  })

  it('一覧が読めなかったときは、判定せずに空を返す', () => {
    expect(matchRegistered(null, { feed: 'https://fukabori.fm/feed.xml' })).toEqual([])
  })
})
