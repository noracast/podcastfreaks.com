// 音声ファイルの配信元を、読んで分かる名前にする。
//
// ポッドキャストの配信サービスは、ホスト名（anchor.fm、feeds.soundcloud.com）より
// サービス名の方が伝わる。一方、GitHub Pages や各社のクラウドストレージは
// 「そこに置いてあるだけ」で、サービス名にしても情報が増えない。
// そこで、ポッドキャスト向けのサービスだけ名前にして、それ以外はホスト名のまま出す。
//
// 一覧の表示・絞り込みのラベル・検索対象で共通して使う。
// 絞り込みの値そのものはホスト名のままにしてある（データと1対1で対応させるため）
const SERVICES = [
  { host: 'anchor.fm', name: 'Anchor' },
  { host: 'soundcloud.com', name: 'SoundCloud' },
  { host: 'blubrry.com', name: 'Blubrry' },
  { host: 'libsyn.com', name: 'Libsyn' },
  { host: 'podbean.com', name: 'Podbean' },
  { host: 'art19.com', name: 'ART19' },
  { host: 'acast.com', name: 'Acast' },
  { host: 'transistor.fm', name: 'Transistor' },
  { host: 'podcastics.com', name: 'Podcastics' },
  { host: 'listen.style', name: 'LISTEN' },
  { host: 'radiotalk.jp', name: 'Radiotalk' },
  { host: 'feedpress.me', name: 'FeedPress' },
  { host: 'feedpress.it', name: 'FeedPress' },
  // 配信そのものではなく、ダウンロード数を数えるために URL の前に挟むもの。
  // 実際に音声を置いているのはその先の別のホストで、こちらからは分からない。
  // 「そこで配信している」と読まれないよう、経由であることを添える
  { host: 'podtrac.com', name: 'Podtrac 経由' },
  { host: 'chtbl.com', name: 'Chartable 経由' }
]

const find = (host) => SERVICES.find(s => host === s.host || host.endsWith(`.${s.host}`))

// ポッドキャスト向けのサービスとして名前を持っているか。
// 絞り込みの並び順（サービスを上、ただのホストを下）に使う
export function isHostingService(host) {
  return !!host && !!find(host)
}

export default function hostingLabel(host) {
  if(!host) return host
  const matched = find(host)
  return matched ? matched.name : host
}
