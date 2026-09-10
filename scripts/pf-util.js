"use strict";

import _ from 'lodash'
import consola from 'consola'
import moment from 'moment'
import path from 'path'
import sharp from 'sharp'
import wgetp from './wget-with-timeout'
import parsePubDate from './parse-pub-date'

const asArray = (value) => value == null ? [] : (Array.isArray(value) ? value : [value])

// エピソードが持つ音声ファイルのURL。
// 1つのエピソードに複数の enclosure を並べるフィードがあり
// （weekly-ebook-strategy は1話に5〜6個）、その場合 xml2js は配列を返す。
// enclosure.$.url だけを見ると、そうしたフィードを丸ごと取りこぼす
const enclosureUrls = (episode) =>
  asArray(episode && episode.enclosure)
    .map(enclosure => _.get(enclosure, '$.url'))
    .filter(url => !!url)

// 更新頻度を求めるときに見る直近の「更新した日」の数。
// 少なすぎると1回の休みで大きく振れ、多すぎると昔の頻度に引きずられる
const SAMPLE_SIZE_FOR_INTERVAL = 12

// Netlify のビルドは UTC で走るため、実行環境のタイムゾーンで日を切ると
// 結果が変わってしまう。日本時間の日付に固定する（CLAUDE.md）。
// 1970-01-01 からの通し日数を返す
const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const toJstDayNumber = (ms) => Math.floor((ms + JST_OFFSET_MS) / DAY_MS)

class Util {

  constructor() {
    // 見つけた問題の受け取り先。prebuild が build_info.json に残して
    // /errors から見えるようにするために差し替える。
    // 単体で使うときのために、既定ではログに出すだけにしておく
    this.onWarn = (label, rss, message) => consola.warn(`${label} | ${rss} | ${message}`)
    return this
  }

  warn(label, rss, message) {
    this.onWarn(label, rss, message)
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

  // 音声ファイルの配信元ホスト名を返す。
  // 以前は単一のエピソードを受け取る想定だったが、呼び出し側は配列を渡しており
  // _.has(配列, 'enclosure.$.url') が常に false になるため必ず null を返していた。
  //
  // 途中で配信サービスを移行している番組があるので、最頻のホストを採用する
  getFileServer(_items) {
    const counts = {}
    asArray(_items).forEach(ep => {
      enclosureUrls(ep).forEach(src => {
        try {
          const host = new URL(src).hostname
          counts[host] = (counts[host] || 0) + 1
        } catch (e) {
          // URL として解釈できないものは無視する
        }
      })
    })

    const hosts = Object.keys(counts)
    if(hosts.length === 0) return null
    return hosts.reduce((a, b) => counts[b] > counts[a] ? b : a)
  }

  // エピソードの音声ファイルのURL。複数ある場合は先頭を使う。
  //
  // 加工せずそのまま返す。Podtrac などの計測用プレフィックスやクエリを
  // 落とすと配信者側で再生が数えられなくなるため、カバー画像に掛けている
  // removeQuery はここでは使わない
  audioUrl(_episode) {
    return enclosureUrls(_episode)[0] || null
  }

  // 音声（enclosure）を持つエピソードの数。
  //
  // フィードとして解析できてエピソードもあるのに、音声を1つも持たない
  // ものがある。記事用のフィードを登録してしまっている場合と、
  // ドメインが第三者に取得されて別サイトのフィードに変わっている場合がある
  // （kumocast はアダルトサイトのフィードに変わっていた）。
  //
  // Ref: https://github.com/noracast/podcastfreaks.com/issues/48
  countEpisodesWithAudio(_items) {
    return asArray(_items).filter(ep => enclosureUrls(ep).length > 0).length
  }

  // 解析できたら 'HH:mm:ss' の文字列、できなければ理由を表す文字列
  // （'wrong-format' / 'zero'）を返す。番組ごとにまとめて警告するため、
  // ここではログを出さない
  getDuration(_d, _outFormat = 'HH:mm:ss') {
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
      return 'wrong-format'
    }

    // フォーマットは正しいが0のものがあるため間引く
    if(output.format(_outFormat) == '00:00:00') return 'zero'

    return output.format(_outFormat)
  }

  getDurations(_items, _dist_rss) {
    const durations = []
    const skipped = { 'zero': [], 'wrong-format': [] }

    _items.forEach(ep => {
      if(!ep || ep['itunes:duration'] == null || ep['itunes:duration'] == '') return
      const raw = ep['itunes:duration']
      const val = this.getDuration(raw)
      if(skipped[val]) skipped[val].push(raw)
      else durations.push(val)
    })

    // エピソードごとに出すとログが埋まるので、番組ごとに1行にまとめる
    const reasons = []
    if(skipped['zero'].length) reasons.push(`収録時間が0: ${skipped['zero'].length}話`)
    if(skipped['wrong-format'].length) {
      const samples = [...new Set(skipped['wrong-format'])].slice(0, 3).map(v => `\`${v}\``).join(', ')
      reasons.push(`形式が不正: ${skipped['wrong-format'].length}話 (${samples})`)
    }
    if(reasons.length) this.warn('durationCheck', _dist_rss, `収録時間を読み取れないエピソードがあります（${reasons.join(' / ')}）`)

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
    // sort は破壊的なので、渡された配列には触れない。
    // 値は HH:mm:ss にゼロ埋めされているため辞書順の比較でよい
    const durations = [..._durations].sort()

    const half = Math.floor(durations.length/2)
    if(durations.length % 2) return durations[half]

    // 偶数個のときは中央2つの平均をとる
    const ms = (moment.duration(durations[half-1]).asMilliseconds() + moment.duration(durations[half]).asMilliseconds()) / 2
    return moment.utc(ms).format('HH:mm:ss')
  }

  // 更新頻度。直近の「更新した日」の間隔の中央値を日数で返す。
  //
  // - 平均ではなく中央値にするのは、長期の休止や、開始時にまとめて投稿された
  //   エピソードがあると平均が大きく歪むため
  // - 全期間ではなく直近だけを見るのは、「昔どうだったか」ではなく
  //   「今どのくらいの間隔で出ているか」を知りたいため
  // - エピソードではなく日を数えるのは、同じ日にまとめて投稿された番組が
  //   間隔0日、つまり「毎日」と判定されてしまうため。配信元を移行したときの
  //   一括投稿や、収録済みの回をまとめて公開した場合に起きる
  //   （例: abefm は全5話が同じ時刻、meetsfm は4話が7分の間に並ぶ）
  getUpdateInterval(_items, _sampleSize = SAMPLE_SIZE_FOR_INTERVAL) {
    const times = _(asArray(_items))
      .map(ep => ep && parsePubDate(ep.pubDate))
      .filter(date => date && date.isValid())
      .map(date => date.valueOf())
      // フィードの並び順は基本的に新しい順だが、保証はされていないので揃える
      .sort((a, b) => b - a)
      // 同じ日に投稿された話は1回の更新として数える。
      // 日でまとめたあとの間隔は実際の時刻から測る。日数に丸めてしまうと
      // 9.7日の番組が10日になって「毎週」から「隔週」へ移るなど、
      // 境界に乗った番組の表示が変わってしまう
      .uniqBy(toJstDayNumber)
      .take(_sampleSize)
      .value()

    if(times.length < 2) return null

    const intervals = []
    for(let i = 0; i < times.length - 1; i++) {
      intervals.push(moment.duration(times[i] - times[i+1]).asDays())
    }
    intervals.sort((a, b) => a - b)

    const half = Math.floor(intervals.length/2)
    const median = intervals.length % 2
      ? intervals[half]
      : (intervals[half-1] + intervals[half]) / 2

    // 0.1日（約2.4時間）より細かい差は表示にも判定にも使わない
    return Math.round(median * 10) / 10
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
      // メッセージ自体に改行を含むエラーがあるため1行にまとめる
      this.warn('coverImage', _key, `カバー画像を取得できませんでした（${String(err.message || err).replace(/\s+/g, ' ').trim()}）`)
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
