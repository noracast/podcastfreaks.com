"use strict";

// data/added-at.json を作り直す。
//
//   yarn added-at            （ローカル）
//   node scripts/update-added-at-cli.js  （CI。依存のインストール不要）

const updateAddedAt = require('./update-added-at')

const { total, resolved, missing, changed, path } = updateAddedAt()

if (missing.length) {
  console.warn(`追加日を特定できませんでした（${missing.length}件）: ${missing.join(', ')}`)
}
console.log(`${path}: ${resolved}/${total}件${changed ? '（更新しました）' : '（変更なし）'}`)
