<template lang="pug">
.root
  h2 Request
  p
    | 自薦他薦問わず、このサイトに登録してほしい番組がある場合は下記のフォームよりお申し込みください。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。ハッシュタグの登録漏れなどもMessageの欄に書いて送っていただけると助かります。
  h3 Feedに関する既知の問題
  p
    | 既知の問題は、
    a(href="https://github.com/noracast/podcastfreaks.com/issues?q=is%3Aissue+is%3Aopen+label%3AFeed" target="_blank" rel="noopener") こちら
    | にまとめていますので、予めご一読いただけるとありがたいです。
  h3 Githubアカウントをお持ちの方へ
  p
    a(href="https://github.com/noracast/podcastfreaks.com/blob/master/data/rss.json" target="_blank" rel="noopener") こちらのファイル
    | へPRを送ってもらうとさらに助かります。
  form(name="register-request" method="POST" netlify)
    input(type="hidden" name="form-name" value="register-request")
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
