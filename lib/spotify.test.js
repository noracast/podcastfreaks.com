import { describe, it, expect } from 'vitest'
import oembedUrl, { isSpotifyUrl } from './spotify.js'

describe('isSpotifyUrl', () => {
  it('Spotify のページかどうかを見る', () => {
    expect(isSpotifyUrl('https://open.spotify.com/show/5shHRr8lQqdbvcY3ZrXnG0')).toBe(true)
    expect(isSpotifyUrl('https://open.spotify.com/episode/abc')).toBe(true)
    expect(isSpotifyUrl('https://podcasts.apple.com/jp/podcast/x/id1')).toBe(false)
    expect(isSpotifyUrl('')).toBe(false)
  })
})

describe('oembedUrl', () => {
  // oEmbed が返す title は番組名ではなく最新エピソード名。
  // それをエピソードとして検索して番組へ辿る（lib/itunes.js）
  it('番組のページでもエピソードのページでも、同じ形で問い合わせる', () => {
    expect(oembedUrl('https://open.spotify.com/show/abc'))
      .toBe('https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Fshow%2Fabc')
  })

  it('Spotify 以外は null', () => {
    expect(oembedUrl('https://fukabori.fm/')).toBe(null)
  })
})
