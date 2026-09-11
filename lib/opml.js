"use strict";

// 選んだ番組のフィードURLを OPML にまとめる。
//
// もとは opml-generator を使っていたが、やっているのは文字列を組み立てる
// だけで、そのために依存を1つ抱えるほどではなかったので自前にした。
// 出力は opml-generator と1バイトも変わらない（lib/opml.test.js）。

// 属性値にも要素の中身にも同じ変換をかける。' まで変換するのは
// opml-generator に合わせるため（属性を " で囲っているので必須ではない）
const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

// Date は RFC1123（OPML 2.0 が求める RFC822 の形）にする
const asText = (value) => value instanceof Date ? value.toUTCString() : value

// header と outlines はどちらもそのままの並びで出す。
// header は { title, dateCreated, ownerName } など、outline は
// { text, title, type, xmlUrl } などを想定しているが、キーは固定しない
export default function opml(header, outlines) {
  const head = Object.entries(header || {})
    .map(([key, value]) => `<${key}>${escapeXml(asText(value))}</${key}>`)
    .join('')
  const body = (outlines || [])
    .map(outline => {
      const attrs = Object.entries(outline)
        .map(([key, value]) => ` ${key}="${escapeXml(asText(value))}"`)
        .join('')
      return `<outline${attrs}/>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head>${head}</head><body>${body}</body></opml>`
}
