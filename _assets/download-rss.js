const rss = require('../data/rss.json')
const shell = require('shelljs')
const wget = require('wget-improved')
const fs = require('fs')
const xml2js = require('xml2js')
const moment = require('moment')

const DOWNLOADS_DIR = './static/downloads'
const RSS_DIR       = './static/downloads/rss'
const BUILD_INFO    = './static/downloads/build_info.json'

// Make sure parent dir existence and its clean
shell.rm('-rf', DOWNLOADS_DIR)
shell.mkdir('-p', RSS_DIR)

var total = Object.keys(rss).length
var latest_pubdates = []
var episodes_in_2weeks = []

Object.keys(rss).forEach(function (key) {
  let src = rss[key]
  let dist = `${RSS_DIR}/${key}.rss`
  let download = wget.download(src, dist)
  download.on('end', ()=> {
    // nodeから実行する場合に、importなどが使えなかったために、async/awaitなどを使わないやり方で書いている
    fs.readFile(`${__dirname}/.${dist}`, (err, xml)=> {
      if(err) {
        throw err
      }
      xml2js.parseString(xml, {explicitArray: false}, (_err, json)=> {
        if(_err) {
          throw _err
        }
        // Get the latest episode's publish date
        latest_pubdates.push({
          id: key,
          pubDate: json.rss.channel.item[0].pubDate
        })

        // Store episodes in last 2 weeks
        const podcast_title = json.rss.channel.title
        const episodes = json.rss.channel.item.filter(function(element, index, array) {
          const twoweeksago = moment().subtract(14, 'days').startOf('date')
          return moment(element.pubDate).isAfter(twoweeksago)
        })
        // Add channel info into each episodes
        episodes.forEach(function(el) {
          el['podcast_title'] = podcast_title
        })
        episodes_in_2weeks = episodes_in_2weeks.concat(episodes)

        total--

        // Export to list file ordered by pubDate
        if(total <= 0) {
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
            updated: new Date(),
          }
          fs.writeFileSync(BUILD_INFO, JSON.stringify(data), 'utf8');
        }
      })
    })
  })
  download.on('error', (__err)=> {
    console.err(__err)
  })
})
