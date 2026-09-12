<template>
  <!-- Netlify Forms。項目は static/form.html と揃える必要がある
       （揃っていないと、その欄は送信されても記録されない） -->
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
    <input id="feed" v-model="feed" type="text" name="feed" placeholder="https://noracast.jp/feed.xml">

    <label for="twitter">X</label>
    <small>番組公式 X アカウントがある場合</small>
    <br>
    <input id="twitter" v-model="twitter" type="text" name="twitter" placeholder="@noracast_">

    <label for="hashtag">Hashtag</label>
    <small>番組公式ハッシュタグがある場合</small>
    <br>
    <input id="hashtag" v-model="hashtag" type="text" name="hashtag" placeholder="#noracast">

    <label for="message">Message</label>
    <small>なにかメッセージ等あれば</small>
    <br>
    <!-- placeholder は3行に分けて出す。&#10; は改行 -->
    <textarea id="message" v-model="message" name="message" rows="5" placeholder="ハッシュタグが間違っていました。&#10;フィードのURLが変わりました。&#10;Apple PodcastsのURLはこちらです。" />

    <label for="contributor">Contributor</label>
    <small>無記名でももちろん大丈夫です！</small>
    <br>
    <input id="contributor" type="text" name="contributor" placeholder="@naokazu_terada">

    <button type="submit">Send</button>
  </form>
</template>

<style scoped>
form {
  & label {
    display: block;
    font-weight: bold;
    font-size: 16px;
    &:not(:nth-of-type(1)) {
      margin-top: 20px;
    }
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
    font-size: 15px;
  }
}
</style>

<script>
export default {
  // 呼び出し側（/request/）が調べた結果を初期値として渡す。
  // 検索のたびに入れ直すので、data に写して watch で追いかける
  // （props をそのまま v-model に使うと書き換えられない）
  props: {
    values: {
      type: Object,
      default: function() { return {} }
    }
  },
  data: function() {
    return {
      feed: '',
      twitter: '',
      hashtag: '',
      message: ''
    }
  },
  watch: {
    values: {
      immediate: true,
      handler: function(values) {
        this.feed = values.feed || ''
        this.twitter = values.twitter || ''
        this.hashtag = values.hashtag || ''
        this.message = values.message || ''
      }
    }
  }
}
</script>
