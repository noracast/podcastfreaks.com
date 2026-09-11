// OPML の組み立て。
//
// opml-generator を外したときに書いた。期待値は、外す前に
// opml-generator へ同じ入力を渡して得た出力をそのまま貼ってある。

import { describe, it, expect } from 'vitest'
import opml from './opml.js'

const XML = '<?xml version="1.0" encoding="UTF-8"?><opml version="2.0">'

describe('opml', () => {
  it('一覧の Download OPML が出すものと同じ形', () => {
    const header = {
      title: 'podcast-freaks channel list',
      dateCreated: new Date('2026-09-11T04:00:00Z'),
      ownerName: 'podcast-freaks'
    }
    const outlines = [
      { text: 'txt', title: 'rebuild', type: 'rss', xmlUrl: 'https://feeds.rebuild.fm/rebuildfm' }
    ]
    expect(opml(header, outlines)).toBe(
      XML +
      '<head><title>podcast-freaks channel list</title>' +
      '<dateCreated>Fri, 11 Sep 2026 04:00:00 GMT</dateCreated>' +
      '<ownerName>podcast-freaks</ownerName></head>' +
      '<body><outline text="txt" title="rebuild" type="rss" xmlUrl="https://feeds.rebuild.fm/rebuildfm"/></body></opml>'
    )
  })

  it('番組名とURLに含まれる記号を逃がす', () => {
    // 番組名に & や < を使っている番組があり、URL にも ?a=1&b=2 が出る
    const outlines = [
      { text: 'txt', title: '<&"えいご>', type: 'rss', xmlUrl: 'https://example.com/a?b=1&c=2' }
    ]
    expect(opml({}, outlines)).toBe(
      XML + '<head></head><body>' +
      '<outline text="txt" title="&lt;&amp;&quot;えいご&gt;" type="rss" xmlUrl="https://example.com/a?b=1&amp;c=2"/>' +
      '</body></opml>'
    )
  })

  it("' も逃がす（opml-generator に合わせている）", () => {
    expect(opml({ ownerName: "o'wn" }, [])).toBe(
      XML + '<head><ownerName>o&apos;wn</ownerName></head><body></body></opml>'
    )
  })

  it('1つも選ばれていなければ body は空', () => {
    expect(opml({ title: 't' }, [])).toBe(
      XML + '<head><title>t</title></head><body></body></opml>'
    )
  })
})
