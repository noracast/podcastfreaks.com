// Apple のジャンルで、テック寄りのものを前に出す。
//
// **落とすのには使わない。** ジャンルは配信者の自己申告で、テック系でも
// 「ビジネス」「趣味」「個人ジャーナル」を選ぶ人がいる。実測では、登録済み
// 172件（Apple のリンクがあるもの）のうち主ジャンルがテクノロジーなのは
// 124件で、**28%はテクノロジー以外**だった。機械的に絞ると、すでに載せている
// ような番組を候補から消してしまう。
//
// iTunes の検索は10件で打ち切るので、並びだけ変えておけば、
// 打ち切りでテック系が落ちるのを減らせる。
//
// 英語名も入れてあるのは、country=JP でも英語で返ることがあるため。

const TECH_GENRES = [
  'テクノロジー', 'Technology',
  '技術ニュース', 'Tech News',
  'デザイン', 'Design',
  'ビジネス', 'Business',
  '起業', 'Entrepreneurship',
  'キャリア', 'Careers'
]

// どの番組にも付いてくるので、ジャンルとしては見ない
const NOT_A_GENRE = ['ポッドキャスト', 'Podcasts']

// 画面に出すジャンル。先頭のものを1つだけ
export function mainGenre(channel = {}) {
  return (channel.genres || []).find(genre => !NOT_A_GENRE.includes(genre)) || ''
}

// 見るのは**画面に出している先頭のジャンルだけ**。2つ目以降まで見ると、
// 「マネジメント」と出ている番組が（裏で「ビジネス」も持っているために）
// テック側へ回り、並びが画面と食い違って見える
export function isTechish(channel = {}) {
  return TECH_GENRES.includes(mainGenre(channel))
}

// テック寄りを前に。同じ組の中では iTunes が返した順（確からしい順）のまま
export default function sortByGenre(channels = []) {
  return channels.slice().sort((a, b) => (isTechish(a) ? 0 : 1) - (isTechish(b) ? 0 : 1))
}
