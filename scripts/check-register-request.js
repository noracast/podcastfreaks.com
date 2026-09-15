"use strict";

// 登録リクエストの issue を1件受け取って、フィードを確かめ、結果を
// マークダウンで返す（issue #231）。GitHub Actions から呼ぶ。
//
// ここだけがネットワークに触る。判定そのものは scripts/validate-feed.js、
// 本文の読み取りは scripts/parse-request-issue.js、キーの候補は
// scripts/suggest-key.js にあり、そちらはテストで固めてある。
//
// 使い方（本文は環境変数で渡す。コマンドラインに載せない）:
//
//   ISSUE_BODY="$(cat body.md)" node scripts/check-register-request.js
//
// 標準出力にマークダウンのコメントを、GITHUB_OUTPUT があればそこへ
// 判定の結果（verdict / key）を書く。終了コードは常に0で、
// 「駄目だった」も結果としてコメントする（Actions を赤くしない）。

import fs from 'fs'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import xml2js from 'xml2js'

import parseRequestIssue from './parse-request-issue.js'
import validateFeed from './validate-feed.js'
import suggestKey from './suggest-key.js'
import { normalizeFeed as normalizeFeedUrl, normalizeTitle } from '../lib/registered-match.js'
import wget from './wget-with-timeout.js'

const xmlToJSON = promisify((new xml2js.Parser({ explicitArray: false })).parseString)

const RSS_PATH = 'data/rss.json'
const INACTIVE_PATH = 'data/rss-inactive.json'

// 番組名でも突き合わせたいが、data/rss.json はキーとフィードと X しか
// 持っていない（番組名はフィードから毎日作っている）。公開している
// registered.json には番組名が入っているので、そちらを読む。
// /request/ が登録済み判定に使っているものと同じファイル（issue #229）
const REGISTERED_URL = 'https://podcastfreaks.com/registered.json'

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

// フィードを一時ファイルへ落として読む。wget-with-timeout は
// リダイレクト・圧縮・非ASCIIの URL を面倒見てくれる（fetch-feeds と同じ道具）
async function fetchText(url) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-request-'))
  const output = path.join(dir, 'feed.xml')
  try {
    await wget(url, { output })
    return fs.readFileSync(output, 'utf8')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// カバー画像は中身まで見ない。取れるかどうかだけ
async function headOk(url) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-cover-'))
  const output = path.join(dir, 'cover')
  try {
    await wget(url, { output })
    return true
  } catch {
    return false
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// もう登録されていないか。フィードURLと番組名の両方で見る
// （同じ番組でも、こちらが FeedBurner 経由、向こうが直リンクということがある）
export function findExisting(registered, { feed, title }) {
  const wantedFeed = feed ? normalizeFeedUrl(feed) : ''
  const wantedTitle = title ? normalizeTitle(title) : ''
  const hits = []
  for (const [key, value] of Object.entries(registered || {})) {
    if (wantedFeed && normalizeFeedUrl(value.feed) === wantedFeed) hits.push({ key, reason: 'フィードが同じ' })
    else if (wantedTitle && value.title && normalizeTitle(value.title) === wantedTitle) hits.push({ key, reason: '番組名が同じ' })
  }
  return hits
}

const list = (items) => items.map(item => `- ${item}`).join('\n')

// 結果のまとめ。人が読んで、そのまま判断できる形にする
export function renderComment({ request, result, existing, inactive, keys, coverOk }) {
  const lines = ['## 自動チェックの結果', '']

  if (!request.feed) {
    lines.push(
      '**フィードの URL が分かりませんでした。**',
      '',
      '本文の「フィード」に RSS の URL を書き足していただけると、こちらで中身を確かめられます。',
      '分からない場合は、このままで大丈夫です。登録する側で探します。'
    )
    return lines.join('\n')
  }

  lines.push(`対象: ${request.feed}`, '')

  if (inactive.length) {
    lines.push('### 登録を解除したことのある番組です', '')
    lines.push(list(inactive.map(hit => `\`${hit.key}\`（理由: ${hit.reason || '不明'}）`)))
    lines.push('', '`end of broadcast`（放送終了）なら再登録しません。配信元が移っただけなら、新しいフィードで戻せます。', '')
  }

  if (existing.length) {
    lines.push('### すでに登録されています', '')
    lines.push(list(existing.map(hit => `\`${hit.key}\`（${hit.reason}）`)))
    lines.push('', 'フィードの URL が変わった、などのご連絡でしたら、その旨をコメントしてください。', '')
    return lines.join('\n')
  }

  if (result.fetchError) {
    lines.push('### フィードを取得できませんでした', '', '```', result.fetchError, '```', '',
      'URL が間違っているか、配信元が応答していません。しばらくしてからもう一度お試しいただくか、別の URL をお知らせください。')
    return lines.join('\n')
  }

  if (result.errors.length) {
    lines.push('### 登録できません', '', list(result.errors), '')
  } else {
    lines.push('### フィードは問題ありませんでした', '')
  }

  const info = result.info || {}
  lines.push('### 中身', '')
  lines.push(list([
    `番組名: ${info.title || '(読めず)'}`,
    `エピソード: ${info.items ?? 0} 件（うち音声を持つもの ${info.withAudio ?? 0} 件）`,
    `収録時間が読める回: ${info.withDuration ?? 0} 件`,
    `カバー画像: ${info.cover ? (coverOk ? `取得できました（${info.cover}）` : `**取得できませんでした**（${info.cover}）`) : 'なし'}`,
    `番組サイト: ${info.link || '(なし)'}`
  ]))
  lines.push('')

  if (result.warnings.length) {
    lines.push('### 気になるところ（登録は止めません）', '', list(result.warnings), '')
  }

  if (result.ok) {
    lines.push('### キーの候補', '')
    lines.push(keys.length
      ? list(keys.map((key, i) => `\`${key}\`${i === 0 ? '（一番それらしい）' : ''}`))
      : '- 手がかりがありませんでした。登録する側で決めます。')
    lines.push('')
    lines.push('### X とハッシュタグ', '')
    lines.push(list([
      `X: ${request.twitter || '未記入'}`,
      `ハッシュタグ: ${request.hashtag || '未記入'}`
    ]))
    lines.push('', '（フィード本文から機械で拾うと、出演者個人のアカウントや一般的なタグを掴んでしまうため、ここは自動で埋めていません。分かる方は書き足してください。空のままでも登録できます）')
  }

  return lines.join('\n')
}

// 番組名まで持った一覧。取れなければ data/rss.json で代用する
// （フィードの一致だけは見られる）
async function loadRegistered() {
  try {
    return JSON.parse(await fetchText(REGISTERED_URL))
  } catch {
    return readJson(RSS_PATH)
  }
}

export async function check(body, registered) {
  const request = parseRequestIssue(body)

  // 登録リクエストの形をしていない issue。ふつうの相談や不具合の報告が
  // 流れてくるので、その場合は何も言わずに終わる（Actions が
  // 全部の issue にコメントすると邪魔になる）
  if (!request.isRequest) return { verdict: 'not-request', key: '', comment: '' }

  if (!registered) registered = await loadRegistered()
  const inactiveAll = readJson(INACTIVE_PATH)

  const existing = findExisting(registered, request)
  const inactive = findExisting(inactiveAll, request).map(hit => ({
    ...hit,
    reason: inactiveAll[hit.key] && inactiveAll[hit.key].reason
  }))

  let result = { ok: false, errors: [], warnings: [], info: {} }
  let coverOk = false

  if (request.feed && !existing.length) {
    try {
      const xml = await fetchText(request.feed)
      const parsed = await xmlToJSON(xml).catch(() => null)
      result = validateFeed(parsed)
    } catch (error) {
      result = { ok: false, errors: [], warnings: [], info: {}, fetchError: String(error.message || error) }
    }
    if (result.info && result.info.cover) coverOk = await headOk(result.info.cover)
    if (result.info && result.info.cover && !coverOk) {
      result.warnings.push('カバー画像を取得できませんでした。一覧では灰色の四角になります。')
    }
  }

  const keys = result.ok
    ? suggestKey({
      feed: request.feed,
      link: result.info.link,
      author: result.info.author,
      title: result.info.title,
      wanted: request.key
    }).filter(key => !(key in registered))
    : []

  const verdict = existing.length ? 'already'
    : inactive.length ? 'inactive'
      : !request.feed ? 'no-feed'
        : result.ok ? 'ok' : 'ng'

  return {
    verdict,
    key: keys[0] || '',
    comment: renderComment({ request, result, existing, inactive, keys, coverOk })
  }
}

// 直に実行されたときだけ動く（テストから import しても走らない）
if (process.argv[1] && process.argv[1].endsWith('check-register-request.js')) {
  const body = process.env.ISSUE_BODY || ''
  const { verdict, key, comment } = await check(body)
  process.stdout.write(comment + '\n')
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `verdict=${verdict}\nkey=${key}\n`)
  }
}
