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
