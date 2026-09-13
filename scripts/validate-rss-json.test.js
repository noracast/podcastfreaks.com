import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import validateRssJson from './validate-rss-json.js'

// ファイルのパスを受け取る関数なので、置き場所を1つ作って書いては読ませる。
// data/rss.json は手で編集するファイルで、ここを抜けた誤りはそのまま
// 全番組の取得に乗る。踏んだ形（issue #88）を残しておく。

let dir

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-validate-'))
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

let serial = 0
const write = (text) => {
  const file = path.join(dir, `rss-${serial++}.json`)
  fs.writeFileSync(file, text, 'utf8')
  return file
}

const entry = (feed, extra = {}) => ({ feed, twitter: null, hashtag: null, ...extra })
const json = (obj) => JSON.stringify(obj, null, 2)

describe('validateRssJson', () => {
  it('問題が無ければ、何も言わずに件数だけ返す', () => {
    const file = write(json({
      noracast: entry('https://noracast.jp/feed.xml'),
      'fukabori.fm': entry('https://rss.art19.com/fukabori')
    }))
    expect(validateRssJson(file)).toEqual({ errors: [], warnings: [], count: 2 })
  })

  it('キーの重複を見つける。JSON.parse では後勝ちで消えてしまう（#88）', () => {
    // JSON としては読めてしまうので、生のテキストから拾う必要がある
    const file = write('{\n  "noracast": { "feed": "https://a.example/1" },\n  "noracast": { "feed": "https://b.example/2" }\n}\n')
    const { errors } = validateRssJson(file)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('noracast')
  })

  it('同じフィードを2つのキーで登録していたら止める', () => {
    const file = write(json({
      a: entry('https://example.com/feed.xml'),
      b: entry('https://example.com/feed.xml')
    }))
    const { errors } = validateRssJson(file)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('a, b')
  })

  it('http/https、末尾のスラッシュ、ホスト名の大小は同じフィードとみなす', () => {
    const file = write(json({
      a: entry('http://Example.com/feed/'),
      b: entry('https://example.com/feed')
    }))
    expect(validateRssJson(file).errors).toHaveLength(1)
  })

  it('パスの大小は別のフィード。配信基盤によっては別物を指す', () => {
    const file = write(json({
      a: entry('https://example.com/Feed.xml'),
      b: entry('https://example.com/feed.xml')
    }))
    expect(validateRssJson(file).errors).toEqual([])
  })

  it('X とハッシュタグの重複は警告どまり。別番組で共有することがある', () => {
    const file = write(json({
      a: entry('https://a.example/1', { twitter: '@noracast_', hashtag: '#noracast' }),
      b: entry('https://b.example/2', { twitter: '@NORACAST_', hashtag: '#NORACAST' })
    }))
    const { errors, warnings } = validateRssJson(file)
    expect(errors).toEqual([])
    expect(warnings).toHaveLength(2)
  })

  it('null の X やハッシュタグは、重複とみなさない', () => {
    const file = write(json({
      a: entry('https://a.example/1'),
      b: entry('https://b.example/2')
    }))
    expect(validateRssJson(file).warnings).toEqual([])
  })

  it('登録解除済みと同じキーなら止める', () => {
    const file = write(json({ a: entry('https://a.example/1') }))
    const inactive = write(json({ a: { feed: 'https://old.example/1', reason: 'end of broadcast' } }))
    const { errors } = validateRssJson(file, inactive)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('rss-inactive.json にも同じキー')
  })

  it('キーが違っても、登録解除済みと同じフィードなら止める', () => {
    const file = write(json({ new: entry('https://example.com/feed.xml') }))
    const inactive = write(json({ old: { feed: 'http://example.com/feed.xml/', reason: 'feed not found' } }))
    const { errors } = validateRssJson(file, inactive)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('"old"')
  })

  it('登録解除済みのファイルが無くても動く', () => {
    const file = write(json({ a: entry('https://a.example/1') }))
    expect(validateRssJson(file, path.join(dir, 'ない.json')).errors).toEqual([])
  })
})
