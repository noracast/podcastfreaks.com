// エピソードを指す短い id。
//
// 同じ値からは必ず同じ id が出ること、少し違うだけで別の id になることを
// 見ている。番組ごとの衝突の有無は、実データ（234フィード・23,723話）で
// 確かめたうえで長さを8文字に決めた。

import { describe, it, expect } from 'vitest'
import episodeId from './episode-id.js'

describe('episodeId', () => {
  it('8文字の16進になる', () => {
    expect(episodeId('https://rebuild.fm/431/')).toMatch(/^[0-9a-f]{8}$/)
  })

  it('同じ値からは同じ id', () => {
    expect(episodeId('https://rebuild.fm/431/')).toBe(episodeId('https://rebuild.fm/431/'))
  })

  it('1文字違えば別の id', () => {
    expect(episodeId('https://rebuild.fm/431/')).not.toBe(episodeId('https://rebuild.fm/432/'))
  })

  it('前後の空白は無視する', () => {
    // 要素の中で改行して書くフィードがある
    expect(episodeId('  abc\n')).toBe(episodeId('abc'))
  })

  it('中身が無ければ null', () => {
    expect(episodeId('')).toBe(null)
    expect(episodeId('   ')).toBe(null)
    expect(episodeId(null)).toBe(null)
    expect(episodeId(undefined)).toBe(null)
  })

  it('長い guid でも短い guid でも同じ長さになる', () => {
    const short = episodeId('1')
    const long = episodeId('https://example.com/' + 'a'.repeat(300))
    expect(short).toHaveLength(8)
    expect(long).toHaveLength(8)
  })

  // ここから下は、出てくる値そのものを書き留めてある。
  //
  // ビルドのたびに計算し直しても、同じ guid からは同じ id が出る。
  // 変わるとしたら、この畳み方をこちらで変えたときで、そうなると
  // それまでに配ったリンクが全部よそを指す。うっかり変えないための控え
  it('実際のフィードにある guid から出る値', () => {
    expect(episodeId('https://ossan.fm/episode/414')).toBe('6456b215')
    expect(episodeId('https://rebuild.fm/431/')).toBe('002548ae')
    // SoundCloud のように URL でない guid もある
    expect(episodeId('tag:soundcloud,2010:tracks/123456')).toBe('b76204f0')
  })

  it('短い値でも8文字に揃う', () => {
    expect(episodeId('1')).toBe('0002b5d6')
  })
})
