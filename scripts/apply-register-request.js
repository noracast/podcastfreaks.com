"use strict";

// 検証を通った登録リクエストを data/rss.json に足す（issue #231）。
// GitHub Actions が、scripts/check-register-request.js のあとに呼ぶ。
//
// ここは**ファイルを書き換えるだけ**で、ブランチも PR も作らない。
// git の操作はワークフロー側に置いて、こちらは手元でも試せるようにしておく。
//
// 使い方（本文は環境変数で渡す。コマンドラインに載せない）:
//
//   ISSUE_BODY="$(cat body.md)" KEY=noracast node scripts/apply-register-request.js
//
// 足せたら 0、足せなければ理由を標準エラーに出して 1 で終わる。
// ワークフローは 1 のとき PR を作らず、コメントだけ残す。

import fs from 'fs'
import parseRequestIssue from './parse-request-issue.js'
import addChannelEntry from './add-channel-entry.js'
import validateRssJson from './validate-rss-json.js'

const RSS_PATH = 'data/rss.json'
const INACTIVE_PATH = 'data/rss-inactive.json'

export function apply({ body, key, rssText, inactive }) {
  const request = parseRequestIssue(body)
  if (!request.isRequest) throw new Error('登録リクエストの形をしていません')
  if (!request.feed) throw new Error('フィードの URL がありません')
  if (!key) throw new Error('キーが決まっていません')

  // 一度外した番組を、黙って戻さない。放送終了なら人が判断する
  if (inactive && key in inactive) {
    throw new Error(`キー "${key}" は rss-inactive.json にあります（理由: ${inactive[key].reason || '不明'}）`)
  }

  return addChannelEntry(rssText, {
    key,
    feed: request.feed,
    // X とハッシュタグは、送る人が書いてくれたときだけ入れる。
    // フィード本文から機械で拾うと、出演者個人のアカウントや一般的なタグを
    // 掴んで間違える（#231 に実例）。分からないものは null のままにする
    twitter: request.twitter,
    hashtag: request.hashtag
  })
}

if (process.argv[1] && process.argv[1].endsWith('apply-register-request.js')) {
  try {
    const rssText = fs.readFileSync(RSS_PATH, 'utf8')
    const inactive = JSON.parse(fs.readFileSync(INACTIVE_PATH, 'utf8'))
    const next = apply({
      body: process.env.ISSUE_BODY || '',
      key: (process.env.KEY || '').trim(),
      rssText,
      inactive
    })
    fs.writeFileSync(RSS_PATH, next, 'utf8')

    // 書いたあとに、いつもの検証を通す。キーやフィードの重複がここで見つかれば
    // 書き戻して終わる（壊れたファイルで PR を作らない）
    const { errors } = validateRssJson(RSS_PATH, INACTIVE_PATH)
    if (errors.length) {
      fs.writeFileSync(RSS_PATH, rssText, 'utf8')
      throw new Error(`足したあとの検証で止まりました:\n${errors.join('\n')}`)
    }
  } catch (error) {
    process.stderr.write(String(error.message || error) + '\n')
    process.exit(1)
  }
}
