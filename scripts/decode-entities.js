"use strict";

// XML の実体参照を文字に戻す。
//
// CDATA セクションの中では実体参照が解釈されないため、
// <title><![CDATA[regonn&amp;curry.fm]]></title> のように二重エスケープされた
// フィードでは、パース結果に "&amp;" がそのまま残り画面にも表示されてしまう。
//
// &amp; を最後に処理しないと "&amp;lt;" が "<" になってしまうので順序は変えないこと
export default function decodeEntities(value) {
  if (typeof value !== 'string') return value

  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}
