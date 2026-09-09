// 更新間隔（日）を「毎週」「隔週」のような言葉に丸める。
//
// 一覧の表示（components/frequency.vue）と、検索対象の文字列
// （pages/index.vue）の両方で使うため、ここに置いて共有する。
// 「◯日おき」と出しても読み取りづらいので、感覚に近い言葉にする。
// name は表示側で色分けのクラス名に使う
const LEVELS = [
  { under: 2, label: '毎日', name: 'daily' },
  { under: 5, label: '週2〜3', name: 'semiweekly' },
  { under: 10, label: '毎週', name: 'weekly' },
  { under: 18, label: '隔週', name: 'biweekly' },
  { under: 45, label: '月1', name: 'monthly' },
  { under: 120, label: '数ヶ月', name: 'quarterly' },
  { under: Infinity, label: '年数回', name: 'rarely' }
]

export function frequencyLevel(interval) {
  if(interval == null) return null
  return LEVELS.find(l => interval < l.under)
}

export default function frequencyLabel(interval) {
  const level = frequencyLevel(interval)
  return level ? level.label : null
}
