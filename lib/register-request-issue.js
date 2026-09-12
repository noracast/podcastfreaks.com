// 登録リクエストを GitHub の issue として立てるためのリンクを作る。
//
// /add はサーバーを持たない（issue #228）。送信先は GitHub の
// 「issue を新規作成」する画面で、調べた結果を query に載せて渡し、
// 中身が埋まった状態で開く。送信そのものは訪問者の GitHub アカウントで行われる。
//
// 本文の形は、あとで Actions（#231）が読む。**`- ラベル: 値` の1行**に
// 揃えておく。人が読んで足せる余白（X・ハッシュタグ・キーの希望）も
// 同じ形で空けておき、分かる人が埋められるようにする。

import { jst } from './jst.js'

export const REPO_URL = 'https://github.com/noracast/podcastfreaks.com'

// Actions がこのラベルで拾う（#231）
export const ISSUE_LABEL = 'register-request'

const line = (label, value) => `- ${label}: ${value || ''}`

export function issueTitle(name) {
  const title = String(name || '').trim()
  return title ? `番組の登録リクエスト: ${title}` : '番組の登録リクエスト'
}

export function issueBody({ channel = {}, source = {} } = {}) {
  const genres = Array.isArray(channel.genres) ? channel.genres.filter(Boolean) : []
  // 最新エピソードの日付。iTunes が返すのは UTC の ISO 文字列なので、
  // 日本時間に直してから日付だけにする
  const latest = channel.releaseDate ? jst(channel.releaseDate).format('YYYY-MM-DD') : ''

  return [
    '## 番組',
    '',
    line('番組名', channel.title),
    line('フィード', channel.feed),
    line('Apple Podcasts', channel.apple),
    line('話数', channel.trackCount),
    line('最新エピソード', latest),
    line('ジャンル', genres.join(', ')),
    '',
    '## 分かれば教えてください（空のままでも大丈夫です）',
    '',
    line('X', ''),
    line('ハッシュタグ', ''),
    line('キーの希望', ''),
    '',
    '## 補足',
    '',
    line('見ていたページ', source.url),
    line('ページのタイトル', source.title),
    '',
    'このリクエストは https://podcastfreaks.com/add/ から作りました。',
    'フィードの中身（音声を持っているか、配信者が掲載を止めていないか）は',
    '登録する側で確かめます。'
  ].join('\n')
}

export default function registerRequestIssueUrl({ channel = {}, source = {} } = {}) {
  const params = new URLSearchParams({
    labels: ISSUE_LABEL,
    title: issueTitle(channel.title),
    body: issueBody({ channel, source })
  })
  return `${REPO_URL}/issues/new?${params}`
}
