const _ = require('lodash')
const fileExtension = require('file-extension')
const fs = require('fs')
const moment = require('moment')
const resizer = require('node-image-resizer')
const rss = require('../data/rss.json')
const shell = require('shelljs')
const url = require('url')
const wget = require('wget-improved')
const wgetp = require('node-wget-promise')
const xml2js = require('xml2js')

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

process.on('unhandledRejection', console.dir)

// https://example.com/cover.jpg?fit=3000%2C3000 -> https://example.com/cover.jpg
var removeQuery = function(uri) {
  if(uri){
    const u = url.parse(uri)
    return `${u.protocol}//${u.host}${u.pathname}`
  }
  return uri
}

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

        // Get cover image urls
        const cover_url = removeQuery(_.get(json, 'rss.channel[itunes:image].$.href') || _.get(json, 'rss.channel[itunes:image].href') || _.get(json, 'rss.channel.image.url'))
        if(cover_url){
          covers[key] = {
            src: cover_url,
            dist: `${COVER_DIR}/${key}.${fileExtension(cover_url)}`
          }
        }

        // json.rss.channel.item must be Array
        if(!(json.rss.channel.item instanceof Array)) {
          json.rss.channel.item = [json.rss.channel.item]
          // TODO ページの描画時にも配列でないことで不具合が起こるので、ここで上書きしてしまいたい
        }

        // Get the latest episode's publish date
        latest_pubdates.push({
          id: key,
          pubDate: json.rss.channel.item[0].pubDate
        })

        // Store episodes in last 2 weeks
        const channel_title = json.rss.channel.title
        const twoweeksago = moment().subtract(14, 'days').startOf('date')
        // RSS date format is RFC-822
        const rfc822 = 'ddd, DD MMM YYYY HH:mm:ss ZZ'
        const episodes = json.rss.channel.item.filter((element, index, array)=> {
          return moment(element.pubDate, rfc822).isAfter(twoweeksago)
        })
        // Add channel info into each episodes
        episodes.forEach(function(el) {
          el['key'] = key
          el['channel_title'] = channel_title
        })
        episodes_in_2weeks = episodes_in_2weeks.concat(episodes)
        // Save title
        const u = url.parse(json.rss.channel.item[0].enclosure.$.url)
        channels[key] = {
          title: channel_title,
          cover: covers[key] ? covers[key].dist.replace(/^\.\/static/, '') : null,
          total: json.rss.channel.item.length,
          firstDate: _.last(json.rss.channel.item).pubDate,
          lastDate: _.first(json.rss.channel.item).pubDate,
          fileServer: `${u.protocol}//${u.host}`
        }

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
            return wgetp(_src, {output: _dist}).then(() => resizer(_dist, config), (e)=> console.error(_src, e))
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
          }
          fs.writeFileSync(BUILD_INFO, JSON.stringify(data), 'utf8');
        }
      })
    })
  })
  download.on('error', (__err)=> {
    console.error(__err)
  })
})
