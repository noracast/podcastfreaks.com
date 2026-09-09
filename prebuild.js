"use strict";

import _ from 'lodash'
import consola from 'consola'
import decodeEntities from './scripts/decode-entities'
import 'date-utils'
import fileExtension from 'file-extension'
import fs from 'fs'
import moment from 'moment'
import nodeCleanup from 'node-cleanup'
import path from 'path'
import normalizeFeed from './scripts/normalize-feed'
import parsePubDate from './scripts/parse-pub-date'
import PFUtil from './scripts/pf-util'
import rss from './data/rss.json'
import { serializeError } from 'serialize-error'
import shell from 'shelljs'
import validateRssJson from './scripts/validate-rss-json'
import wget from './scripts/wget-with-timeout'
import xml2js from 'xml2js'
import { promisify } from 'util'
import {
  DOWNLOADS_DIR,
  RSS_DIR,
  COVER_DIR,
  BUILD_INFO,
  RSS_JSON,
  RSS_INACTIVE_JSON
} from './scripts/constants'

// consola の既定 reporter は error / warn をバッジ表示にするため、
// メッセージの前後に空行が入って読みにくい。バッジを使わずに1行で出す
class CompactReporter extends consola.FancyReporter {
  formatLogObj(logObj, opts) {
    return super.formatLogObj({ ...logObj, badge: false }, opts)
  }
}
consola.setReporters([new CompactReporter()])

// OpenSSL のエラーなど、メッセージ自体に改行を含むものがあるため1行にまとめる
const oneLine = (value) => String(value).replace(/\s+/g, ' ').trim()

// 表示用のタイトルを整える。
// - CDATA 内で二重にエスケープされているフィードがあるため実体参照を戻す
//   （例: regonn&curry.fm の "&amp;" が画面にそのまま出てしまう）
// - 改行や連続空白、前後の空白が入っているフィードがあるため詰める
//   （例: datafriday の "Data Friday\n-日常に潜むよしなしごと-"、
//     design-fm の先頭の空白）
const cleanTitle = (value) => {
  const decoded = decodeEntities(value)
  return typeof decoded === 'string' ? decoded.replace(/\s+/g, ' ').trim() : decoded
}

const sleep = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000))

// 実体参照になっていない & を &amp; に直す。
// フィード側の XML が壊れていることがあるため（例: fukabori.fm の
// "Weights & Biases"）、解析に失敗したときのフォールバックとしてのみ使う。
// CDATA セクション内の & は実体参照として解釈されないので対象外にする
const escapeBareAmpersands = (xml) =>
  String(xml)
    .split(/(<!\[CDATA\[[\s\S]*?\]\]>)/)
    .map((part, i) => i % 2 ? part : part.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;'))
    .join('')

// RSS の同時ダウンロード数。全件を一斉に投げるとソケットを取れないリクエストが
// 通信を始める前にタイムアウトしてしまうため、ワーカープールで絞る
const CONCURRENCY = 20

// 前回より取得できた番組がこの割合を下回ったら、異常とみなしてビルドを止める。
// 数件の失敗は日常的に起きる（直近の本番ビルドでも235件中3件が失敗している）ので、
// 「大量に取りこぼしたとき」だけ止まるように余裕を持たせる
const MIN_CHANNEL_RATIO = 0.8

// RSS 取得の試行回数と、リトライ前に待つ秒数
const MAX_TRIES = 3
const RETRY_WAIT = 2

// 存在しないホストや 404 はリトライしても結果が変わらないので、
// 一時的な失敗（レート制限による 400、切断、タイムアウトなど）だけを再試行する
const isRetriable = (e) => {
  const message = String((e && e.message) || e || '')
  if (/getaddrinfo|ENOTFOUND/.test(message)) return false
  if (/protocol should be http or https/.test(message)) return false
  const status = message.match(/unhandled status: (\d+)/)
  if (status) return status[1] !== '404' && status[1] !== '410'
  return true
}

// Promise.allSettled と同じ形の結果を返しつつ、同時実行数を limit までに制限する
const allSettledWithLimit = async (items, task, limit) => {
  const results = new Array(items.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++
      try {
        results[i] = { status: 'fulfilled', value: await task(items[i]) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const util = new PFUtil()
const readFile = promisify(fs.readFile)
const xmlToJSON = promisify((new xml2js.Parser({explicitArray: false})).parseString)
const writeFile = promisify(fs.writeFile)

let episodes_in_2weeks = []
let latest_pubdates = []
let channels = {}
let covers = {}
let episodeCount = 0
let errors = []
let downloads_backup = null

const error = function(label, rss, error){
  if(error) {
    consola.error(`${label} | ${rss} | ${oneLine(error)}`)
    errors.push({label, rss, error: serializeError(error)})
  }
  else {
    consola.error(`${label} | ${rss}`)
    errors.push({label, rss})
  }

}

// 退避した前回の内容から番組数を読む。比較できないときは null を返す
const previousChannelCount = async () => {
  if(!downloads_backup) return null
  const json = await readFile(`${downloads_backup}${path.basename(BUILD_INFO)}`, 'utf8').catch(() => { return })
  if(!json) return null
  try {
    return Object.keys(JSON.parse(json).channels || {}).length
  } catch (e) {
    return null
  }
}

process.on('unhandledRejection', console.dir)

const fetchFeed = async key => {
  const src = rss[key].feed
  const dist_rss = `${RSS_DIR}/${key}.rss`

  // Handling errors

  //------------------

  // Download RSS
  // 元の実装は .catch() が reject を握り潰していたため await が throw せず、
  // 常に break に到達して1回しか試行していなかった
  let err = ''
  let download = false
  for (let tries = 1; tries <= MAX_TRIES; tries++) {
    err = ''
    download = await wget(src, { output: dist_rss }).catch((e) => { err = e; return false })
    if (download) break
    if (tries === MAX_TRIES || !isRetriable(err)) break
    consola.log(`再試行 ${tries}/${MAX_TRIES-1} | ${dist_rss} | ${oneLine(err)}`)
    await sleep(RETRY_WAIT)
  }

  if (!download) {
    error('wget', dist_rss, err)
    return // catch内では、fetchFeedを抜けられないのでここでreturn
  }

  // Read RSS
  const xml = await readFile(`${__dirname}/${dist_rss}`).catch(() => { return })
  if(!xml){
    error('readFile', dist_rss)
    return // catch内では、fetchFeedを抜けられないのでここでreturn
  }

  // まず素直に解析し、失敗したときだけ最小限の補正をしてやり直す。
  // 正常なフィードには一切手を加えない
  let json = await xmlToJSON(xml).catch(() => { return })
  if(!json){
    json = await xmlToJSON(escapeBareAmpersands(xml)).catch(() => { return })
    if(json) consola.warn(`不正な XML を補正して読み込みました | ${dist_rss}`)
  }
  if(!json){
    error('xmlToJSON', dist_rss)
    return // catch内では、fetchFeedを抜けられないのでここでreturn
  }

  // RSS 2.0 と Atom を同じ形に揃える。エラーページを掴んだ場合もここで弾かれる
  const channel = normalizeFeed(json)
  if(!channel) {
    error('fetchFeed', dist_rss, new Error('RSS でも Atom でもありません'))
    return
  }

  if(!channel.item || (channel.item instanceof Array && channel.item.length === 0)) {
    error('fetchFeed', dist_rss, new Error('No episodes found'))
    return
  }
  if(!(channel.item instanceof Array)) {
    channel.item = [channel.item]
  }

  // Get cover image urls
  const cover_url = util.removeQuery(_.get(channel, '[itunes:image].$.href') || _.get(channel, '[itunes:image].href') || _.get(channel, 'image.url'), src)
  if(cover_url){
    covers[key] = {
      src: cover_url,
      dist: `${COVER_DIR}/${key}.${fileExtension(cover_url)}`
    }
  }

  const episodes = channel.item

  channel.title = cleanTitle(channel.title)
  episodes.forEach(ep => { if(ep) ep.title = cleanTitle(ep.title) })

  const title = channel.title

  // count episodes
  episodeCount += episodes.length // TODO ここではなく、必要になる所で計測して依存関係を切る

  // Get the latest episode's publish date
  latest_pubdates.push({
    id: key,
    pubDate: episodes[0].pubDate
  })

  episodes_in_2weeks = episodes_in_2weeks.concat(util.getEpisodesIn2Weeks(episodes, key, title))

  // 平均と中央値で同じ解析を2度走らせない（警告も2回出ていた）
  const durations = util.getDurations(episodes, dist_rss)

  // Save data
  channels[key] = {
    key,
    title,
    twitter: rss[key].twitter,
    feed: rss[key].feed,
    link: channel.link ? channel.link : null,
    hashtag: rss[key].hashtag,
    cover: covers[key] ? covers[key].dist.replace(/^static/,'') : null,
    total: episodes.length,
    firstEpisodeDate: parsePubDate(_.last(episodes).pubDate).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
    lastEpisodeDate: parsePubDate(_.first(episodes).pubDate).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
    firstEpisodeLink: _.last(episodes).link,
    lastEpisodeLink: _.first(episodes).link,
    recentEpisodes: _.take(episodes, 5),
    fileServer: util.getFileServer(episodes),
    updateInterval: util.getUpdateInterval(episodes),
    durationAverage: util.getDurationAverage(durations),
    durationMedian: util.getDurationMedian(durations),
    desciprtion: channel.description ? channel.description : null
  }
}

(async () => {
  const startedAt = Date.now()

  // 重複したまま取得しても無駄になるので、通信を始める前に検証する
  const validation = validateRssJson(RSS_JSON, RSS_INACTIVE_JSON)
  validation.warnings.forEach(message => consola.warn(`${RSS_JSON} | ${message}`))
  if(validation.errors.length){
    validation.errors.forEach(message => consola.error(`${RSS_JSON} | ${message}`))
    consola.error(`${RSS_JSON} の重複を解消してから実行してください`)
    process.exit(1)
  }

  // Make sure parent dir existence and its clean
  try {
    await readFile(BUILD_INFO)
    downloads_backup = `${DOWNLOADS_DIR}(backup ${new Date().toFormat('YYYYMMDD-HH24MISS')})/`
    shell.mv(`${DOWNLOADS_DIR}/`, downloads_backup)
    shell.mkdir('-p', RSS_DIR)
    shell.mkdir('-p', COVER_DIR)
    consola.log(`前回の内容を退避しました: ${downloads_backup}`)
  } catch (err) {
    shell.rm('-rf', DOWNLOADS_DIR)
    shell.mkdir('-p', RSS_DIR)
    shell.mkdir('-p', COVER_DIR)
  }


  // Promise.all だと1件でも reject した時点で残りを待たずに先へ進んでしまい、
  // 集計が途中の状態で出力されるため、全件の完了を待って個別に記録する
  const keys = Object.keys(rss)
  consola.log(`[1/3] RSS を取得します（${keys.length}件 / 同時${CONCURRENCY}件）`)
  const results = await allSettledWithLimit(keys, fetchFeed, CONCURRENCY)
  results.forEach((result, i) => {
    if(result.status === 'rejected') {
      error('fetchFeed', keys[i], result.reason)
    }
  })

  latest_pubdates.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  episodes_in_2weeks.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  const load_order = latest_pubdates.map(function(element, index, array) {
    return element.id;
  });

  consola.log(`[2/3] カバー画像を取得します（${Object.keys(covers).length}件 / 404 を避けるため直列）`)
  for(let key of Object.keys(covers)) {
    const downloaded = await util.downloadAndResize(key, covers[key].src, covers[key].dist)
    // 取得に失敗したカバーはファイルが存在せず画像が壊れるので、参照を外して
    // cover.vue のプレースホルダー表示に切り替える
    if(!downloaded && channels[key]) channels[key].cover = null
  }

  // 取得結果が明らかにおかしいときは、書き出さずに異常終了する。
  //
  // netlify.toml のビルドコマンドは `yarn prebuild && nuxt generate --spa` なので、
  // ここで止めればサイトの生成まで進まない。以前は全件失敗しても exit 0 で終わり、
  // 中身が空の build_info.json でサイトが生成されうる状態だった。
  // 異常終了時は nodeCleanup が退避した前回の内容へ戻すため、取得済みのデータも守られる
  const fetched = Object.keys(channels).length
  if(fetched === 0) {
    consola.error(`1番組も取得できませんでした（${keys.length}件すべて失敗）。${BUILD_INFO} は更新しません`)
    process.exit(1)
  }
  const previous = await previousChannelCount()
  if(previous && fetched < previous * MIN_CHANNEL_RATIO) {
    consola.error(`取得できた番組が前回より大幅に減りました（前回 ${previous}番組 → 今回 ${fetched}番組）。${BUILD_INFO} は更新しません`)
    process.exit(1)
  }

  const data = {
    load_order,
    episodes_in_2weeks,
    channels,
    updated: new Date(),
    episodeCount,
    errors
  }

  // Save to file
  consola.log(`[3/3] ${BUILD_INFO} を書き出します`)
  await writeFile(BUILD_INFO, JSON.stringify(data), 'utf8')

  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  consola.success(
    `完了: ${Object.keys(channels).length}/${keys.length}番組 / ` +
    `${episodeCount}エピソード / 取得できなかった番組 ${errors.length}件 / ` +
    `所要 ${Math.floor(elapsed/60)}分${String(elapsed%60).padStart(2, '0')}秒`
  )

  // 念のため明示的に終了する。ダウンロード側でソケットは destroy しているが、
  // 取りこぼしがあるとプロセスが終了せずビルドが止まってしまうため
  process.exit(0)
})();

// node-cleanup は正常終了時に (exitCode, null)、シグナルによる終了時に (null, signal)
// で呼ばれる。以前は成功条件を signal == 0 としていたため（正常終了時 signal は null）
// この分岐が一度も実行されず、バックアップが削除されずに溜まり続けていた
nodeCleanup(function (exitCode) {
  if (!downloads_backup) return

  if (exitCode === 0) {
    consola.log(`退避した前回の内容を削除しました`)
    shell.rm('-rf', downloads_backup)
  }
  else {
    // 中断・異常終了時は取得途中のデータを残さず、前回の内容へ戻す
    consola.log(`中断されたため、退避した前回の内容へ戻します`)
    shell.rm('-rf', DOWNLOADS_DIR)
    shell.mv(downloads_backup, `${DOWNLOADS_DIR}/`)
  }
});
