// 日ごとに何話出たかを数える。/episodes の heatmap（components/episode-heatmap.vue）が使う。
//
// 日付は日本時間で切る。サイトの他の場所（lib/jst.js）と同じで、UTC で走る
// Netlify のビルドと閲覧者のブラウザで境目がずれないようにするため。
// ここは scripts 側（fetch-feeds）から呼ぶので、dayjs ではなく素の Date で
// 9時間ずらして UTC の日付を読む。同じ瞬間なら実行環境によらず同じ答えになる。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

// Date（または Date にできる値）を 'YYYY-MM-DD' にする
export function jstDay(value) {
  // new Date(null) は 1970-01-01 になってしまうので、先に弾く
  if(value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if(isNaN(date)) return null
  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

// { 'YYYY-MM-DD': 話数 } を返す。日付を読めない回は数えない
// （23,865話のうち1話だけ pubDate を持たない番組がある）
export default function countByDay(episodes, into = {}) {
  for(const episode of episodes || []) {
    const day = jstDay(episode && episode.pubDate)
    if(!day) continue
    into[day] = (into[day] || 0) + 1
  }
  return into
}
