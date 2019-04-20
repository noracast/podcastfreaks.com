"use strict";

import _ from 'lodash'
import moment from 'moment'
import path from 'path'
import sharp from 'sharp'
import url from 'url'
import wgetp from 'node-wget-promise'
import { RFC822 } from './constants'

class Util {

  constructor() {
    return this
  }

  // https://example.com/cover.jpg?fit=3000%2C3000 -> https://example.com/cover.jpg
  removeQuery(_uri) {
    if(_uri){
      const u = url.parse(_uri)
      return `${u.protocol}//${u.host}${u.pathname}`
    }
    return _uri
  }

  getFileServer(_item) {
    var fileServer = null
    if(_.has(_item, 'enclosure.$.url')){
      const u = url.parse(_item.enclosure.$.url)
      return `${u.protocol}//${u.host}`
    }
    return null
  }

  getDuration(_d, _dist_rss, _outFormat = 'HH:mm:ss') {
    var output = null
    // XX:XX:XX (correct format)
    if(/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(_d)) {
      output = moment(_d, 'HH:mm:ss')
    }
    // XX:XX
    else if(/^\d+:\d{1,2}$/.test(_d)) {
      // Treat value like 82:14 -> 01:22:14
      const match = _d.match(/^(\d+):(\d{1,2})$/)
      const second = match[2]
      const minute = match[1]%60
      const hour = Math.floor(match[1]/60)
      output = moment({ hour, minute, second })
    }
    // XXXX
    else if(/^[\d\.]+$/.test(_d)) {
      // Treat value as 'second'
      const second = _d%60
      const minute = Math.floor(_d/60)%60
      const hour = Math.floor(Math.floor(_d/60)/60)
      output = moment({ hour, minute, second })
    }
    else {
      console.warn(`[prebuild warning] \`${_d}\` seems to be wrong format | ${_dist_rss}`)
      return null
    }

    // フォーマットは正しいが0のものがあるため間引く
    if(output.format(_outFormat) == '00:00:00'){
      console.warn(`[prebuild warning] \`${_d}\` means zero time | ${_dist_rss}`)
      return null
    }

    return output.format(_outFormat)
  }

  getDurations(_items, _dist_rss) {
    let durations = []
    let self = this
    _items.forEach(function(ep, index) {
      if(ep && ep['itunes:duration'] != null && ep['itunes:duration'] != ''){
        var val = self.getDuration(ep['itunes:duration'], _dist_rss)
        if(val){
          durations.push(val)
        }
      }
    })
    return durations
  }

  // 平均値
  getDurationAverage(_items, _dist_rss) {
    let durations = this.getDurations(_items, _dist_rss)
    const totalDurations = durations.slice(1).reduce((prev, cur) => moment.duration(cur).add(prev), moment.duration(durations[0]))
    return (durations.length == 0) ? null : moment.utc(totalDurations.asMilliseconds()/durations.length).format('HH:mm:ss')
  }

  // 中央値
  getDurationMedian(_items, _dist_rss) {
    let durations = this.getDurations(_items, _dist_rss).sort()
    return (durations.length == 0) ? null : durations[Math.ceil(durations.length/2)]
  }

  // 画像のダウンロードとリサイズ
  downloadAndResize(_key, _src, _dist) {
    return wgetp(_src, {output: _dist}).then(() => {
      const ext = path.extname(_dist)
      const ext_120 = _dist.replace(ext, ext.replace('.', '-120.'))
      const ext_60 = _dist.replace(ext, ext.replace('.', '-60.'))
      sharp(_dist)
        .resize(120)
        .toFile(ext_120, (err) => {
          if(err){
            console.error('[prebuild error]', _key, err)
          }
        })
        .resize(60)
        .toFile(ext_60, (err) => {
          if(err){
            console.error('[prebuild error]', _key, err)
          }
        })
    })
  }

  getEpisodesIn2Weeks(episodes, key, title) {
    const twoweeksago = moment().subtract(14, 'days').startOf('date')
    // Add channel info into each episodes
    let res = episodes.filter((element, index, array) => {
      // RSS date format is RFC-822
      return moment(element.pubDate, RFC822).isAfter(twoweeksago)
    })
    res.forEach( el => {
      el['key'] = key
      el['channel_title'] = title
    })
    return res
  }
}

module.exports = Util
