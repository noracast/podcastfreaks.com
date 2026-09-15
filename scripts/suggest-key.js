"use strict";

// 新しく登録する番組のキーを決める（issue #231）。
//
// キーは URL とカバー画像のファイル名に使われるので、あとから変えにくい。
// 機械が勝手に決めきらず、**候補を並べて人が選ぶ**ための材料を作る。
//
// 決め方は .claude/skills/add-channel/SKILL.md「6. キーを決めて追加する」と同じ。
// フィードの slug → itunes:author → 独自ドメイン名 の順で確からしい。

// 既存のキーに倣う。小文字の英数字とハイフン（design-fm, ai-sakaba）。
// 大文字やドットを含む既存キーもあるが（CEO.FM, OSSfm）、新規は小文字でよい
const clean = (value) => String(value || '')
  .trim()
  .toLowerCase()
  // 全角や記号を落とす前に、区切りとして使えるものをハイフンへ寄せる
  .replace(/[\s_+]+/g, '-')
  .replace(/[^a-z0-9.-]/g, '')
  .replace(/-{2,}/g, '-')
  .replace(/^[-.]+|[-.]+$/g, '')

// 配信基盤のホスト。ここから取っても番組名にならない
const PLATFORM_HOSTS = /(^|\.)(anchor\.fm|podcasters\.spotify\.com|spotify\.com|soundcloud\.com|note\.com|listen\.style|art19\.com|libsyn\.com|podbean\.com|blubrry\.com|radiotalk\.jp|stand\.fm|googleapis\.com|amazonaws\.com|cloudfront\.net|hatenablog\.com|github\.io|firebaseapp\.com|web\.app|netlify\.app|vercel\.app)$/i

// フィードの URL でよく使う語。番組名の手がかりにならない
const PATH_NOISE = /^(feed|feeds|rss|atom|xml|podcast|podcasts|index|show|shows|s|p|users|sounds)$/i

// 中身を持たない id（anchor.fm/s/107747d74 など）
const ID_LIKE = /^(?=.*\d)[0-9a-f-]{6,}$/i

const hostOf = (url) => {
  try {
    return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

// 独自ドメインなら、その名前がそのまま番組名のことが多い
// （fukabori.fm → fukabori.fm、ossan.fm → ossan.fm）
export function fromHost(url) {
  const host = hostOf(url)
  if (!host || PLATFORM_HOSTS.test(host)) return ''
  const parts = host.split('.').filter(Boolean)
  if (parts.length < 2) return ''
  // .fm や .jp のような TLD は、番組名の一部になっていることがある
  // （fukabori.fm）。co.jp のような二段の TLD のときだけ落とす
  const tld = parts.slice(-2).join('.')
  if (/^(co|ne|or|ac|go|com|net|org)\.[a-z]{2}$/.test(tld)) return clean(parts.slice(0, -2).join('-'))
  return clean(parts.join('.'))
}

// パスの末尾から番組名らしい語を取る
// （rss.art19.com/fukabori → fukabori、listen.style/p/dotfm/rss → dotfm）
export function fromPath(url) {
  let pathname = ''
  try {
    pathname = new URL(String(url)).pathname
  } catch {
    return ''
  }
  const parts = pathname.split('/').map(p => p.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = decodeURIComponent(parts[i]).replace(/\.(xml|rss|json|php)$/i, '')
    if (!part || PATH_NOISE.test(part) || ID_LIKE.test(part)) continue
    const key = clean(part)
    if (key) return key
  }
  return ''
}

// 候補を確からしい順に並べる。重複と空は落とす。
// feed はフィードの URL、link はフィードの <link>（番組サイト）
export default function suggestKey({ feed, link, author, title, wanted } = {}) {
  const candidates = [
    // 本人の希望が最優先。ただし使えるかどうかは呼ぶ側が見る
    clean(wanted),
    // 番組サイトの独自ドメインが一番それらしい
    fromHost(link),
    // フィードが配信基盤なら、パスの末尾に slug が入っている
    fromPath(feed),
    fromHost(feed),
    clean(author),
    clean(title)
  ]
  const seen = new Set()
  return candidates.filter(key => {
    // 1文字のキーは短すぎて何の番組か分からない
    if (!key || key.length < 2 || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
