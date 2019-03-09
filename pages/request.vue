<template lang="pug">
div.main
  h2 Register request
  p
    | 自薦他薦問わず、このサイトに登録してほしい番組がある場合は下記のフォームよりお申し込みください。<br>
    | 運営側の意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。<br>
    | ハッシュタグの登録漏れなど、なにか間違いがございましたら、Messageの欄に書いて送っていただけると助かります。
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
    textarea#message(name="message" rows="5")

    button(type="submit") Send
</template>

<style lang="sass" scoped>
.main
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
    background: darken(#af078b, 15%)
    color: white
    font-size: 15px
    font-weight: bold
    padding: 10px 20px
    min-width: 100px
    cursor: pointer
    &:hover
      background: #af078b

</style>
