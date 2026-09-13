import { describe, it, expect } from 'vitest'
import { artworkFor } from './media-session.js'

describe('artworkFor', () => {
  it('元画像と、縮めた2枚を並べて渡す', () => {
    expect(artworkFor('/downloads/cover/noracast.jpg')).toEqual([
      { src: '/downloads/cover/noracast-60.jpg', sizes: '60x60', type: 'image/jpeg' },
      { src: '/downloads/cover/noracast-120.jpg', sizes: '120x120', type: 'image/jpeg' },
      { src: '/downloads/cover/noracast.jpg', sizes: '512x512', type: 'image/jpeg' }
    ])
  })

  it('キーにドットを含む番組でも壊れない（yota.fm・CEO.FM）', () => {
    // 最初のドットにマッチさせると "yota-120.fm.jpg" という
    // 存在しない URL になる（components/cover.vue と同じ罠）
    const [small] = artworkFor('/downloads/cover/yota.fm.jpg')
    expect(small.src).toBe('/downloads/cover/yota.fm-60.jpg')
  })

  it('png のジャケットもある', () => {
    expect(artworkFor('/downloads/cover/3jumper.png')[0].type).toBe('image/png')
  })

  it('ロック画面は別オリジンとして扱うので、絶対 URL にできる', () => {
    const [small] = artworkFor('/downloads/cover/noracast.jpg', 'https://podcastfreaks.com')
    expect(small.src).toBe('https://podcastfreaks.com/downloads/cover/noracast-60.jpg')
  })

  it('ジャケットを持たない番組は空。空文字を渡すと壊れた画像になる', () => {
    expect(artworkFor(null)).toEqual([])
    expect(artworkFor('')).toEqual([])
  })
})
