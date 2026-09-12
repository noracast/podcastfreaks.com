import { describe, it, expect } from 'vitest'
import toChannels, { lookupUrl, searchUrl, episodeSearchUrl, collectionIds, toChannel } from './itunes.js'

describe('lookupUrl', () => {
  it('Apple のリンクの id から引く', () => {
    expect(lookupUrl('1388826609')).toContain('lookup?id=1388826609')
  })

  it('複数の id をまとめて渡せる（エピソード検索から番組を引くとき）', () => {
    expect(lookupUrl(['1', '2'])).toContain('lookup?id=1%2C2')
  })
})

describe('searchUrl / episodeSearchUrl', () => {
  it('番組を探すときは entity=podcast', () => {
    expect(searchUrl('fukabori.fm')).toContain('entity=podcast&')
  })

  it('エピソードを探すときは entity=podcastEpisode', () => {
    expect(episodeSearchUrl('#60 コードを書かないのに')).toContain('entity=podcastEpisode')
  })

  it('日本のストアで引く', () => {
    expect(searchUrl('x')).toContain('country=JP')
  })
})

describe('collectionIds', () => {
  // Spotify の oEmbed から得た最新エピソード名で引くと、その回が属する
  // 番組の id が分かる。同じ番組の回が並ぶので重複は落とす
  it('エピソードの検索結果から、番組の id を重複なく拾う', () => {
    expect(collectionIds({ results: [
      { collectionId: 1 }, { collectionId: 1 }, { collectionId: 2 }, {}
    ] })).toEqual([1, 2])
  })

  it('空の返事でも壊れない', () => {
    expect(collectionIds(null)).toEqual([])
  })
})

describe('toChannel', () => {
  const result = {
    collectionName: 'fukabori.fm',
    feedUrl: 'https://rss.art19.com/fukabori',
    collectionViewUrl: 'https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609?uo=4',
    artworkUrl600: 'https://is1-ssl.mzstatic.com/600x600bb.jpg',
    trackCount: 141,
    genres: ['テクノロジー']
  }

  it('使うものだけ取り出す', () => {
    expect(toChannel(result)).toMatchObject({
      title: 'fukabori.fm',
      feed: 'https://rss.art19.com/fukabori',
      trackCount: 141
    })
  })

  it('Apple のリンクから、計測用の uo=4 を落とす', () => {
    expect(toChannel(result).apple).toBe('https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609')
  })

  // フィードが無いものは登録できない。候補に出しても仕方がないので落とす
  it('フィードを持たないものは候補にしない', () => {
    expect(toChannel({ collectionName: 'x' })).toBe(null)
    expect(toChannels({ results: [{ collectionName: 'x' }, result] })).toHaveLength(1)
  })
})
