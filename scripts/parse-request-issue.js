"use strict";

// 登録リクエストの issue 本文から、検証に要るものを取り出す。
//
// 本文を組み立てているのは lib/register-request-issue.js で、
// `- ラベル: 値` の1行に揃えてある。ただし**そのまま送られてくるとは限らない**。
// 送る人が手で書き足したり、行を消したりする。人が書いた本文にも当たるよう、
// 見出しの構造ではなく「ラベルの行」だけを頼りに読む。
//
// Actions（issue #231）から呼ぶ。ここはネットワークに触らない純粋な処理で、
// 取りに行くのは呼ぶ側（scripts/check-register-request.js）。

// 「- フィード: https://…」の形。全角コロンも受ける（日本語入力のまま
// 書かれることがある）。行頭の記号は - * + のどれでもよい
const LINE = /^\s*[-*+]\s*([^:：]+)[:：]\s*(.*)$/

// ラベルの揺れを吸収する。左が本文に出てくる語、右がこちらでの名前
const LABELS = {
  '番組名': 'title',
  'タイトル': 'title',
  'フィード': 'feed',
  'フィードurl': 'feed',
  'rss': 'feed',
  'apple podcasts': 'apple',
  'apple': 'apple',
  '話数': 'trackCount',
  '最新エピソード': 'latest',
  'ジャンル': 'genres',
  'x': 'twitter',
  'twitter': 'twitter',
  'ハッシュタグ': 'hashtag',
  'キーの希望': 'key',
  'キー': 'key',
  '見ていたページ': 'sourceUrl',
  'ページのタイトル': 'sourceTitle'
}

const normalizeLabel = (label) => String(label || '')
  .trim()
  .toLowerCase()
  // 「**フィード**」のように強調されていることがある
  .replace(/[*_`]/g, '')
  .trim()

// 値は素のまま来るとは限らない。マークダウンのリンク、山括弧、
// バッククォート、前後の空白を落として中身だけにする
const cleanValue = (value) => {
  let text = String(value || '').trim()
  if (!text) return ''
  // [表示](URL) → URL
  const linked = /^\[[^\]]*\]\(([^)]+)\)$/.exec(text)
  if (linked) text = linked[1]
  text = text.replace(/^<(.+)>$/, '$1')
  text = text.replace(/^`(.+)`$/, '$1')
  return text.trim()
}

// @ は付いていたり、いなかったり。URL で書かれることもある
export function normalizeTwitter(value) {
  const text = cleanValue(value)
  if (!text) return null
  const fromUrl = /(?:twitter\.com|x\.com)\/@?([A-Za-z0-9_]{1,15})/i.exec(text)
  const name = fromUrl ? fromUrl[1] : text.replace(/^@/, '')
  return /^[A-Za-z0-9_]{1,15}$/.test(name) ? `@${name}` : null
}

// # は付いていたり、いなかったり。検索の URL で書かれることもある
export function normalizeHashtag(value) {
  const text = cleanValue(value)
  if (!text) return null
  const fromUrl = /[?&]q=%23([^&\s]+)/.exec(text)
  const tag = fromUrl ? decodeURIComponent(fromUrl[1]) : text.replace(/^[#＃]/, '')
  if (!tag || /\s/.test(tag)) return null
  return `#${tag}`
}

// http(s) の URL だけ通す。番組名が誤って入っていても拾わない
const asUrl = (value) => {
  const text = cleanValue(value)
  if (!text) return null
  try {
    const url = new URL(text)
    return (url.protocol === 'http:' || url.protocol === 'https:') ? url.toString() : null
  } catch {
    return null
  }
}

export default function parseRequestIssue(body) {
  const found = {}
  for (const raw of String(body || '').split('\n')) {
    // 引用（> で始まる行）は、こちらが本文に書いた案内なので読まない
    if (/^\s*>/.test(raw)) continue
    const matched = LINE.exec(raw)
    if (!matched) continue
    const key = LABELS[normalizeLabel(matched[1])]
    if (!key) continue
    // 同じラベルが複数あったら最初のものを採る。あとに続くのは
    // 引用や書き足しのことが多い
    if (key in found) continue
    found[key] = matched[2]
  }

  return {
    // 登録リクエストとして扱えるか。フィードか番組名のどちらかは要る
    isRequest: !!(asUrl(found.feed) || cleanValue(found.title)),
    title: cleanValue(found.title) || null,
    feed: asUrl(found.feed),
    apple: asUrl(found.apple),
    twitter: normalizeTwitter(found.twitter),
    hashtag: normalizeHashtag(found.hashtag),
    // キーは英数字とハイフンだけ。それ以外が混ざっていたら受け取らない
    // （人が決め直す。scripts/suggest-key.js が候補を出す）
    key: (() => {
      const text = cleanValue(found.key).replace(/^`|`$/g, '')
      return /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(text) ? text : null
    })(),
    sourceUrl: asUrl(found.sourceUrl),
    sourceTitle: cleanValue(found.sourceTitle) || null
  }
}
