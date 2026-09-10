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
  h3 Twitterアカウントについて
  p
    | MCの方個人のTwitterアカウントですと、番組以外の情報が混ざってしまいやすいので、番組公式のものに限っています。<br>
  h3 ざっくりとした仕組みの解説
  p
    | 手動で登録しているのは、フィードURLと、公式Twitter、公式ハッシュタグの３つで、残りの情報は取得したデータを元に作っています。
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
  h3 Contribution
  p
    | このプロジェクトのソースは下記にて公開しています。Bug Report や Pull Request などありましたらこちらでも受け付けます。<br>
    a-blank(href="https://github.com/noracast/podcastfreaks.com") https://github.com/noracast/podcastfreaks.com
</template>

<style lang="sass" scoped>
.root
  padding: 20px
  max-width: 600px
  a:not(.noborder)
    border-bottom: 1px dotted #999
    padding-bottom: 0.2em
  .badge
    margin-right: 10px
</style>

<script>
export default {
  head() {
    return {
      title: 'About | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
