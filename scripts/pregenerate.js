const rss = require('../data/rss.json')
const shell = require('shelljs')
const wget = require('wget-improved')
const wgetp = require('node-wget-promise')
const fs = require('fs')
const xml2js = require('xml2js')
const moment = require('moment')
const _ = require('lodash')
const fileExtension = require('file-extension')

const DOWNLOADS_DIR = './static/downloads'
const RSS_DIR       = './static/downloads/rss'
const COVER_DIR     = './static/downloads/cover'
const BUILD_INFO    = './static/downloads/build_info.json'

// Make sure parent dir existence and its clean
shell.rm('-rf', DOWNLOADS_DIR)
shell.mkdir('-p', RSS_DIR)
shell.mkdir('-p', COVER_DIR)

var total = Object.keys(rss).length
var latest_pubdates = []
var episodes_in_2weeks = []
var channels = {}
var covers = {}

Object.keys(rss).forEach(function (key) {
  const src = rss[key].feed
  const dist_rss = `${RSS_DIR}/${key}.rss`
  const download = wget.download(src, dist_rss)
  download.on('end', ()=> {
    // nodeから実行する場合に、importなどが使えなかったために、async/awaitなどを使わないやり方で書いている
    fs.readFile(`${__dirname}/.${dist_rss}`, (err, xml)=> {
      if(err) {
        throw err
      }
      xml2js.parseString(xml, {explicitArray: false}, (_err, json)=> {
        if(_err) {
          throw _err
        }

        // TODO: Download cover images
        const cover = _.get(json, 'rss.channel[itunes:image].$.href') || _.get(json, 'rss.channel[itunes:image].href') || _.get(json, 'rss.channel.image.url')
        covers[key] = cover

        // Get the latest episode's publish date
        latest_pubdates.push({
          id: key,
          pubDate: json.rss.channel.item[0].pubDate
        })

        // Store episodes in last 2 weeks
        const channel_title = json.rss.channel.title
        const twoweeksago = moment().subtract(14, 'days').startOf('date')
        const episodes = json.rss.channel.item.filter((element, index, array)=> {
          return moment(element.pubDate).isAfter(twoweeksago)
        })
        // Add channel info into each episodes
        episodes.forEach(function(el) {
          el['channel_title'] = channel_title
        })
        episodes_in_2weeks = episodes_in_2weeks.concat(episodes)
        // Save title
        channels[key] = channel_title

        total--

        // Finish execution
        if(total <= 0) {

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
          var data = {
            load_order,
            episodes_in_2weeks,
            channels,
            updated: new Date(),
          }
          fs.writeFileSync(BUILD_INFO, JSON.stringify(data), 'utf8');

          // Download cover images ONE BY ONE
          // 一気にwgetすると404になる場合があるのでひとつずつ順番に
          const resolveAfter = (_key, _url) => {
            return wgetp(_url, {output: `${COVER_DIR}/${_key}.${fileExtension(_url)}`})
          }
          let p = Promise.resolve()
          Object.keys(covers).forEach(function (_key) {
            p = p.then(() => resolveAfter(_key, covers[_key]));
          })
        }
      })
    })
  })


  download.on('error', (__err)=> {
    console.err(__err)
  })
})
