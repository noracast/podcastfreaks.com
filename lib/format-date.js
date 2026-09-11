import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

// 一覧に出す日付の形。もとは Vue.filter('formatDate') だったが、
// フィルタは Vue 3 で無くなるので素の関数にしてある。
// 受け取るのは build_info.json の 'YYYY-MM-DDTHH:mm:ss'
export default function formatDate(value) {
  return dayjs(String(value), 'YYYY-MM-DDTHH:mm:ss').format('YYYY.MM.DD')
}
