"use strict";

import _ from 'lodash'
import moment from 'moment'
import url from 'url'

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
    else if(/^\d+$/.test(_d)) {
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
        var val = self.getDuration(ep['itunes:duration'][0], _dist_rss)
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
    return durations[Math.ceil(durations.length/2)]
  }
}

module.exports = Util
