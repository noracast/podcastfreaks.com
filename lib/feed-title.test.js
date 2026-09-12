import { describe, it, expect } from 'vitest'
import feedTitle from './feed-title.js'

describe('feedTitle', () => {
  it('チャンネルの title を取る', () => {
    expect(feedTitle('<rss><channel><title>fukabori.fm</title><link>https://fukabori.fm</link></channel></rss>')).toBe('fukabori.fm')
  })

  // 回の title を先に拾うと、番組名の代わりに回の名前が出てしまう
  it('回の title は見ない', () => {
    const xml = `
      <rss><channel>
        <title>Rebuild</title>
        <item><title>400: Naan Bread (hak)</title></item>
      </channel></rss>`
    expect(feedTitle(xml)).toBe('Rebuild')
  })

  it('CDATA で囲まれていても取れる', () => {
    expect(feedTitle('<channel><title><![CDATA[ゆるコンピュータ科学ラジオ]]></title></channel>')).toBe('ゆるコンピュータ科学ラジオ')
  })

  it('実体参照を戻す', () => {
    expect(feedTitle('<channel><title>Tech &amp; Design</title></channel>')).toBe('Tech & Design')
    expect(feedTitle('<channel><title>&#33;&#33;</title></channel>')).toBe('!!')
  })

  it('属性の付いた title でも取れる（Atom）', () => {
    expect(feedTitle('<feed><title type="text">Misreading Chat</title><entry><title>#1</title></entry></feed>')).toBe('Misreading Chat')
  })

  it('読めなかったものは空', () => {
    expect(feedTitle('')).toBe('')
    expect(feedTitle('<html><body>Not Found</body></html>')).toBe('')
  })
})

// 番組のページ（HTML）を読んでしまったときに、ページの題を番組名として
// 返さないための歯止め。ここが効かないと、フィードでない URL を
// フィードとして送ってしまう
describe('feedTitle（フィードでないもの）', () => {
  it('HTML のページは、title があっても取らない', () => {
    expect(feedTitle('<html><head><title>fukabori.fm | ポッドキャスト</title></head></html>')).toBe('')
  })
})
