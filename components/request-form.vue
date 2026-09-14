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
    <!-- 見出しと説明を2行に分けず、ラベル1行にまとめる。何を入れるかは
         placeholder が実例で見せるので、説明を重ねると同じことを2度言う
         ことになる。どれも入れなくて構わない欄なので、（任意）とも書かない。
         全部に付くと、読む手がかりにならないまま行が伸びるだけになる
         （名前だけは、何に使うのかを説明するので下に一行添える）。
         name は Netlify Forms の項目名。static/form.html と揃えてあるので、
         見せ方を変えてもここは変えない -->
    <label for="feed">RSS フィードの URL</label>
    <input id="feed" v-model="feed" type="text" name="feed" placeholder="https://noracast.jp/feed.xml">

    <label for="twitter">番組公式 X アカウント</label>
    <input id="twitter" v-model="twitter" type="text" name="twitter" placeholder="@noracast_">

    <label for="hashtag">番組公式ハッシュタグ</label>
    <input id="hashtag" v-model="hashtag" type="text" name="hashtag" placeholder="#noracast">

    <!-- 上の欄に当てはまらないこと（番組名、Apple Podcasts の URL、
         削除の依頼など）は、ここにまとめて書いてもらう -->
    <label for="message">その他・メッセージ</label>
    <!-- placeholder は3行に分けて出す。&#10; は改行 -->
    <textarea id="message" v-model="message" name="message" rows="5" placeholder="ハッシュタグが間違っていました。&#10;フィードのURLが変わりました。&#10;Apple PodcastsのURLはこちらです。" />

    <!-- 上の「番組公式 X アカウント」は番組のもの、こちらは送ってくれた人のもの。
         同じ X を2回訊くので、どちらのことか分かるように書き分ける。
         ここだけ説明を添えるのは、何に使うのかが placeholder の実例では
         伝わらないため。名乗るのが前提に見えないよう、
         入れなくてよいこともここで言う -->
    <label for="contributor">ご自身の X アカウント</label>
    <small>X でお礼をお伝えするのに使わせていただきます。無記名でも構いません</small>
    <input id="contributor" type="text" name="contributor" placeholder="@naokazu_terada">

    <button type="submit">Send</button>
  </form>
</template>

<style scoped>
form {
  & label {
    display: block;
    font-weight: bold;
    /* 入れる欄の文字（16px）より小さくして、欄の方を主役にする。
       項目が5つ並ぶので、同じ大きさだと見出しの列のように見えてしまう */
    font-size: 14px;
    &:not(:nth-of-type(1)) {
      margin-top: 20px;
    }
  }
  /* ラベルの補足。ラベルより弱く、入れる欄の手前に置く */
  & small {
    display: block;
    margin-top: 3px;
    color: #888;
    font-size: 12px;
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
