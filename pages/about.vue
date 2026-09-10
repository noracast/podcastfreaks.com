<template lang="pug">
.root
  h2 About
  p
    | このサイトは、近頃流行りの日本語テック系ポッドキャストのアクティビティをまとめたサイトです。中の人は
    a-blank(href="https://noracast.jp") noracast
    | というポッドキャスト好きの３人組がポッドキャストについて話す番組をやっているので、よかったら聞いてみください。<br>
    | リストへの追加・修正または削除のご希望がある場合は、
    nuxt-link(to='/request/') リクエストページ
    | から教えてください。
  h3 ざっくりとした仕組みの解説
  p
    | 手動で登録しているのは、フィードURLと、公式X、公式ハッシュタグの３つで、残りの情報は取得したデータを元に作っています。
    | フィードや画像の取得はビルド時に行っています。毎日00:00:00(UTC+0900)に、NetlifyのWebhookをIFTTTから叩いてビルドしています。
    br
    br
    a-blank.noborder(href="https://app.netlify.com/sites/podcastfreaks.com/deploys")
      img.badge(src="https://api.netlify.com/api/v1/badges/8fefaabc-7813-412d-a1ee-901215b39f14/deploy-status" alt="Netlify Status")
  h3 フィードの取得状況
  p
    | 毎日のビルドで見つかった問題は
    nuxt-link(to='/errors/') Errors ページ
    | に出しています。取得できなかった番組のほか、収録時間やカバー画像を読み取れなかった番組も挙げています。<br>
    | ご自身の番組が挙がっていましたら、フィードをご確認いただけると助かります。原因が分からない場合はリクエストページからお知らせください。
  h3 Duration と Frequency の見方
  p
    | 一覧の Duration と Frequency は、番組ごとに求めた値をおおまかな段階に丸めて出しています。取りうる値は次のとおりです。
  h4#duration Duration
  p.note 各エピソードの収録時間（RSSの itunes:duration）の中央値です。短いものほど濃い青にしています。
  ul.legend
    li
      duration(duration="00:10:00")
      span 〜15分00秒
    li
      duration(duration="00:25:00")
      span 15分を超えて30分まで
    li
      duration(duration="00:40:00")
      span 30分を超えて45分まで
    li
      duration(duration="00:50:00")
      span 45分を超えて1時間未満
    li
      duration(duration="01:10:00")
      span 1時間から1時間29分まで
    li
      duration(duration="01:45:00")
      span 1時間30分から1時間59分まで
    li
      duration(duration="02:30:00")
      span 2時間以上
    li
      duration
      span 収録時間を読み取れなかった番組
  h4#frequency Frequency
  p.note 直近の更新日の間隔の中央値です。更新が多いものほど鮮やかな緑にしています。
  ul.legend
    li
      frequency(:interval="1")
      span 2日未満
    li
      frequency(:interval="3")
      span 2日から4日
    li
      frequency(:interval="7")
      span 5日から9日
    li
      frequency(:interval="14")
      span 10日から17日
    li
      frequency(:interval="30")
      span 18日から44日
    li
      frequency(:interval="60")
      span 45日から119日
    li
      frequency(:interval="200")
      span 120日以上
    li
      frequency
      span 更新した日が1日分しかなく、間隔を求められなかった番組
  h3 X アカウントについて
  p
    | MCの方個人のXアカウントですと、番組以外の情報が混ざってしまいやすいので、番組公式のものに限っています。<br>
  h3 OPMLダウンロード
  p
    | トップページから、書き出したい番組の一番右にあるチェックボックスにチェックをして、「Download OPML」ボタンを押すとOPMLファイルがダウンロードできます。<br>
    | MacとiOSをご使用の場合は、MacからAirDropで送るとiOS側でPodcastアプリを選択し、簡単に登録することができます。
  h3 音声の再生について
  p
    | このサイトで再生する音声は、預かったり中継したりせず、各番組の配信サーバーにあるファイルをブラウザから直接再生しています。配信元のログにはお聴きの方のアクセスがそのまま残るので、ここでの再生は各番組の統計に計上されます。フィードに書かれたURLは計測用のものも含めて一切書き換えていません。ファイルの保存機能は用意していません。<br>
    | フィードに掲載拒否（itunes:block / podcast:block）が指定されている番組は、一覧に出していません。掲載を止めたい場合は、フィードでの指定のほか、
    nuxt-link(to='/request/') リクエストページ
    | からもお知らせいただけます。
  h3 Contribution
  p
    | このプロジェクトのソースは下記にて公開しています。Bug Report や Pull Request などありましたらこちらでも受け付けます。<br>
    a-blank(href="https://github.com/noracast/podcastfreaks.com") https://github.com/noracast/podcastfreaks.com
</template>

<style scoped>
.root {
  padding: 20px;
  max-width: 600px;
  /* ヘッダーは position: sticky で上に貼り付いたままなので、アンカーで飛ぶと
     見出しがその下に潜ってしまう。ヘッダーの高さ（80px）に余白を足して逃がす。
     Nuxt の scrollBehavior はこの値を読んで飛び先をずらしてくれる */
  & h3, h4 {
    scroll-margin-top: 100px;
  }
  & a:not(.noborder) {
    border-bottom: 1px dotted #999;
    padding-bottom: 0.2em;
  }
  .badge {
    margin-right: 10px;
  }
  & h4 {
    font-size: 14px;
    margin: 25px 0 3px;
  }
  .note {
    color: #666;
    font-size: 13px;
    margin: 0 0 12px;
  }
  /* 一覧に出ているバッジそのものを並べる。凡例と実物がずれないようにするため、
     色や文言をここで書き写さず、duration / frequency の各コンポーネントに描かせる */
  .legend {
    list-style: none;
    padding: 0;
    margin: 0;
    & li {
      display: flex;
      align-items: center;
      padding: 3px 0;
      font-size: 13px;
      >*:first-child {
        flex: none;
        margin-right: 12px;
      }
    }
  }
}
/* 狭い画面ではヘッダーが 70px になる */
@media (max-width: 810px) {
  .root {
    & h3, h4 {
      scroll-margin-top: 90px;
    }
  }
}
</style>

<script>
import Duration from '@/components/duration.vue'
import Frequency from '@/components/frequency.vue'

export default {
  components: { Duration, Frequency },
  head() {
    return {
      title: 'About | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
