"use strict";

// 一覧の並べ替えで使う比べ方。vue-tables-2 の既定と同じ挙動にしてある。
//
//   - 空や null は '' として扱う（Duration や Frequency の N/A がこれ）
//   - 文字列は小文字に揃えてから比べる
//   - 同じ値でも 0 を返さず、必ずどちらかに倒す
//
// 最後のひとつは Array#sort の作法から外れているが、直すと同じ値の行
// （同じ日付、同じ話数）の並びが変わってしまう。表の見え方を変えないことを
// 優先して、ライブラリから持ってきたまま使っている。
export const compareBy = (key, ascending) => (a, b) => {
  let x = a[key] || ''
  let y = b[key] || ''
  const dir = ascending ? 1 : -1
  if(typeof x === 'string') x = x.toLowerCase()
  if(typeof y === 'string') y = y.toLowerCase()
  return x > y ? dir : -dir
}

// 更新間隔だけは別扱い。算出できない番組（N/A）は昇順・降順どちらでも
// 末尾にまとめる。素直に比べると null が数値の間に紛れ、N/A が飛び飛びに現れる
export const compareInterval = (ascending) => (a, b) => {
  if(a.updateInterval == null && b.updateInterval == null) return 0
  if(a.updateInterval == null) return 1
  if(b.updateInterval == null) return -1
  return ascending
    ? a.updateInterval - b.updateInterval
    : b.updateInterval - a.updateInterval
}
