// 投稿間隔（日）を「毎週」「隔週」のような言葉に丸める。
//
// 一覧の表示（components/frequency.vue）と、検索対象の文字列
// （pages/index.vue）の両方で使うため、ここに置いて共有する。
// 「◯日おき」と出しても読み取りづらいので、感覚に近い言葉にする
const LABELS = [
  { under: 2, label: '毎日' },
  { under: 5, label: '週2〜3' },
  { under: 10, label: '毎週' },
  { under: 18, label: '隔週' },
  { under: 45, label: '月1' },
  { under: 120, label: '数ヶ月' },
  { under: Infinity, label: '年数回' }
]

export default function frequencyLabel(interval) {
  if(interval == null) return null
  return LABELS.find(l => interval < l.under).label
}
