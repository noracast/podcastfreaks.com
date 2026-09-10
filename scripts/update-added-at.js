"use strict";

// data/added-at.json を git 履歴から作り直す。
//
// 「サイトに登録された日」は data/rss.json にそのキーが初めて現れたコミットの
// 日付そのものなので、履歴から導出できる。推測も手入力も要らない。
//
// data/rss.json は外部からの PR も受け付ける「登録情報」なので、
// 運用側の記録である追加日はこのファイルに分けている。
//
// 毎回すべて作り直すため、取りこぼしても次の実行で自己修復する。
// 実行には完全な履歴が必要（CI では actions/checkout の fetch-depth: 0）。
//
// GitHub Actions から依存のインストールなしで動かせるよう、
// babel も外部モジュールも使わない素の CommonJS で書いている。
// そのためパスは scripts/constants.js と重複して持つ。
//
// Ref: https://github.com/noracast/podcastfreaks.com/issues/50

import { execFileSync } from 'child_process'
import fs from 'fs'

const RSS_JSON = 'data/rss.json'
const ADDED_AT_JSON = 'data/added-at.json'

// そのキーが data/rss.json に初めて現れたコミットの日付（YYYY-MM-DD）。
// -S は「その文字列の出現回数が変わったコミット」を拾うので追加も削除も
// 引っかかる。--diff-filter=AM でファイルの追加・変更に絞り、
// --reverse で最も古いものを先頭に持ってくる
const addedAtOf = (key) => {
  const out = execFileSync('git', [
    'log',
    '--diff-filter=AM',
    `-S"${key}":`,
    '--format=%aI',
    '--reverse',
    '--',
    RSS_JSON
  ], { encoding: 'utf8' })

  const first = out.split('\n').find(line => line.trim())
  return first ? first.slice(0, 10) : null
}

function updateAddedAt() {
  const rss = JSON.parse(fs.readFileSync(RSS_JSON, 'utf8'))
  const keys = Object.keys(rss).sort()

  const addedAt = {}
  const missing = []
  for (const key of keys) {
    const date = addedAtOf(key)
    if (date) addedAt[key] = date
    else missing.push(key)
  }

  // キー順に並べて、差分が読みやすい形で書き出す
  const json = JSON.stringify(addedAt, null, 2) + '\n'
  const before = fs.existsSync(ADDED_AT_JSON) ? fs.readFileSync(ADDED_AT_JSON, 'utf8') : null
  const changed = before !== json
  if (changed) fs.writeFileSync(ADDED_AT_JSON, json, 'utf8')

  return { total: keys.length, resolved: Object.keys(addedAt).length, missing, changed, path: ADDED_AT_JSON }
}

export default updateAddedAt
