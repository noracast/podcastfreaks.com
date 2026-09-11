"use strict";

// data/rss.json の重複チェックだけを単体で実行する（yarn validate）。
// fetch-feeds でも同じ検証が走るが、フィードを追加した時点で確認できるようにしておく

import consola from 'consola'
import validateRssJson from './validate-rss-json.js'
import { RSS_JSON, RSS_INACTIVE_JSON } from './constants.js'

// 動作確認用に別のファイルも渡せるようにしておく
const [rssPath = RSS_JSON, inactivePath = RSS_INACTIVE_JSON] = process.argv.slice(2)

const { errors, warnings, count } = validateRssJson(rssPath, inactivePath)

warnings.forEach(message => consola.warn(message))
errors.forEach(message => consola.error(message))

if(errors.length){
  consola.error(`${rssPath} に ${errors.length}件の重複があります`)
  process.exit(1)
}
consola.success(`${rssPath} の ${count}件に重複はありません`)
