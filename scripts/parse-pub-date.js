"use strict";

import moment from 'moment'

// RSS の pubDate を解析する。
//
// 以前は 'ddd, DD MMM YYYY HH:mm:ss ZZ' で解析していたが、2つ問題があった。
//
// 1. ZZ は "GMT" のような名前表記のタイムゾーンを解析できず、そのまま無視されて
//    ローカル時刻として扱われるため、日付が最大1日ずれる。
//    全222フィード中117件が GMT 表記だった。
// 2. ddd を含む書式だと moment が曜日と日付の整合性を検証するため、曜日が
//    間違っているフィードは丸ごと Invalid date になる。
//    （例: kakakikikeke の "Tue, 30 Oct 2024" は実際には水曜日）
//
// moment.RFC_2822 はタイムゾーン名を正しく扱えるのでまずこれで解析し、
// 次に Atom の RFC3339（ISO 8601）を試し、
// 最後に曜日の矛盾で失敗したものを曜日を落として解析し直す。
// RFC2822 では曜日は省略可能なため、落としても解析できる。
export default function parsePubDate(value) {
  const parsed = moment(value, moment.RFC_2822)
  if (parsed.isValid()) return parsed

  // Atom の日付は RFC3339（ISO 8601）
  const iso = moment(value, moment.ISO_8601, true)
  if (iso.isValid()) return iso

  return moment(String(value).replace(/^\s*[A-Za-z]{3},\s*/, ''), moment.RFC_2822)
}
