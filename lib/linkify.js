// 番組の説明に裸で書かれた URL を、押せるリンクにする。
//
// 入力は fetch-feeds の sanitizeDescription を通った HTML なので、タグを
// 壊さないよう `<...>` の外側（テキスト）だけを対象にする。もとから <a> に
// なっている部分は、中のテキストごと飛ばす（二重にリンクしないため）。
//
// テキストは実体参照に直された状態で来る。URL に使える文字だけを拾うので、
// `&amp;` を含む URL もそのまま href に入れてよい（属性値として読むときに
// `&` へ戻る）。`"` は拾わないので、href の引用符も壊れない。

const URL_RE = /https?:\/\/[-\w.~:/?#[\]@!$&'()*+,;=%]+/gi

// 「詳しくは https://example.com/。」のように、URL の後ろに句読点が続いて
// いることが多いので URL から外す。`;` は実体参照の一部になりうるため残す
const TRAILING_RE = /[.,!?:]+$/

const trimUrl = (url) => {
  let value = url.replace(TRAILING_RE, '')
  // 「（詳しくは https://example.com/）」の閉じ括弧も外す。ただし URL 自体に
  // 括弧を含むものがあるので、開き括弧が無いときだけにする
  while(value.endsWith(')') && !value.includes('(')) {
    value = value.slice(0, -1)
  }
  return value
}

export default function linkify(html) {
  if(!html) return html

  // <a> の入れ子はないが、閉じ忘れたフィードでも後続が巻き添えにならないよう
  // 深さで数える
  let depth = 0

  return String(html).split(/(<[^>]*>)/).map((part) => {
    if(part.startsWith('<')) {
      if(/^<a[\s>]/i.test(part)) depth++
      else if(/^<\/a\s*>/i.test(part)) depth = Math.max(0, depth - 1)
      return part
    }
    if(depth > 0) return part

    return part.replace(URL_RE, (match) => {
      const url = trimUrl(match)
      // 外した句読点は本文の一部なので、リンクの後ろに戻す
      const rest = match.slice(url.length)
      return `<a href="${url}" target="_blank" rel="noopener">${url}</a>${rest}`
    })
  }).join('')
}
