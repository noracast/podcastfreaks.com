"use strict";

// 収録時間（RSS の itunes:duration の中央値。'HH:mm:ss'）を、
// バッジに出すおおまかな分数と、補足のツールチップに直す。
//
// 一覧のバッジ（components/duration.vue）から使う。ここに出してあるのは、
// 段の境目をテストで固めておきたいため。

import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

dayjs.extend(customParseFormat)

const parse = (value) => {
  if(!value) return null
  const d = dayjs(String(value), 'HH:mm:ss')
  return d.isValid() ? d : null
}

// 収録時間をおおまかな分数に丸める。'120+' は2時間以上。
//
// 段の区切りは About の凡例（pages/about.vue）と同じ。以前は分だけを見て
// いたため、00:15:08 のように秒を持つものが1つ下の段に入っていた
// （凡例では「15分を超えて30分まで」だが「15分」と出ていた）
export function roughlyMinutes(value) {
  const d = parse(value)
  if(!d) return null
  const seconds = d.hour() * 3600 + d.minute() * 60 + d.second()

  if(seconds >= 120 * 60) return '120+'  // 2時間以上
  if(seconds >= 90 * 60) return '120'    // 1時間30分から1時間59分まで
  if(seconds >= 60 * 60) return '90'     // 1時間から1時間29分まで
  if(seconds > 45 * 60) return '60'      // 45分を超えて1時間未満
  if(seconds > 30 * 60) return '45'      // 30分を超えて45分まで
  if(seconds > 15 * 60) return '30'      // 15分を超えて30分まで
  return '15'                            // 〜15分00秒
}

// バッジの色分けに使うクラス名
export function durationClass(value) {
  const minutes = roughlyMinutes(value)
  return minutes ? `min${minutes.replace('+', 'plus')}` : null
}

// 「120+分」ではなく「120分+」と出したいので、数値と単位を分けて返す
export function minutesOf(value) {
  const minutes = roughlyMinutes(value)
  return minutes ? minutes.replace('+', '') : minutes
}

// 2時間以上かどうか。「120分+」の + を出すかの判定に使う
export function isOver(value) {
  const minutes = roughlyMinutes(value)
  return !!minutes && minutes.includes('+')
}

// バッジは段階に丸めた値なので、元の中央値をツールチップで補う。
// Frequency の「直近の更新間隔の中央値: ◯日」と対にしている
export function durationTooltip(value) {
  const d = parse(value)
  if(!d) return null
  const hour = d.hour()
  const minute = d.minute()
  const second = d.second()

  // 1時間を超える番組で秒まで出しても仕方がないので、そこでは落とす。
  // 逆に1分に満たない番組が実際にあり（フィードの値がおかしいものを含む）、
  // 分だけで出すと「0分」になってしまうため、短いものは秒まで出す
  let length
  if(hour) length = minute ? `${hour}時間${minute}分` : `${hour}時間`
  else if(minute) length = second ? `${minute}分${second}秒` : `${minute}分`
  else length = `${second}秒`
  return `収録時間の中央値: ${length}`
}
