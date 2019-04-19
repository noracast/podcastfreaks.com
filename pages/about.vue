<template lang="pug">
.root
  h2 About
  p
    | このサイトは、近頃流行りの日本語テック系ポッドキャストのアクティビティをまとめたサイトです。中の人は<a href="https://noracast.jp" target="_blank">noracast</a>というポッドキャスト好きの３人組がポッドキャストについて話す番組をやっているので、よかったら聞いてみください。<br>
    | リストへの追加・修正または削除のご希望がある場合は、
    nuxt-link(to='/request/') リクエストページ
    | から教えてください。
  h3 OPMLダウンロード
  p
    | トップページから、書き出したい番組の一番右にあるチェックボックスにチェックをして、「Download OPML」ボタンを押すとOPMLファイルがダウンロードできます。<br>
    | MacとiOSをご使用の場合は、MacからAirDropで送るとiOS側でPodcastアプリを選択し、簡単に登録することができます。
  h3 Twitterアカウントについて
  p
    | MCの方個人のTwitterアカウントですと、番組以外の情報が混ざってしまいやすいので、番組公式のものに限っています。<br>
  h3 ざっくりとした仕組みの解説
  p
    | 手動で登録しているのは、フィードURLと、公式Twitter、公式ハッシュタグの３つで、残りの情報は取得したデータを元に作っています。
    | フィードや画像の取得はビルド時に行っています。NetlifyのWebhookをIFTTTから叩いてビルドしています。
    br
    br
    a.noborder(href="https://app.netlify.com/sites/podcast-freaks/deploys" target="_blank")
      img.badge(src="https://api.netlify.com/api/v1/badges/8fefaabc-7813-412d-a1ee-901215b39f14/deploy-status" alt="Netlify Status")
  h3 Contribution
  p
    | このプロジェクトのソースは下記にて公開しています。Bug Report や Pull Request などありましたらこちらでも受け付けます。<br>
    a(href="https://github.com/noracast/podcast-freaks" target="_blank") https://github.com/noracast/podcast-freaks
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
