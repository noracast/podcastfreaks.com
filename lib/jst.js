"use strict";

// 日付の判定と表示を日本時間に固定する。
//
// 実行時のタイムゾーンに任せると、UTC の Netlify で事前レンダリングした結果と、
// JST の閲覧者のブラウザでの再計算が食い違う。DOM の構造が変わると Vue の
// ハイドレーションが失敗し、/new/ では HierarchyRequestError が出て
// ページ全体が表示されなくなっていた（Responsive が付けた visibility: hidden が
// 外れないため、中身はあるのに真っ白になる）。
//
// 日本の番組のまとめサイトなので、そもそも日本時間で見えるのが正しい。
//
// Ref: https://github.com/noracast/podcastfreaks.com/issues/224
//
// ブラウザへ送るのは dayjs。moment は RSS の pubDate を解析する
// scripts/ 側だけで使っている（RFC2822 のタイムゾーン名を扱えるため）。

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
// 曜日を日本語で出す。副作用だけの import（import 'dayjs/locale/ja'）だと
// 登録された名前を dayjs.locale('ja') が見つけられないことがあるので、
// 中身を受け取って直に渡す
import ja from 'dayjs/locale/ja.js'

dayjs.extend(utc)
dayjs.extend(customParseFormat)
dayjs.locale(ja)

export const JST_OFFSET = 9 * 60

// 時刻付きの値（ISO 文字列や Date）を日本時間として扱う
export const jst = (value) => dayjs(value).utcOffset(JST_OFFSET)

// 'YYYY.MM.DD' のような時刻を持たない表記を、日本時間のその日として扱う。
// keepLocalTime を立てて、表記どおりの日付のままタイムゾーンだけを移す
export const jstDate = (value, format) => dayjs(value, format).utcOffset(JST_OFFSET, true)
