// iTunes の検索 API。/request が番組のフィードを突き止めるのに使う。
//
// ブラウザから直接呼べる（`Access-Control-Allow-Origin: *` を返す。実測)。
// **JSONP は要らない。** ここが CORS を通るおかげで、/request はサーバー側の
// 部品を持たずに済んでいる（issue #228）。
//
// Apple に載っている番組なら、これが一番速くて確実。返るものは次のとおりで、
// 訪問者に見せるにはこれで足りる。
//
//     collectionName    fukabori.fm
//     feedUrl           https://rss.art19.com/fukabori
//     trackCount        141
//     releaseDate       2026-07-31T08:30:00Z
//     genres            ["テクノロジー","ポッドキャスト"]
//     artworkUrl600     https://is1-ssl.mzstatic.com/.../600x600bb.jpg
//     collectionViewUrl https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609
//
// 副次的な効き目として、ここで得たフィード URL をそのまま登録すると
// Apple Podcasts のリンクが自動で付く（data/apple-podcasts.json は Apple 側の
// feedUrl と突き合わせて埋まるため）。

const ENDPOINT = 'https://itunes.apple.com'

// 日本の番組のまとめサイトなので、日本のストアで引く
const COUNTRY = 'JP'

// Apple のリンクから引くとき。番組が1件だけ返る。
// 複数の id をまとめて渡すこともできる（エピソード検索から番組を引くとき）
export function lookupUrl(id) {
  const ids = (Array.isArray(id) ? id : [id]).join(',')
  return `${ENDPOINT}/lookup?id=${encodeURIComponent(ids)}&country=${COUNTRY}&entity=podcast`
}

// 番組名から引くとき。候補を見せて選んでもらうので、少し多めに取る。
// 結果は「未登録」「登録済み」に分けて1行ずつ並べる（pages/request.vue）ので、
// 10件あっても読める。短い語（nora）で目当てが漏れるほうが困る
export function searchUrl(term, limit = 10) {
  return `${ENDPOINT}/search?media=podcast&entity=podcast&country=${COUNTRY}` +
    `&limit=${limit}&term=${encodeURIComponent(term)}`
}

// エピソードの名前から引くとき。
//
// Spotify は番組名を渡してくれず、oEmbed から取れるのは最新エピソード名
// だけ（lib/spotify.js）。エピソードを引けば、それが属する番組が分かる。
// 番組名での検索が空振りしたときの最後の手段でもある
export function episodeSearchUrl(term, limit = 5) {
  return `${ENDPOINT}/search?media=podcast&entity=podcastEpisode&country=${COUNTRY}` +
    `&limit=${limit}&term=${encodeURIComponent(term)}`
}

// エピソードの検索結果から、それが属する番組の id を拾う。
// 同じ番組の回が並ぶことがあるので重複を落とす。
// ここで得た id を lookupUrl に渡すと、話数やジャンルまで揃った番組が返る
// （エピソードの結果は releaseDate がその回の日付で、番組のものとは違う）
export function collectionIds(response) {
  const results = (response && response.results) || []
  return [...new Set(results.map(r => r.collectionId).filter(Boolean))]
}

// 使うものだけ取り出す。API は項目が多く、そのまま持ち回ると
// どれを見ているのか分からなくなる
export function toChannel(result) {
  if(!result || !result.feedUrl) return null
  return {
    title: result.collectionName || result.trackName || '',
    feed: result.feedUrl,
    // ?uo=4 は Apple 側の計測用。リンクとして出すには要らない
    apple: (result.collectionViewUrl || '').replace(/[?&]uo=\d+$/, ''),
    artwork: result.artworkUrl600 || result.artworkUrl100 || null,
    trackCount: result.trackCount || null,
    releaseDate: result.releaseDate || null,
    genres: Array.isArray(result.genres) ? result.genres : [],
    artist: result.artistName || ''
  }
}

// 音声を持たない記事用フィードを掴む事故（#48）は、全部「Apple を
// 経由しなかった」ケースだった。Apple はポッドキャストとして載せる条件に
// <enclosure> を求めるので、ここを通った feedUrl なら掴みようがない。
// フィード本体の検証は、送ったあとに Actions（#231）が行う
export default function toChannels(response) {
  const results = (response && response.results) || []
  return results.map(toChannel).filter(Boolean)
}
