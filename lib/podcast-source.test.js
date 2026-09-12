import { describe, it, expect } from 'vitest'
import searchTerms, { appleIdFromUrl, cleanTitle, detectSource, hostLabel, startsWithHostLabel } from './podcast-source.js'

describe('appleIdFromUrl', () => {
  it('Apple のリンクから番組の id を取る', () => {
    expect(appleIdFromUrl('https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609')).toBe('1388826609')
  })

  it('エピソードを指す ?i= は拾わない（番組の id だけを見る）', () => {
    expect(appleIdFromUrl('https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609?i=1000712345678')).toBe('1388826609')
  })

  it('古い itunes.apple.com の形も同じ', () => {
    expect(appleIdFromUrl('https://itunes.apple.com/jp/podcast/rebuild/id622756625?mt=2')).toBe('622756625')
  })

  it('Apple 以外は null', () => {
    expect(appleIdFromUrl('https://open.spotify.com/show/0Xv0mdlCqUzQQ2KAMbbPUE')).toBe(null)
    expect(appleIdFromUrl('')).toBe(null)
  })
})

describe('detectSource', () => {
  it('サービスを見分ける', () => {
    expect(detectSource('https://podcasts.apple.com/jp/podcast/x/id123').kind).toBe('apple')
    expect(detectSource('https://open.spotify.com/show/abc').kind).toBe('spotify')
    expect(detectSource('https://www.youtube.com/@noracast').kind).toBe('youtube')
    expect(detectSource('https://youtu.be/abc').kind).toBe('youtube')
    expect(detectSource('https://fukabori.fm/').kind).toBe('site')
  })

  it('URL として読めないものは unknown', () => {
    expect(detectSource('fukabori').kind).toBe('unknown')
    expect(detectSource('').kind).toBe('unknown')
  })
})

describe('cleanTitle', () => {
  it('サービス名の接尾辞を落とす', () => {
    expect(cleanTitle('fukabori.fm | Podcast on Spotify')).toBe('fukabori.fm')
    expect(cleanTitle('ゆるコンピュータ科学ラジオ - YouTube')).toBe('ゆるコンピュータ科学ラジオ')
    expect(cleanTitle('Rebuild on Apple Podcasts')).toBe('Rebuild')
  })

  it('重なって付いていても、まとめて落とす', () => {
    expect(cleanTitle('fukabori.fm | ポッドキャスト | Spotify')).toBe('fukabori.fm')
  })

  it('Apple がタイトルの先頭に入れる不可視文字を取る', () => {
    expect(cleanTitle('‎fukabori.fm on Apple Podcasts')).toBe('fukabori.fm')
  })

  it('知らない語は落とさない（番組名の一部でありうる）', () => {
    expect(cleanTitle('Ossan.fm - 大人のポッドキャスト')).toBe('Ossan.fm - 大人のポッドキャスト')
  })
})

describe('hostLabel', () => {
  it('番組サイトのホスト名から、番組名になりそうな部分を取る', () => {
    expect(hostLabel('https://fukabori.fm/')).toBe('fukabori')
    expect(hostLabel('https://www.ossan.fm/episode/1')).toBe('ossan')
  })

  it('Spotify や Apple のような配信サービスは対象にしない', () => {
    expect(hostLabel('https://open.spotify.com/show/abc')).toBe('')
    expect(hostLabel('https://podcasts.apple.com/jp/podcast/x/id1')).toBe('')
    expect(hostLabel('')).toBe('')
  })
})

describe('searchTerms', () => {
  it('タイトルを整えたものを最初に試す', () => {
    expect(searchTerms({ url: 'https://open.spotify.com/show/abc', title: 'fukabori.fm | Podcast on Spotify' }))
      .toEqual(['fukabori.fm'])
  })

  it('区切りの前半も候補に足す（後ろに説明が続く形）', () => {
    expect(searchTerms({ url: 'https://fukabori.fm/', title: 'fukabori.fm | ソフトウェアエンジニアのための' }))
      .toEqual(['fukabori.fm | ソフトウェアエンジニアのための', 'fukabori.fm'])
  })

  // ホスト名は searchTerms に混ぜない。iTunes の検索は説明文や作者欄にも
  // 当たるため、example.com のような語だと無関係な番組が並ぶ。
  // ホスト名で引くのは hostLabel を使った別の経路にしてある
  it('タイトルから作った語だけを返す', () => {
    expect(searchTerms({ url: 'https://www.ossan.fm/episode/1', title: '第1回 | Ossan.fm' }))
      .toEqual(['第1回 | Ossan.fm', '第1回'])
  })

  it('1文字の語は使わない（無関係なものが大量に返る）', () => {
    expect(searchTerms({ url: '', title: 'あ' })).toEqual([])
  })

  it('何も無ければ空', () => {
    expect(searchTerms()).toEqual([])
  })
})

describe('startsWithHostLabel', () => {
  it('ホスト名で引いた結果は、番組名がその語で始まるものだけ通す', () => {
    expect(startsWithHostLabel('fukabori.fm', 'fukabori')).toBe(true)
    expect(startsWithHostLabel('Ossan.fm', 'ossan')).toBe(true)
  })

  // 「含む」で見ていたときは、example で引くと4件並んだ
  it('語を含むだけの番組は通さない', () => {
    expect(startsWithHostLabel('Lead By Example with Bob Myers', 'example')).toBe(false)
  })

  it('空の値は通さない', () => {
    expect(startsWithHostLabel('', 'ossan')).toBe(false)
    expect(startsWithHostLabel('Ossan.fm', '')).toBe(false)
  })
})
