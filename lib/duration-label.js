"use strict";

// 収録時間（RSS の itunes:duration の中央値。'HH:mm:ss'）を、
// バッジに出すおおまかな分数と、補足のツールチップに直す。
//
// 一覧のバッジ（components/duration.vue）から使う。ここに出してあるのは、
// 段の境目をテストで固めておきたいため。

import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const parse = (value) => {
  if(!value) return null
  const d = dayjs(String(value), 'HH:mm:ss')
  return d.isValid() ? d : null
}

// 収録時間をおおまかな分数に丸める。'120+' は2時間以上
export function roughlyMinutes(value) {
  const d = parse(value)
  if(!d) return null
  const hour = d.hour()
  const minute = d.minute()

  if(2 <= hour) return '120+'
  if(1 <= hour) return 30 <= minute ? '120' : '90'
  if(45 < minute) return '60'
  if(30 < minute) return '45'
  if(15 < minute) return '30'
  return '15'
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
