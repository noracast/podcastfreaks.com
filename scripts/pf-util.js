"use strict";

import _ from 'lodash'
import consola from 'consola'
import moment from 'moment'
import path from 'path'
import sharp from 'sharp'
import url from 'url'
import wgetp from './wget-with-timeout'
import parsePubDate from './parse-pub-date'

class Util {

  constructor() {
    return this
  }

  // クエリとフラグメントを除いた絶対URLを返す。
  // 例) https://example.com/cover.jpg?fit=3000%2C3000 -> https://example.com/cover.jpg
  // itunes:image の href が相対パスのフィードがあるため（例: ariel の
  // "/wp/wp-content/uploads/powerpress/arieltan.jpg"）、_base で解決する
  removeQuery(_uri, _base) {
    if(!_uri) return _uri
    try {
      const u = new URL(_uri, _base)
      u.search = ''
      u.hash = ''
      return u.toString()
    } catch (e) {
      consola.error('removeQuery', _uri, e.message)
      return null
    }
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
      consola.warn(`[wrong format] \`${_d}\` | ${_dist_rss}`)
      return null
    }

    // フォーマットは正しいが0のものがあるため間引く
    if(output.format(_outFormat) == '00:00:00'){
      consola.warn(`[zero time] \`${_d}\` | ${_dist_rss}`)
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

  // 平均値。getDurations の結果を受け取る
  getDurationAverage(_durations) {
    if(_durations.length == 0) return null
    const totalDurations = _durations.slice(1).reduce((prev, cur) => moment.duration(cur).add(prev), moment.duration(_durations[0]))
    return moment.utc(totalDurations.asMilliseconds()/_durations.length).format('HH:mm:ss')
  }

  // 中央値。getDurations の結果を受け取る
  getDurationMedian(_durations) {
    if(_durations.length == 0) return null
    // sort は破壊的なので、渡された配列には触れない
    const durations = [..._durations].sort()
    return durations[Math.ceil(durations.length/2)]
  }

  // 画像のダウンロードとリサイズ
  // 成功したら true、ダウンロードまたはリサイズに失敗したら false を返す。
  // 呼び出し側はこれを見て、存在しない画像への参照を外す
  async downloadAndResize(_key, _src, _dist) {
    try {
      await wgetp(_src, {output: _dist})
      const ext = path.extname(_dist)
      const ext_120 = _dist.replace(ext, ext.replace('.', '-120.'))
      const ext_60 = _dist.replace(ext, ext.replace('.', '-60.'))
      await sharp(_dist).resize(120).toFile(ext_120)
      await sharp(_dist).resize(60).toFile(ext_60)
      return true
    } catch(err) {
      consola.log(_key, err)
      return false
    }
  }

  getEpisodesIn2Weeks(episodes, key, title) {
    const twoweeksago = moment().subtract(14, 'days').startOf('date')
    // Add channel info into each episodes
    let res = episodes.filter((element, index, array) => {
      // RSS date format is RFC-822
      return parsePubDate(element.pubDate).isAfter(twoweeksago)
    })
    res.forEach( el => {
      el['key'] = key
      el['channel_title'] = title
    })
    return res
  }
}

module.exports = Util
