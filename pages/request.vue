<template lang="pug">
.root
  h2 Request
  p
    | 自薦他薦問わず、このサイトに登録してほしい番組がある場合は下記のフォームよりお申し込みください。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。ハッシュタグの登録漏れなどもMessageの欄に書いて送っていただけると助かります。
  h3 Feedに関する既知の問題
  p
    | 既知の問題は、
    a-blank(href="https://github.com/noracast/podcastfreaks.com/issues?q=is%3Aissue+is%3Aopen+label%3AFeed") こちら
    | にまとめていますので、予めご一読いただけるとありがたいです。<br>
    | また、毎日のビルドで見つかった問題は
    nuxt-link(to='/errors/') Errors ページ
    | に出しています。ご自身の番組が挙がっていましたら、フィードをご確認いただけると助かります。
  h3 Apple Podcastsのリンクについて
  p
    | 一覧に出るApple Podcastsへのリンクは、iTunesの検索APIで<strong>フィードURLが一致した番組にだけ</strong>自動で付けています。Apple側に登録されているフィードURLがこのサイトのものと違う場合（配信元を移行した、FeedBurnerを経由しているなど）は自動では特定できず、リンクが出ません。番組名が近いというだけで採用すると別の番組にリンクしてしまうため、確実でないものは出さない方針です。
    br
    | リンクが出ていない番組がありましたら、そのApple PodcastsのURLをMessageの欄に書いて送ってください。Githubアカウントをお持ちの方は
    a-blank(href="https://github.com/noracast/podcastfreaks.com/blob/main/data/apple-podcasts.json") こちらのファイル
    | へPRを送っていただけると確実です。
  h3 Githubアカウントをお持ちの方へ
  p
    a-blank(href="https://github.com/noracast/podcastfreaks.com/blob/main/data/rss.json") こちらのファイル
    | へPRを送ってもらうとさらに助かります。
  form(name="register-request" method="POST" netlify data-netlify-honeypot="bot-field")
    input(type="hidden" name="form-name" value="register-request")
    //- スパム対策の隠しフィールド。人には見えないので、値が入っていたら
    //- bot と判断されて送信が弾かれる。static/form.html 側にも同じ項目が要る
    p(hidden)
      label 入力しないでください
        input(name="bot-field")
    label(for="feed") RSS feed
    small 番組のRSSフィードURI
    br
    input#feed(type="text" name="feed" placeholder="https://noracast.jp/feed.xml")

    label(for="twitter") Twitter
    small 番組公式Twitterアカウントがある場合
    br
    input#twitter(type="text" name="twitter" placeholder="@noracast_")

    label(for="hashtag") Hashtag
    small 番組公式ハッシュタグがある場合
    br
    input#hashtag(type="text" name="hashtag" placeholder="#noracast")

    label(for="message") Message
    small なにかメッセージ等あれば
    br
    textarea#message(name="message" rows="5" placeholder="ハッシュタグが間違っていました。\nTwitter上でのお礼は結構です。")

    label(for="contributor") Contributor
    small 無記名でももちろん大丈夫です！
    br
    input#contributor(type="text" name="contributor" placeholder="@naokazu_terada")

    button(type="submit") Send
</template>

<style lang="sass" scoped>
.root
  padding: 20px
  max-width: 600px
form
  margin-top: 40px
  label
    display: block
    font-weight: bold
    font-size: 16px
    &:not(:nth-of-type(1))
      margin-top: 20px
  p.small
    font-size: 13px
    margin: 0
  input[type=text],
  textarea
    font-size: 16px
    padding: 10px
    max-width: 600px
    width: calc(100% - 20px)
    outline: none
    border: 1px solid #ccc
    margin-top: 5px
    &::placeholder
      color: #ccc
  textarea
    resize: vertical

  button
    margin-top: 20px
    display: block
    border-radius: 3px
    color: white
    font-size: 15px
    font-weight: bold
    padding: 10px 20px
    min-width: 100px
    cursor: pointer
a
  padding-bottom: 0.2em
  border-bottom: 1px dotted #444
</style>

<script>
export default {
  head() {
    return {
      title: 'Register request | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
