"use strict";

// RSS の pubDate / Atom の published を解析して Date を返す。読めないときは null。
//
// 以前は moment で 'ddd, DD MMM YYYY HH:mm:ss ZZ' を当てていたが、2つ問題があった。
//
// 1. ZZ は "GMT" のような名前表記のタイムゾーンを解析できず、そのまま無視されて
//    ローカル時刻として扱われるため、日付が最大1日ずれる
// 2. ddd を含む書式だと moment が曜日と日付の整合性を検証するため、曜日が
//    間違っているフィードは丸ごと Invalid date になる
//
// その後 moment.RFC_2822 に替えていたが、Node の Date がこれをそのまま扱える。
// 配信中のフィードから pubDate を23,154通り集めて moment と突き合わせ、全件で
// 同じ時刻になることを確かめたうえで素の Date にした（GMT / EST / PDT のような
// 名前表記、曜日の食い違い、Z ひとつだけ、ISO 8601 を含む）。
export default function parsePubDate(value) {
  const date = new Date(String(value ?? '').trim())
  return isNaN(date.getTime()) ? null : date
}
