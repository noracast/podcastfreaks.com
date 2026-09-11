"use strict";

// 秒やミリ秒を 'HH:mm:ss' に、日時を 'YYYY-MM-DDTHH:mm:ss' に直す。
// scripts/ 側でしか使わないが、素の関数なので lib/ に置いてテストする。

const pad = (n) => String(Math.floor(n)).padStart(2, '0')

// 'HH:mm:ss' を秒数にする。読めなければ null
export function toSeconds(hhmmss) {
  const m = String(hhmmss ?? '').match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if(!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

// 秒数を 'HH:mm:ss' にする。24時間を超えても繰り上がりで表す
export function toHHMMSS(seconds) {
  const total = Math.floor(Number(seconds))
  if(!Number.isFinite(total) || total < 0) return null
  return `${pad(total / 3600)}:${pad((total % 3600) / 60)}:${pad(total % 60)}`
}

// build_info.json に入れる日時の形。moment の
// HTML5_FMT.DATETIME_LOCAL_SECONDS と同じ 'YYYY-MM-DDTHH:mm:ss'。
// タイムゾーンは Date のローカル（ビルドは UTC で走る）
export function toLocalSeconds(date) {
  if(!date) return null
  const y = date.getFullYear()
  const mo = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  return `${y}-${mo}-${d}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 退避したディレクトリの名前に使う 'YYYYMMDD-HHmmss'
export function toStamp(date = new Date()) {
  const y = date.getFullYear()
  return `${y}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}
