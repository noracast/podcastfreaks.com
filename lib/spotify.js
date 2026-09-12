// Spotify のページから番組を辿るための手がかり。
//
// **番組名は URL からもページからも取れない。** open.spotify.com は JS で
// 描くので HTML に番組名が入っておらず、どこも CORS を許していないので
// ブラウザからは読めない。
//
// 唯一ブラウザから読めるのが oEmbed（`Access-Control-Allow-Origin: *` を
// 返す。実測）。ただし**返ってくる title は番組名ではなく、その番組の
// 最新エピソード名**。番組の URL を渡しても同じで、これは仕様。
//
//     https://open.spotify.com/show/5shHRr8lQqdbvcY3ZrXnG0
//     → title: "#60 コードを書かないのにプログラマなのか, 何を価値として…"
//
// そこで、そのエピソード名で iTunes の**エピソード検索**を引き、
// ヒットしたエピソードが属する番組へ辿る（lib/itunes.js の
// episodeSearchUrl）。ムーザルのプログラミング絶望ラジオはこの経路で
// 見つかる。
//
// なお `anchor.fm/s/<hex>` の hex は Spotify の show ID とは別物なので、
// show ID からフィード URL を機械的に導くことはできない。

const OEMBED = 'https://open.spotify.com/oembed'

// 番組（show）でもエピソード（episode）でも、oEmbed は同じように答える
export function isSpotifyUrl(url) {
  try {
    const host = new URL(String(url)).hostname.toLowerCase()
    return host === 'open.spotify.com' || host.endsWith('.spotify.com')
  } catch {
    return false
  }
}

export default function oembedUrl(url) {
  if(!isSpotifyUrl(url)) return null
  return `${OEMBED}?url=${encodeURIComponent(url)}`
}
