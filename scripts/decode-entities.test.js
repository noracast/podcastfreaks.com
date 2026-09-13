import { describe, it, expect } from 'vitest'
import decodeEntities from './decode-entities.js'

describe('decodeEntities', () => {
  it('CDATA の中で二重エスケープされた & を戻す（regonn&curry.fm）', () => {
    // <title><![CDATA[regonn&amp;curry.fm]]></title>
    // CDATA の中では実体参照が解釈されないので、パース結果に &amp; が残る
    expect(decodeEntities('regonn&amp;curry.fm')).toBe('regonn&curry.fm')
  })

  it('&amp; は最後に戻す。先に戻すと &amp;lt; が < になってしまう', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;')
  })

  it('よく出る名前つきの実体参照', () => {
    expect(decodeEntities('&lt;b&gt;')).toBe('<b>')
    expect(decodeEntities('&quot;引用&quot;')).toBe('"引用"')
    expect(decodeEntities('it&apos;s')).toBe("it's")
  })

  it('数値の実体参照（10進・16進とも）', () => {
    expect(decodeEntities('&#12354;')).toBe('あ')
    expect(decodeEntities('&#x3042;')).toBe('あ')
    expect(decodeEntities('&#x1F3A7;')).toBe('🎧')
  })

  it('混ざっていても全部戻す', () => {
    expect(decodeEntities('A&amp;B &#12354; &lt;tag&gt;')).toBe('A&B あ <tag>')
  })

  it('実体参照が無ければそのまま', () => {
    expect(decodeEntities('ふつうの題名')).toBe('ふつうの題名')
  })

  it('文字列でないものは触らない。フィードの項目は欠けることがある', () => {
    expect(decodeEntities(null)).toBeNull()
    expect(decodeEntities(undefined)).toBeUndefined()
    expect(decodeEntities(123)).toBe(123)
    const obj = { _: 'foo' }
    expect(decodeEntities(obj)).toBe(obj)
  })
})
