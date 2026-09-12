// iTunes の検索 API。/add が番組のフィードを突き止めるのに使う。
//
// ブラウザから直接呼べる（`Access-Control-Allow-Origin: *` を返す。実測)。
// **JSONP は要らない。** ここが CORS を通るおかげで、/add はサーバー側の
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

// Apple のリンクから引くとき。番組が1件だけ返る
export function lookupUrl(id) {
  return `${ENDPOINT}/lookup?id=${encodeURIComponent(id)}&country=${COUNTRY}&entity=podcast`
}

// 番組名から引くとき。候補を見せて選んでもらうので、少し多めに取る
export function searchUrl(term, limit = 5) {
  return `${ENDPOINT}/search?media=podcast&entity=podcast&country=${COUNTRY}` +
    `&limit=${limit}&term=${encodeURIComponent(term)}`
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
