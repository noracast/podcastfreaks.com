"use strict";

import _ from 'lodash'
import consola from 'consola'
import 'date-utils'
import fetchTwitter from './scripts/fetch-twitter'
import fileExtension from 'file-extension'
import fs from 'fs'
import moment from 'moment'
import nodeCleanup from 'node-cleanup'
import PFUtil from './scripts/pf-util'
import rss from './data/rss.json'
import serializeError from 'serialize-error'
import shell from 'shelljs'
import sleep from 'sleep'
import wget from 'node-wget-promise'
import xml2js from 'xml2js'
import { promisify } from 'util'
import {
  RFC822,
  DOWNLOADS_DIR,
  RSS_DIR,
  COVER_DIR,
  BUILD_INFO
} from './scripts/constants'

// ----------------
// Detect arguments
const args = process.argv.slice() // copy
args.splice(0, 2) // remove not 'arg' values

// CLI arguments list
const NO_TWITTER = args.includes('--no-twitter') // to cancel twitter data fetching
// ----------------

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

  // Download RSS (try 3 times)
  let err = ''
  let count = 1
  let download = false
  while (count <= 3 ) {
    download = await wget(src, { output: dist_rss }).catch((e) => { err = e })
    if (download) {
      break
    }
    consola.log('wget fail : ' + count)
    await sleep(2000)
    count--
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

  // json.rss.channel.item must be Array
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
    pubDate: episodes.pubDate
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
    firstEpisodeDate: moment(_.last(episodes).pubDate, RFC822).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
    lastEpisodeDate: moment(_.first(episodes).pubDate, RFC822).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
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


  // Parallel Execution https://qiita.com/jkr_2255/items/62b3ee3361315d55078a
  await Promise.all(Object.keys(rss).map(async key => await fetchFeed(key))).catch((err) => { error('fetchFeed', err) })

  if(!NO_TWITTER){
    consola.log('Start fetching twitter data...')
    const accounts = {}
    for(let key in rss) {
      if(rss[key]){
        if(rss[key].twitter) {
          accounts[key] = {
            twitter: rss[key].twitter.replace('@','')
          }
        }
        if(rss[key].hashtag) {
          if(!accounts[key]) {
            accounts[key] = {}
          }
          accounts[key]['hashtag'] = rss[key].hashtag
        }
      }
    }
    const twitterData = await fetchTwitter(accounts)
    for(let key in twitterData) {
      // Ignore if key is not exist in channels (maybe it couldn't get with error)
      if(channels[key]){
        for(let prop in twitterData[key]){
          channels[key][prop] = twitterData[key][prop]
        }
      }
    }
  }

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
  for(let key of Object.keys(covers)) await util.downloadAndResize(key, covers[key].src, covers[key].dist)

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
})();

nodeCleanup(function (exitCode, signal) {
  if (signal == 'SIGINT' && downloads_backup) {
    consola.log(`-> Restore from backup`)
    shell.rm('-rf', DOWNLOADS_DIR)
    shell.mv(downloads_backup, `${DOWNLOADS_DIR}/`)
  }
  else if (signal == 0 && downloads_backup) {
    consola.log(`-> Remove backup`)
    shell.rm('-rf', downloads_backup)
  }
});
