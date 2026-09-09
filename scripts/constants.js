export const DOWNLOADS_DIR = 'static/downloads'
export const RSS_DIR = 'static/downloads/rss'
export const COVER_DIR = 'static/downloads/cover'
export const BUILD_INFO = 'static/downloads/build_info.json'
// 番組ごとの全エピソード。build_info.json の9割を占めていたうえ、
// 一覧で行を開いたときにしか使わないため、番組ごとの別ファイルにしている。
// 開いた番組のぶんだけ読み込む
export const EPISODES_DIR = 'static/downloads/episodes'
export const RSS_JSON = 'data/rss.json'
export const RSS_INACTIVE_JSON = 'data/rss-inactive.json'
export const ADDED_AT_JSON = 'data/added-at.json'
export const APPLE_PODCASTS_JSON = 'data/apple-podcasts.json'
