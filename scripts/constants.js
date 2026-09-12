export const DOWNLOADS_DIR = 'static/downloads'
export const RSS_DIR = 'static/downloads/rss'
export const COVER_DIR = 'static/downloads/cover'
export const BUILD_INFO = 'static/downloads/build_info.json'
// 番組ごとの全エピソード。build_info.json の9割を占めていたうえ、
// 一覧で行を開いたときにしか使わないため、番組ごとの別ファイルにしている。
// 開いた番組のぶんだけ読み込む
export const EPISODES_DIR = 'static/downloads/episodes'
// 日ごとに何話出たかだけを集めたもの。/episodes の heatmap が読む。
// 17年ぶんで65KBあり、一覧の初期表示には要らないので build_info.json とは分ける
export const DAILY_COUNTS = 'static/downloads/daily-counts.json'
// 月ごとのエピソード。/episodes を過去へ遡るときに、見えている月のぶんだけ読む。
// 番組ごとの episodes/ とは切り口が違う（あちらは一覧で行を開いたとき）
export const MONTHS_DIR = 'static/downloads/months'
export const RSS_JSON = 'data/rss.json'
export const RSS_INACTIVE_JSON = 'data/rss-inactive.json'
export const ADDED_AT_JSON = 'data/added-at.json'
export const APPLE_PODCASTS_JSON = 'data/apple-podcasts.json'
// 登録済みかどうかを判定するためだけの軽い一覧。/add が読む。
// build_info.json にも同じ情報は入っているが、あちらは一覧の初期表示に
// 載るサイズなので、判定のために読ませるには重すぎる（issue #229）。
// static/downloads の下ではなく static/ 直下に置く。あそこは
// fetch-feeds が丸ごと作り直す場所で、退避と復元の対象でもある
export const REGISTERED_JSON = 'static/registered.json'
