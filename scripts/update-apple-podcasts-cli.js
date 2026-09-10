"use strict";

// data/apple-podcasts.json を更新する。
//
//   yarn apple-podcasts              未登録の番組だけ調べる
//   yarn apple-podcasts --refresh    自動取得分を全て調べ直す

import updateApplePodcasts from './update-apple-podcasts.js'

const refresh = process.argv.includes('--refresh')
const { total, resolved, manual, added, notFound, changed, path } = updateApplePodcasts({ refresh })

if (added.length) console.log(`追加: ${added.length}件（${added.slice(0, 10).join(', ')}${added.length > 10 ? ' ほか' : ''}）`)
if (notFound.length) console.log(`見つからず: ${notFound.length}件。Apple 側とフィードURLが違う番組は data/apple-podcasts.json に手で足せます（"source": "manual"）`)
console.log(`${path}: ${resolved}/${total}件（うち手動 ${manual}件）${changed ? '（更新しました）' : '（変更なし）'}`)
