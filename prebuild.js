"use strict";

import _ from 'lodash'
import consola from 'consola'
import 'date-utils'
import fileExtension from 'file-extension'
import fs from 'fs'
import moment from 'moment'
import nodeCleanup from 'node-cleanup'
import parsePubDate from './scripts/parse-pub-date'
import PFUtil from './scripts/pf-util'
import rss from './data/rss.json'
import { serializeError } from 'serialize-error'
import shell from 'shelljs'
import wget from './scripts/wget-with-timeout'
import xml2js from 'xml2js'
import { promisify } from 'util'
import {
  DOWNLOADS_DIR,
  RSS_DIR,
  COVER_DIR,
  BUILD_INFO
} from './scripts/constants'

const sleep = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000))

// RSS の同時ダウンロード数。全件を一斉に投げるとソケットを取れないリクエストが
// 通信を始める前にタイムアウトしてしまうため、ワーカープールで絞る
const CONCURRENCY = 20

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
    consola.error(`${label} | ${rss} | ${error}`)
    errors.push({label, rss, error: serializeError(error)})
  }
  else {
    consola.error(`${label} | ${rss}`)
    errors.push({label, rss})
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
    consola.log(`wget retry #${tries} | ${dist_rss} | ${err}`)
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

  const json = await xmlToJSON(xml).catch(() => { return })
  if(!json){
    error('xmlToJSON', dist_rss)
    return // catch内では、fetchFeedを抜けられないのでここでreturn
  }

  // Atom フィードやエラーページを掴んだ場合 json.rss が存在しない
  if(!_.get(json, 'rss.channel')) {
    error('fetchFeed', dist_rss, new Error('No <rss><channel> found'))
    return
  }

  // json.rss.channel.item must be Array
  if(!json.rss.channel.item) {
    error('fetchFeed', dist_rss, new Error('No episodes found'))
    return
  }
  if(!(json.rss.channel.item instanceof Array)) {
    json.rss.channel.item = [json.rss.channel.item]
  }

  // Get cover image urls
  const cover_url = util.removeQuery(_.get(json, 'rss.channel[itunes:image].$.href') || _.get(json, 'rss.channel[itunes:image].href') || _.get(json, 'rss.channel.image.url'))
  if(cover_url){
    covers[key] = {
      src: cover_url,
      dist: `${COVER_DIR}/${key}.${fileExtension(cover_url)}`
    }
  }

  const channel = json.rss.channel
  const episodes = channel.item
  const title = channel.title

  // count episodes
  episodeCount += episodes.length // TODO ここではなく、必要になる所で計測して依存関係を切る

  // Get the latest episode's publish date
  latest_pubdates.push({
    id: key,
    pubDate: episodes[0].pubDate
  })

  episodes_in_2weeks = episodes_in_2weeks.concat(util.getEpisodesIn2Weeks(episodes, key, title))

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
    durationAverage: util.getDurationAverage(episodes, dist_rss),
    durationMedian: util.getDurationMedian(episodes, dist_rss),
    desciprtion: channel.description ? channel.description : null
  }
}

(async () => {
  // Make sure parent dir existence and its clean
  try {
    await readFile(BUILD_INFO)
    downloads_backup = `${DOWNLOADS_DIR}(backup ${new Date().toFormat('YYYYMMDD-HH24MISS')})/`
    shell.mv(`${DOWNLOADS_DIR}/`, downloads_backup)
    shell.mkdir('-p', RSS_DIR)
    shell.mkdir('-p', COVER_DIR)
    consola.log(`-> Create backup to ${downloads_backup}`)
  } catch (err) {
    shell.rm('-rf', DOWNLOADS_DIR)
    shell.mkdir('-p', RSS_DIR)
    shell.mkdir('-p', COVER_DIR)
  }


  // Promise.all だと1件でも reject した時点で残りを待たずに先へ進んでしまい、
  // 集計が途中の状態で出力されるため、全件の完了を待って個別に記録する
  const keys = Object.keys(rss)
  const results = await allSettledWithLimit(keys, fetchFeed, CONCURRENCY)
  results.forEach((result, i) => {
    if(result.status === 'rejected') {
      error('fetchFeed', keys[i], result.reason)
    }
  })

  consola.log('Export to list file ordered by pubDate')
  latest_pubdates.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  episodes_in_2weeks.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  const load_order = latest_pubdates.map(function(element, index, array) {
    return element.id;
  });

  consola.log('Download cover images serially to avoid 404')
  for(let key of Object.keys(covers)) {
    const downloaded = await util.downloadAndResize(key, covers[key].src, covers[key].dist)
    // 取得に失敗したカバーはファイルが存在せず画像が壊れるので、参照を外して
    // cover.vue のプレースホルダー表示に切り替える
    if(!downloaded && channels[key]) channels[key].cover = null
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
  await writeFile(BUILD_INFO, JSON.stringify(data), 'utf8')

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
    consola.log(`-> Remove backup`)
    shell.rm('-rf', downloads_backup)
  }
  else {
    // 中断・異常終了時は取得途中のデータを残さず、前回の内容へ戻す
    consola.log(`-> Restore from backup`)
    shell.rm('-rf', DOWNLOADS_DIR)
    shell.mv(downloads_backup, `${DOWNLOADS_DIR}/`)
  }
});
