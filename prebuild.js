import _ from 'lodash'
import fileExtension from 'file-extension'
import fs from 'fs'
import moment from 'moment'
import path from 'path'
import rss from './data/rss.json'
import sharp from 'sharp'
import shell from 'shelljs'
import wget from 'node-wget-promise'
import wgetp from 'node-wget-promise'
import xml2js from 'xml2js'
import Util from './scripts/util'
import { promisify } from 'util'

let util = new Util()
const readFile = promisify(fs.readFile)
const xmlToJSON = promisify((new xml2js.Parser()).parseString)
const writeFile = promisify(fs.writeFile)

const RFC822 = 'ddd, DD MMM YYYY HH:mm:ss ZZ'
const DOWNLOADS_DIR = 'static/downloads'
const RSS_DIR       = 'static/downloads/rss'
const COVER_DIR     = 'static/downloads/cover'
const BUILD_INFO    = 'static/downloads/build_info.json'

// Make sure parent dir existence and its clean
shell.rm('-rf', DOWNLOADS_DIR)
shell.mkdir('-p', RSS_DIR)
shell.mkdir('-p', COVER_DIR)

let episodes_in_2weeks = []
var latest_pubdates = []
var channels = {}
var covers = {}
var episodeCount = 0

process.on('unhandledRejection', console.dir)

const twoweeksago = moment().subtract(14, 'days').startOf('date')
const getEpisodesIn2Weeks = (episodes, key, title)=> {
  // Add channel info into each episodes
  return episodes.filter((element, index, array)=> {
    // RSS date format is RFC-822
    return moment(element.pubDate, RFC822).isAfter(twoweeksago)
  }).forEach(function(el) {
    el['key'] = key
    el['channel_title'] = title
  })
}
const fetchFeed = async key => {
  const src = rss[key].feed
  const dist_rss = `${RSS_DIR}/${key}.rss`

  // Download RSS
  await wget(src, { output: dist_rss }).catch((err) => { console.error(`[prebuild error] read | ${dist_rss}`, err) })

  // Read RSS
  const xml = await readFile(`${__dirname}/${dist_rss}`).catch(() => { return })
  if(!xml){
    console.error(`[prebuild error] read | ${dist_rss}`)
    return // catch内では、fetchFeedを抜けられないのでここでreturn
  }
  const json = await xmlToJSON(xml).catch(() => { return })
  if(!json){
    console.error(`[prebuild error] parse | ${dist_rss}`)
    return // catch内では、fetchFeedを抜けられないのでここでreturn
  }

  // Get cover image urls
  const cover_url = util.removeQuery(_.get(json, 'rss.channel[0][itunes:image][0].$.href') || _.get(json, 'rss.channel[0][itunes:image][0].href') || _.get(json, 'rss.channel[0].image[0].url[0]'))
  if(cover_url){
    covers[key] = {
      src: cover_url,
      dist: `${COVER_DIR}/${key}.${fileExtension(cover_url)}`
    }
  }

  const channel = json.rss.channel[0]
  const episodes = channel.item
  const title = channel.title[0]

  // count episodes
  episodeCount += episodes.length // TODOここじゃないとこで、最後にやる

  // Get the latest episode's publish date
  latest_pubdates.push({
    id: key,
    pubDate: episodes[0].pubDate
  })

  episodes_in_2weeks = episodes_in_2weeks.concat(getEpisodesIn2Weeks(episodes, key, title))

  // Save data
  channels[key] = {
    key,
    title,
    twitter: rss[key].twitter,
    feed: rss[key].feed,
    link: channel.link,
    hashtag: rss[key].hashtag,
    cover: covers[key] ? covers[key].dist.replace(/^static/,'') : null,
    total: episodes.length,
    firstEpisodeDate: moment(_.last(episodes).pubDate, RFC822).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
    lastEpisodeDate: moment(_.first(episodes).pubDate, RFC822).format(moment.HTML5_FMT.DATETIME_LOCAL_SECONDS),
    firstEpisodeLink: _.last(episodes).link,
    lastEpisodeLink: _.first(episodes).link,
    fileServer: util.getFileServer(episodes[0]),
    durationAverage: util.getDurationAverage(episodes, dist_rss),
    durationMedian: util.getDurationMedian(episodes, dist_rss),
    desciprtion: channel.description ? channel.description[0] : null
  }
}

(async () => {

  // https://qiita.com/jkr_2255/items/62b3ee3361315d55078a
  // 並列処理
  // await Promise.all(Object.keys(rss).map(async key => await fetchFeed(key))).catch(()=> { console.log('catch!'); return 'hoge' })
  // 直列処理
  for(let key of Object.keys(rss)) await fetchFeed(key)

  console.log('ALL DONE!!!!')

  // Export to list file ordered by pubDate
  latest_pubdates.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  episodes_in_2weeks.sort(function(a, b) {
    return new Date(b.pubDate) - new Date(a.pubDate)
  })
  var load_order = latest_pubdates.map(function(element, index, array) {
    return element.id;
  });

  // Download cover images ONE BY ONE
  // 一気にwgetすると404になる場合があるのでひとつずつ順番に取得する
  const resolveAfter = (_key, _src, _dist) => {
    const config = {
      all: {
        quality: 100,
        path: `${COVER_DIR}/`
      },
      versions: [
        {
          suffix: '-30',
          width: 60,
          height: 60
        },
        {
          suffix: '-60',
          width: 120,
          height: 120
        }
      ]
    }
    return wgetp(_src, {output: _dist}).then(() => {
      const ext = path.extname(_dist)
      const ext_120 = _dist.replace(ext, ext.replace('.', '-120.'))
      const ext_60 = _dist.replace(ext, ext.replace('.', '-60.'))
      sharp(_dist)
        .resize(120)
        .toFile(ext_120, (err, info) => {
          if(err){
            console.error('[prebuild error]', key, err, info)
          }
        })
        .resize(60)
        .toFile(ext_60, (err, info) => {
          if(err){
            console.error('[prebuild error]', key, err, info)
          }
        })
    })
  }
  let p = Promise.resolve()
  Object.keys(covers).forEach(function (_key) {
    p = p.then(() => resolveAfter(_key, covers[_key].src, covers[_key].dist));
  })

  var data = {
    load_order,
    episodes_in_2weeks,
    channels,
    updated: new Date(),
    episodeCount
  }

  await writeFile(BUILD_INFO, JSON.stringify(data), 'utf8')

  console.log('FILE OK!')
})();

