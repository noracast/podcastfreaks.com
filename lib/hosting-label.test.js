import { describe, it, expect } from 'vitest'
import hostingLabel, { isHostingService } from './hosting-label.js'

describe('hostingLabel', () => {
  it('知っている配信サービスは名前で出す', () => {
    expect(hostingLabel('anchor.fm')).toBe('Anchor')
    expect(hostingLabel('feeds.soundcloud.com')).toBe('SoundCloud')
  })

  it('サブドメインが付いていても拾う', () => {
    expect(hostingLabel('mcdn.podbean.com')).toBe('Podbean')
  })

  it('知らないホストはホスト名のまま', () => {
    expect(hostingLabel('example.com')).toBe('example.com')
  })

  it('空の値はそのまま返す', () => {
    expect(hostingLabel(null)).toBe(null)
    expect(hostingLabel('')).toBe('')
  })
})

describe('isHostingService', () => {
  it('名前を持つサービスかどうかで、絞り込みの並び順が決まる', () => {
    expect(isHostingService('anchor.fm')).toBe(true)
    expect(isHostingService('example.com')).toBe(false)
    expect(isHostingService(null)).toBe(false)
  })
})
