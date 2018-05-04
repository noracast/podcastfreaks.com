const rss = require('../data/rss.json')
const conf = require('../data/config.json')
const shell = require('shelljs')
const wget = require('wget-improved')
const fs = require('fs')
const xml2js = require('xml2js')

// Make sure parent dir existence and its clean
shell.rm('-rf', conf.rss_dir)
shell.mkdir('-p', conf.rss_dir)

var total = Object.keys(rss).length
var latest_pubdates = []

Object.keys(rss).forEach(function (key) {
  let src = rss[key]
  let dist = `${conf.rss_dir}/${key}.rss`
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
        total--

        // Export to list file ordered by pubDate
        if(total <= 0) {
          latest_pubdates.sort(function(a, b) {
            return new Date(b.pubDate) - new Date(a.pubDate)
          })
          var load_order = latest_pubdates.map(function(element, index, array) {
            return element.id;
          });
          fs.writeFileSync(conf.rss_data_json, JSON.stringify({ load_order }), 'utf8');
        }
      })
    })
  })
  download.on('error', (__err)=> {
    console.err(__err)
  })
})
