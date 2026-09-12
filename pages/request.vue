<template>
  <div class="root">
    <h2>Request</h2>
    <p>自薦他薦問わず、このサイトに登録してほしい番組がある場合は下記のフォームよりお申し込みください。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。ハッシュタグの登録漏れなどもMessageの欄に書いて送っていただけると助かります。</p>
    <form name="register-request" method="POST" netlify data-netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="register-request">
      <!-- スパム対策の隠しフィールド。人には見えないので、値が入っていたら
           bot と判断されて送信が弾かれる。static/form.html 側にも同じ項目が要る -->
      <p hidden>
        <label>入力しないでください<input name="bot-field"></label>
      </p>
      <label for="feed">RSS feed</label>
      <small>番組のRSSフィードURI</small>
      <br>
      <input id="feed" type="text" name="feed" placeholder="https://noracast.jp/feed.xml">

      <label for="twitter">X</label>
      <small>番組公式 X アカウントがある場合</small>
      <br>
      <input id="twitter" type="text" name="twitter" placeholder="@noracast_">

      <label for="hashtag">Hashtag</label>
      <small>番組公式ハッシュタグがある場合</small>
      <br>
      <input id="hashtag" type="text" name="hashtag" placeholder="#noracast">

      <label for="message">Message</label>
      <small>なにかメッセージ等あれば</small>
      <br>
      <!-- placeholder は3行に分けて出す。&#10; は改行 -->
      <textarea id="message" name="message" rows="5" placeholder="ハッシュタグが間違っていました。&#10;フィードのURLが変わりました。&#10;Apple PodcastsのURLはこちらです。" />

      <label for="contributor">Contributor</label>
      <small>無記名でももちろん大丈夫です！</small>
      <br>
      <input id="contributor" type="text" name="contributor" placeholder="@naokazu_terada">

      <button type="submit">Send</button>
    </form>
    <h3>Feedに関する既知の問題</h3>
    <!-- 文の途中に改行を入れると出力に半角空白が入るので、段落は1行で書く -->
    <p>既知の問題は、<a-blank href="https://github.com/noracast/podcastfreaks.com/issues?q=is%3Aissue+is%3Aopen+label%3AFeed">こちら</a-blank>にまとめていますので、予めご一読いただけるとありがたいです。<br>また、毎日のビルドで見つかった問題は<nuxt-link to="/errors/">Errors ページ</nuxt-link>に出しています。ご自身の番組が挙がっていましたら、フィードをご確認いただけると助かります。</p>
    <h3>Githubアカウントをお持ちの方へ</h3>
    <p><a-blank href="https://github.com/noracast/podcastfreaks.com/blob/main/data/rss.json">こちらのファイル</a-blank>へPRを送ってもらうとさらに助かります。</p>
  </div>
</template>

<style scoped>
.root {
  padding: 20px;
  max-width: 600px;
}
form {
  margin-top: 40px;
  & label {
    display: block;
    font-weight: bold;
    font-size: 16px;
    &:not(:nth-of-type(1)) {
      margin-top: 20px;
    }
  }
  & p.small {
    font-size: 13px;
    margin: 0;
  }
  & input[type=text], textarea {
    font-size: 16px;
    padding: 10px;
    max-width: 600px;
    width: calc(100% - 20px);
    outline: none;
    border: 1px solid #ccc;
    margin-top: 5px;
    &::placeholder {
      color: #ccc;
    }
  }
  & textarea {
    resize: vertical;
  }
  & button {
    margin-top: 20px;
    display: block;
    border-radius: 3px;
    color: white;
    font-size: 15px;
    font-weight: bold;
    padding: 10px 20px;
    min-width: 100px;
    cursor: pointer;
  }
}
/* フォームより下は補足。送る場所と読み分けられるよう、薄い線で区切る */
form + h3 {
  margin-top: 60px;
  padding-top: 40px;
  border-top: 1px solid #e8e8e8;
}
a {
  padding-bottom: 0.2em;
  border-bottom: 1px dotted #444;
}
</style>

<script>
export default {
  setup() {
    useHead({ title: 'Register request | Podcast Freaks - Japanese techie podcast archive' })
  },
}
</script>
