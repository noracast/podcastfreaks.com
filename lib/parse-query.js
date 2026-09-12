// 入れてもらった1行を、URL と番組名に分ける。
//
// 欄を「番組の URL」と「番組名」に分けていたが、手元にあるものは人によって
// 違う（Spotify のリンクだけ、名前だけ、サイトと Apple の両方）。どれが
// どちらの欄か考えさせるより、**分かるものを順に放り込める1つの欄**のほうが早い。
//
// **区切りは空白（改行・タブも）。** 空白は percent-encode されるので URL の
// 中には絶対に現れず、URL を壊さない唯一の区切りになる。番組名に空白が入る形
// （`Apple News Radio ワンボタンの声`）は、URL でない語を繋ぎ直すので残る。
//
// カンマは案内していないが、打たれても困らないように受ける。ただし
// **`http(s)://` で始まる語の中のカンマは URL の一部**として残す（URL に
// カンマは入りうる）。前後に付いたカンマ（`https://…, 番組名`）だけは落とす。

const SPACE = /\s+/
const COMMA = /[,、，]+/
const EDGE_COMMA = /^[,、，]+|[,、，]+$/g

// スキームが付いていれば URL。付いていなくても、最初の / より前がドメインの
// 形をしていれば URL として扱う（radio.voiceofonebutton.net/ など）。
//
// **/ を含まない `fukabori.fm` は番組名として扱う。** 番組名がそのまま
// ドメインの形をしていることが多く（fukabori.fm、ossan.fm、Rebuild.fm）、
// URL と決めつけると iTunes で名前として引けなくなる
export function isUrlLike(token) {
  if(/^https?:\/\//i.test(token)) return true
  const [head, ...rest] = String(token).split('/')
  return rest.length > 0 && /^[\w-]+(\.[\w-]+)+$/.test(head)
}

// スキームの無いものを補う。フィードの URL は http のことがあるが、
// こちらから開くときは https を先に当てる
export function toUrl(token) {
  return /^https?:\/\//i.test(token) ? token : `https://${token}`
}

export default function parseQuery(input) {
  const urls = []
  const words = []

  for(const token of String(input || '').split(SPACE)) {
    const trimmed = token.replace(EDGE_COMMA, '')
    if(!trimmed) continue

    // URL として読めない語だけ、カンマでも分ける
    const pieces = isUrlLike(trimmed) ? [trimmed] : trimmed.split(COMMA).filter(Boolean)
    for(const piece of pieces) {
      if(isUrlLike(piece)) urls.push(toUrl(piece))
      else words.push(piece)
    }
  }

  return { urls, name: words.join(' ') }
}
