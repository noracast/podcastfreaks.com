// 見ていたページの URL とタイトルから、番組を探す手がかりを作る。
//
// /add は「Spotify を開いていた」「Apple のページを見ていた」「番組サイトに
// いた」のいずれからも呼ばれる。ブラウザからそのページを読み直すことは
// できない（どこも CORS を許していないうえ、Spotify は JS で描くので
// HTML を取れても番組名が入っていない）ので、**手元にある URL と
// ページタイトルだけ**から番組名を割り出す。
//
// Apple のリンクだけは別扱いで、URL の id から iTunes の lookup が引ける。
// こちらは推測が要らないので確実。それ以外は検索語を組み立てて
// iTunes の検索 API に投げる。
//
// 罠（.claude/skills/add-channel/SKILL.md と同じもの）:
//
// - Spotify の oEmbed は番組名を返さない。返るのは最新エピソード名
// - `anchor.fm/s/<hex>` の hex は Spotify の show ID とは別物なので、
//   show ID からフィード URL は導けない

// タイトルの後ろに付くサービス名。ここだけを落とす。
//
// 「区切り文字から後ろを捨てる」とはしない。`Ossan.fm - 大人の話` のように
// 区切りの後ろが番組名の一部であることがあるため、**知っている文言と
// 一致したときだけ**落とす
const SITE_SUFFIXES = [
  /\s*[|｜]\s*Podcast on Spotify\s*$/i,
  /\s*[|｜]\s*ポッドキャスト\s*[|｜]\s*Spotify\s*$/i,
  /\s*[|｜]\s*Spotify\s*$/i,
  /\s*[-–—]\s*YouTube\s*$/i,
  /\s+on Apple Podcasts\s*$/i,
  /\s*[|｜]\s*Apple Podcasts?\s*$/i,
  /\s*[|｜]\s*Podcast\s*$/i
]

// Apple がタイトルの先頭に入れる不可視文字（U+200E 左から右へ）。
// `‎fukabori.fm on Apple Podcasts` のように付く
const INVISIBLE = /[\u200E\u200F\u202A-\u202E]/g

// 区切り文字。後ろを落とすのではなく、**前半だけを別の検索語として足す**
// のに使う。番組名にサイト名や煽り文が続く形（`番組名 | 公式サイト`）を
// 拾うため
const SEPARATOR = /\s*[|｜･・]\s*|\s+[-–—]\s+/

export function appleIdFromUrl(url) {
  if(!url) return null
  // podcasts.apple.com/jp/podcast/<slug>/id1388826609?i=1000... と
  // 古い itunes.apple.com/... のどちらも同じ形で id を持つ。
  // ?i= はエピソードを指す別の id なので拾わない
  const matched = /\/id(\d+)/.exec(String(url))
  return matched ? matched[1] : null
}

// URL がどのサービスのものか。表示の文言と、検索語の作り方を変えるのに使う
export function detectSource(url) {
  const appleId = appleIdFromUrl(url)
  if(appleId) return { kind: 'apple', appleId }

  let host = ''
  try {
    host = new URL(String(url)).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return { kind: 'unknown', appleId: null, host: '' }
  }

  if(host === 'open.spotify.com' || host.endsWith('.spotify.com')) return { kind: 'spotify', appleId: null, host }
  if(host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return { kind: 'youtube', appleId: null, host }
  return { kind: 'site', appleId: null, host }
}

// タイトルからサービス名を落とす
export function cleanTitle(title) {
  let value = String(title || '').replace(INVISIBLE, '').trim()
  // 1つ落とすと別の接尾辞が末尾に現れることがある
  // （`番組名 | ポッドキャスト | Spotify`）ので、変わらなくなるまで回す
  for(;;) {
    const before = value
    for(const suffix of SITE_SUFFIXES) value = value.replace(suffix, '').trim()
    if(value === before) break
  }
  return value
}

// iTunes の検索 API に投げる語の候補。前にあるものほど確からしい。
// 呼ぶ側は、結果が出るまで順に試す
export default function searchTerms({ url, title } = {}) {
  const terms = []
  const add = (value) => {
    const term = String(value || '').trim()
    // 1文字の語で検索すると無関係なものが大量に返る
    if(term.length >= 2 && !terms.includes(term)) terms.push(term)
  }

  const cleaned = cleanTitle(title)
  add(cleaned)

  // 区切りの前半。`fukabori.fm | テクノロジーについて話すポッドキャスト` のような形
  const [head] = cleaned.split(SEPARATOR)
  add(head)

  // 番組サイトなら、ホスト名そのものが番組名であることが多い
  // （fukabori.fm、ossan.fm、rebuild.fm）。タイトルから見つからなかった
  // ときの最後の手がかりとして足す
  const { kind, host } = detectSource(url)
  if(kind === 'site' && host) add(host)

  return terms
}
