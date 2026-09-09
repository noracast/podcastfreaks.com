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

import moment from 'moment'

export const JST_OFFSET = 9 * 60

// 時刻付きの値（ISO 文字列や Date）を日本時間として扱う
export const jst = (value) => moment(value).utcOffset(JST_OFFSET)

// 'YYYY.MM.DD' のような時刻を持たない表記を、日本時間のその日として扱う。
// keepLocalTime を立てて、表記どおりの日付のままタイムゾーンだけを移す
export const jstDate = (value, format) => moment(value, format).utcOffset(JST_OFFSET, true)
