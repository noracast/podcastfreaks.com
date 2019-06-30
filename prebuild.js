"use strict";

import _ from 'lodash'
import fetchTwitter from './scripts/fetch-twitter'
import fileExtension from 'file-extension'
import fs from 'fs'
import moment from 'moment'
import PFUtil from './scripts/pf-util'
import rss from './data/rss.json'
import shell from 'shelljs'
import wget from 'node-wget-promise'
import xml2js from 'xml2js'
import { promisify } from 'util'
import { RFC822 } from './scripts/constants'

// ----------------
// Detect arguments
const args = process.argv.slice() // copy
args.splice(0, 2) // remove not 'arg' values

// CLI arguments list
const NO_TWITTER = args.includes('--no-twitter') // to cancel twitter data fetching
// ----------------

const DOWNLOADS_DIR = 'static/downloads'
const RSS_DIR       = 'static/downloads/rss'
const COVER_DIR     = 'static/downloads/cover'
const BUILD_INFO    = 'static/downloads/build_info.json'

const util = new PFUtil()
const readFile = promisify(fs.readFile)
const xmlToJSON = promisify((new xml2js.Parser({explicitArray: false})).parseString)
const writeFile = promisify(fs.writeFile)

// Make sure parent dir existence and its clean
shell.rm('-rf', DOWNLOADS_DIR)
shell.mkdir('-p', RSS_DIR)
shell.mkdir('-p', COVER_DIR)

let episodes_in_2weeks = []
let latest_pubdates = []
let channels = {}
let covers = {}
let episodeCount = 0
let errors = []

const error = function(label, rss, error){
  console.error(`[prebuild error] ${label} | ${rss} | ${error}`)
  errors.push({label, rss, error})
}
const log = function(text){
  console.error(`[prebuild log] ${text}`)
}

process.on('unhandledRejection', console.dir)

const fetchFeed = async key => {
  const src = rss[key].feed
  const dist_rss = `${RSS_DIR}/${key}.rss`

  // Handling errors

  //------------------

  // Download RSS
  let err = ''
  const download = await wget(src, { output: dist_rss }).catch((e) => { err = e })
  if(!download){
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
    fileServer: util.getFileServer(episodes),
    durationAverage: util.getDurationAverage(episodes, dist_rss),
    durationMedian: util.getDurationMedian(episodes, dist_rss),
    desciprtion: channel.description ? channel.description : null
  }
}

(async () => {
  // Parallel Execution https://qiita.com/jkr_2255/items/62b3ee3361315d55078a
  await Promise.all(Object.keys(rss).map(async key => await fetchFeed(key))).catch((err)=> { error('fetchFeed', err) })

  if(!NO_TWITTER){
    log('Fetching twitter data')
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

  log('Export to list file ordered by pubDate')
  latest_pubdates.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  episodes_in_2weeks.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  const load_order = latest_pubdates.map(function(element, index, array) {
    return element.id;
  });

  log('Download cover images serially to avoid 404')
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

