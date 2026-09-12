// フィードの XML から番組名だけを取る。
//
// フィードの URL を入れられたとき（rss.art19.com/fukabori、
// anchor.fm/s/<hex>/podcast/rss）の最後の手がかり。ホスト名にもパスにも
// 番組名が出てこない形があり、iTunes には URL で引く方法が無いため、
// フィードそのものを読んで名前を得る。
//
// **フィードの約3割はブラウザから読めない**（CORS。issue #228）。読めた
// ときだけの助けとして扱い、読めなくても送る導線は出す。
//
// DOMParser を使わないのは、ここを素の関数にしてテストで固めるため。

// フィードの印。番組のページ（HTML）を読んでしまったときに、その
// <title>（ページの題）を番組名として返さないための歯止め。
// ここを通ったものだけ「入れられた URL はフィードだった」と扱える
const FEED_MARKER = /<(rss|feed|channel|rdf:RDF)[\s>]/i

// 回（item / entry）より前だけを見る。中の <title> は回の名前なので、
// 先に当たってしまうと番組名の代わりにそれを拾う
const FIRST_ITEM = /<(?:item|entry)[\s>]/i

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i
const CDATA = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' '
}

export default function feedTitle(xml) {
  const text = String(xml || '')
  if(!FEED_MARKER.test(text)) return ''

  const head = text.split(FIRST_ITEM)[0]
  const matched = TITLE.exec(head)
  if(!matched) return ''

  const cdata = CDATA.exec(matched[1])
  const value = cdata ? cdata[1] : matched[1]

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;|&#\d+;/gi, entity => (entity in ENTITIES ? ENTITIES[entity] : entity))
    .replace(/\s+/g, ' ')
    .trim()
}
