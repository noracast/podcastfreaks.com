<template lang="pug">
div#about
  h2 About
  p
    | このサイトは、近頃流行りのテック系ポッドキャストのアクティビティをまとめたサイトです。中の人は<a href="https://noracast.jp" target="_blank">noracast</a>というポッドキャストをやっています。<br>
    | リストへの追加・修正または削除のご希望がある場合は、
    nuxt-link(to='/request/') リクエストページ
    | から教えてください。

  h3 ざっくりの仕組み
  p
    | 手動で登録しているのは、フィードURLと、公式Twitter、公式ハッシュタグの３つで、残りの情報は取得したデータを元に作っています。
    | フィードや画像の取得はビルド時に行っています。TravisCIのCron JobsでDaily Buildして静的化、Netlifyから配信しています。
    br
    a.noborder(href="https://travis-ci.org/noracast/podcast-freaks" target="_blank")
      img(src="https://travis-ci.org/noracast/podcast-freaks.svg?branch=master")
  h3 Twitterアカウント
  p
    | MCの方個人のTwitterアカウントですと、番組以外の情報が混ざってしまいやすいので、番組公式のものに限っています。<br>
  h3 OPMLダウンロード
  p
    | トップページから、書き出したい番組の一番右にあるチェックボックスにチェックをして、「Download OPML」ボタンを押すとOPMLファイルがダウンロードできます。<br>
    | MacとiOSをご使用の場合は、MacからAirDropで送るとiOS側でPodcastアプリを選択し、簡単に登録することができます。

  h3 Contribution
  p
    | このプロジェクトのソースは下記にて公開しています。Bug Report や Pull Request などありましたらこちらでも受け付けます。<br>
    a(href="https://github.com/noracast/podcast-freaks" target="_blank") https://github.com/noracast/podcast-freaks
</template>

<style lang="sass" scoped>
#about
  padding: 20px
  max-width: 600px
  a:not(.noborder)
    border-bottom: 1px dotted #999
    padding-bottom: 0.2em
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
