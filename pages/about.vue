<template lang="pug">
div#about
  h2 About
  p
    | このサイトは、近頃流行りのテック系ポッドキャストのアクティビティをまとめたサイトです。中の人は<a href="https://noracast.jp" target="_blank">noracast</a>というポッドキャストをやっています。<br>
    | リストへの追加希望がある場合は、
    nuxt-link(to='/request/') リクエストページ
    | から教えてください。

  h3 OPMLのダウンロードについて
  p
    | トップページから、書き出したい番組の一番右にあるチェックボックスにチェックをして、「Download OPML」ボタンを押すとOPMLファイルがダウンロードできます。<br>
    | MacとiOSをご使用の場合は、MacからAirDropで送るとiOS側でPodcastアプリを選択し、簡単に登録することができます。
</template>

<style lang="sass" scoped>
#about
  padding: 20px
  max-width: 600px
  a
    border-bottom: 1px dotted #999
    padding-bottom: 0.2em
</style>
