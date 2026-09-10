import moment from 'moment'

// 一覧に出す日付の形。もとは Vue.filter('formatDate') だったが、
// フィルタは Vue 3 で無くなるので素の関数にしてある
export default function formatDate(value) {
  return moment(String(value), moment.HTML5_FMT.DATETIME_LOCAL_SECONDS).format('YYYY.MM.DD')
}
