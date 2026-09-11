// 再生状態の持ち回り。
//
// Audio はブラウザにしか無いので、ここで確かめるのは状態の方だけ
// （import.meta.client が偽のときは音を出さずに状態だけ動く）。
// 実際に鳴るかどうかはブラウザで確かめる。

import { describe, it, expect, beforeEach } from 'vitest'
import { player, isCurrent, toggleEpisode, requestReveal, clearReveal } from './player.js'

const ep = (url, extra = {}) => ({
  title: `${url} のタイトル`,
  link: `https://example.com/${url}`,
  url,
  duration: 1800,
  ...extra
})

beforeEach(() => {
  player.episode = null
  player.playing = false
  player.currentTime = 0
  player.duration = NaN
  player.reveal = null
})

describe('toggleEpisode', () => {
  it('選んだ回が今の1話になる', () => {
    toggleEpisode(ep('a.mp3'), { key: 'rebuild', title: 'Rebuild' })
    expect(player.episode.url).toBe('a.mp3')
    expect(player.episode.key).toBe('rebuild')
    expect(player.episode.channelTitle).toBe('Rebuild')
  })

  it('番組を渡さなくても、回が持っている key と番組名を使う', () => {
    // /new から鳴らすときはこちら。1話ずつに key と channel_title が入っている
    toggleEpisode(ep('a.mp3', { key: 'ossanfm', channel_title: 'Ossan.fm' }))
    expect(player.episode.key).toBe('ossanfm')
    expect(player.episode.channelTitle).toBe('Ossan.fm')
  })

  it('別の回に変えると、位置が頭に戻る', () => {
    toggleEpisode(ep('a.mp3'))
    player.currentTime = 123
    toggleEpisode(ep('b.mp3'))
    expect(player.episode.url).toBe('b.mp3')
    expect(player.currentTime).toBe(0)
  })

  it('同じ回をもう一度押しても、位置は戻らない（再生と一時停止の切り替え）', () => {
    toggleEpisode(ep('a.mp3'))
    player.currentTime = 123
    toggleEpisode(ep('a.mp3'))
    expect(player.currentTime).toBe(123)
  })

  it('長さはフィードの値を先に入れる。無ければ NaN', () => {
    // 音声を読み込めたら、そちらの値で置き換わる
    toggleEpisode(ep('a.mp3'))
    expect(player.duration).toBe(1800)
    toggleEpisode(ep('b.mp3', { duration: null }))
    expect(player.duration).toBeNaN()
  })

  it('音声を持たない回は無視する', () => {
    // 記事だけのフィードや、enclosure の無い回がある
    toggleEpisode(ep('a.mp3'))
    toggleEpisode({ title: '音声なし', url: null })
    expect(player.episode.url).toBe('a.mp3')
  })
})

describe('isCurrent', () => {
  it('音声の URL で見る', () => {
    // link を持たない番組があるので、URL を同一性の基準にしている
    toggleEpisode(ep('a.mp3'))
    expect(isCurrent(ep('a.mp3'))).toBe(true)
    expect(isCurrent(ep('b.mp3'))).toBe(false)
  })

  it('何も選んでいなければ false', () => {
    expect(isCurrent(ep('a.mp3'))).toBe(false)
  })

  it('回そのものが無くても落ちない', () => {
    toggleEpisode(ep('a.mp3'))
    expect(isCurrent(null)).toBe(false)
    expect(isCurrent(undefined)).toBe(false)
  })
})

describe('requestReveal', () => {
  it('番組へ辿る合図を置く', () => {
    toggleEpisode(ep('a.mp3'), { key: 'rebuild', title: 'Rebuild' })
    requestReveal()
    expect(player.reveal.key).toBe('rebuild')
    expect(player.reveal.url).toBe('a.mp3')
  })

  it('同じ番組を続けて指しても、別の合図として分かる', () => {
    // pages/index.vue は watch で見ているので、値が変わらないと動かない
    toggleEpisode(ep('a.mp3'), { key: 'rebuild', title: 'Rebuild' })
    requestReveal()
    const first = player.reveal
    clearReveal()
    requestReveal()
    expect(player.reveal).not.toBe(first)
  })

  it('どの番組の回か分からないときは何もしない', () => {
    toggleEpisode(ep('a.mp3'))
    requestReveal()
    expect(player.reveal).toBe(null)
  })
})
