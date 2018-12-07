<template lang="pug">
div
  h2 Contact
  p
    | 自薦他薦問わず、このサイトに登録してほしい番組がある場合は下記のフォームよりお申し込みください。<br>
    | ただし、運営者側の意図に沿わない場合は登録しかねる場合がありますことはご了承ください。
  form(name="contact" method="POST" netlify)
    input(type="hidden" name="form-name" value="contact")
    label(for="feed") RSS feed *
    small 必須です
    br
    input#feed(type="text" name="feed" placeholder="https://noracast.jp/feed.xml")

    label(for="twitter") Twitter
    small 番組公式Twitterアカウントがある場合のみ
    br
    input#email(type="text" name="twitter" placeholder="@noracast_")

    label(for="twitter") Hashtag
    small 番組公式ハッシュタグがある場合のみ
    br
    input#email(type="text" name="twitter" placeholder="#noracast")

    label(for="message") Message
    small なにかメッセージ等あれば
    br
    textarea#message(name="message" rows="5")

    button(type="submit") Send
</template>

<style lang="sass?indentedSyntax" scoped>
form
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
    &:hover
      background: #af078b
</style>
