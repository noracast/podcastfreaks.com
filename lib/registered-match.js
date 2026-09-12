// すでに登録されている番組かどうかを見る。
//
// 突き合わせる相手は static/registered.json（fetch-feeds が data/rss.json から
// 作る。#229）。フィード URL と番組名の両方で見て、どちらかが当たれば
// 「登録済みの可能性」として出す。
//
// **フィード URL の完全一致だけでは取りこぼす。** 同じ番組でも、こちらが
// FeedBurner 経由で登録していて Apple 側は配信元の直リンク、ということが
// よくある（234件中62件で data/apple-podcasts.json が自動で埋まらないのは
// これが理由）。例: fukabori.fm は登録が fukabori.fm/feed.xml、
// Apple 側は rss.art19.com/fukabori。
//
// 逆に番組名だけで見ると、ありふれた名前で誤って当ててしまう。両方を見て、
// **どちらで当たったかを添えて返す**（見る人が判断できるように）。

// http / https と www. の違い、末尾の / の有無は同じものとして扱う。
// クエリは落とさない。フィードはクエリで番組を分ける形（?show=2）があり、
// 落とすと別の番組が同じものに見える
export function normalizeFeed(url) {
  const value = String(url || '').trim()
  if(!value) return ''
  return value
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

// 全角と半角、大文字小文字、空白の有無を無視する。
// 「ゆるコンピュータ科学ラジオ」と「ゆる　コンピュータ科学ラジオ」のような
// 揺れを同じものとして見るため
export function normalizeTitle(title) {
  return String(title || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase()
}

// 多くの番組が乗っている配信基盤。ホストが同じでも別の番組なので、
// 下の matchByHost では見ない。
//
// 登録中の2番組以上が同じホストを使っていればデータから気づけるが、
// まだ1番組しか登録が無い基盤（rss.art19.com など）は気づけないので、
// 知っているものをここに置く
const PLATFORM_FEED_HOSTS = [
  'anchor.fm',
  'creators.spotify.com',
  'podcasters.spotify.com',
  'feeds.soundcloud.com',
  'feeds.feedburner.com',
  'feedburner.com',
  'feedpress.me',
  'radiotalk.jp',
  'feed.podbean.com',
  'rss.art19.com',
  'feeds.acast.com',
  'omnycontent.com',
  'traffic.libsyn.com',
  'feeds.simplecast.com',
  'feeds.buzzsprout.com',
  'feeds.megaphone.fm',
  'rss.com',
  'media.rss.com',
  'listen.style',
  'stand.fm',
  'note.com'
]

export function feedHost(url) {
  try {
    return new URL(String(url)).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

// 番組サイトの URL から、そこで配信している番組を探す。
//
// 番組サイトを入れられたとき（radio.voiceofonebutton.net）、フィードの URL
// （radio.voiceofonebutton.net/index20.rdf）とは一致しないが、**同じホストで
// 配信しているなら同じ番組**であることが多い。iTunes には URL で引く方法が
// 無いので、ここが最後の頼りになる。
//
// ただし当てにいきすぎない。同じホストに2番組以上が乗っていれば、そこは
// 配信基盤なので誰のものとも言えない。1番組のときだけ返す
export function matchByHost(registered, url) {
  const host = feedHost(url)
  if(!host || PLATFORM_FEED_HOSTS.includes(host)) return []

  const matched = []
  for(const [key, entry] of Object.entries(registered || {})) {
    if(entry && feedHost(entry.feed) === host) matched.push({ key, ...entry, matchedBy: 'host' })
  }
  return matched.length === 1 ? matched : []
}

// 登録済みの番組を、名前で探す。
//
// iTunes の検索に出てこない番組は珍しくない（Apple に載っていない、Apple 側の
// 名前が違う）。そういう番組でも「**もう載っている**」ことだけは、こちらの
// 一覧から答えられる。iTunes の結果に注釈を付けるだけでは、nora と入れた人に
// noracast を出せない。
//
// 番組名は**部分一致**（ラジオ → アジャイルラジオ）、キーは**前方一致**で見る
// （nora → noracast）。キーまで部分一致にすると、shinamonoradio のような
// 無関係なキーが nora で当たる。1文字だと当たりすぎるので2文字から。
//
// 当たったものは**全部返す**（cast は31件当たる）。並べるのは小さなジャケット
// だけなので、多くても読める。代わりに確からしい順に並べる。
// 順は「名前がそのもの」→「名前かキーがその語で始まる」→「含む」、
// 同じなら名前が短いほう（語の占める割合が大きい＝目当てである見込みが高い）
function searchScore(title, key, needle) {
  if(title === needle) return 0
  if(title.startsWith(needle) || key.startsWith(needle)) return 1
  return 2
}

export function searchRegistered(registered, term, limit = Infinity) {
  const needle = normalizeTitle(term)
  if(needle.length < 2) return []

  const matched = []
  for(const [key, entry] of Object.entries(registered || {})) {
    if(!entry) continue
    // 番組名はフィードが落ちていると入っていない。キーはいつでもある
    const title = normalizeTitle(entry.title)
    const normalizedKey = normalizeTitle(key)
    if(!(title && title.includes(needle)) && !normalizedKey.startsWith(needle)) continue
    matched.push({
      entry: { key, ...entry, matchedBy: 'search' },
      score: searchScore(title, normalizedKey, needle),
      length: (title || normalizedKey).length
    })
  }

  return matched
    .sort((a, b) => a.score - b.score || a.length - b.length)
    .slice(0, limit)
    .map(found => found.entry)
}

// registered … { key: { feed, title } }
// candidate … iTunes から得た { feed, title }
//
// 返り値は当たった番組の配列。matchedBy は 'feed' か 'title'
export default function matchRegistered(registered, candidate = {}) {
  if(!registered) return []

  const feed = normalizeFeed(candidate.feed)
  const title = normalizeTitle(candidate.title)
  if(!feed && !title) return []

  const matched = []
  for(const [key, entry] of Object.entries(registered)) {
    if(!entry) continue
    if(feed && normalizeFeed(entry.feed) === feed) {
      matched.push({ key, ...entry, matchedBy: 'feed' })
      continue
    }
    // 番組名は取得できた番組にしか入っていない（フィードが落ちていると null）
    if(title && entry.title && normalizeTitle(entry.title) === title) {
      matched.push({ key, ...entry, matchedBy: 'title' })
    }
  }
  return matched
}
