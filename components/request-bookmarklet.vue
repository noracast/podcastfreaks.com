<template>
  <!-- 使う人は限られるので、既定では畳んでおく。
       開いたときだけ作り方まで読ませる -->
  <details class="bookmarklet-section">
    <summary>ブックマークレット</summary>
    <p>番組のページを見ているときに押すだけで、その URL とタイトルをこのページへ渡せます。</p>
    <!-- href は javascript: のまま。押しても何も起きないよう既定の動作は止める
         （このページで押すと、このページ自身を調べに行ってしまう）。
         代わりにコードをコピーして、ドラッグできない環境の逃げ道にする -->
    <p class="bookmarklet-box">
      <!-- ここに出している文字が、そのままブックマークの名前になる
           （ドラッグしたリンクの表示テキストが使われる。title 属性は効かない）。
           長ければ、ブックマークバーへ入れたあとに名前を変えられる -->
      <a class="bookmarklet" :href="bookmarklet" @click.prevent="copy">→ Podcast Freaks</a>
      <span v-if="copied" class="copied">コピーしました</span>
    </p>
    <ol class="note">
      <li>上のボタンを<strong>ブックマークバーへドラッグ</strong>する（名前は好きに変えて構いません）</li>
      <li>ブックマークバーが出ていなければ、Chrome・Safari とも <code>⌘ + Shift + B</code> で出せます</li>
      <li>ドラッグできない場合（iOS など）は、上のボタンを押すとコードをコピーします。適当なページをブックマークに追加して開き直し、その URL の欄にコピーしたものを貼り替えてください</li>
    </ol>
  </details>
</template>

<style scoped>
/* 枠で囲って、結果とは別のものだと分かるようにする */
.bookmarklet-section {
  margin-top: 40px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 6px;
  & summary {
    font-weight: bold;
    cursor: pointer;
  }
  /* 閉じているときは見出しだけ。開いたときに中身との間を空ける */
  & > p:first-of-type {
    margin-top: 15px;
  }
}
/* ブックマークバーへ引っ張るもの。掴めることが分かるよう、
   リンクではなくボタンの見え方にして、カーソルも掴む形にする */
.bookmarklet {
  display: inline-block;
  border-radius: 3px;
  color: #fff;
  background-color: #7f00ff;
  font-size: 13px;
  font-weight: bold;
  padding: 8px 16px;
  cursor: grab;
  &:hover {
    color: #fff;
    background-color: #9933ff;
  }
  &:active {
    cursor: grabbing;
  }
}
.copied {
  margin-left: 10px;
  font-size: 13px;
  color: #7f00ff;
}
.note {
  font-size: 13px;
  color: #666;
}
/* 作り方。番号を振って、上のボタンからの続きとして読ませる */
ol.note {
  padding-left: 1.5em;
  & li:not(:first-child) {
    margin-top: 5px;
  }
}
code {
  background-color: #f4f4f4;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
</style>

<script>
export default {
  data: function() {
    return {
      // ブックマークレットが開く先。手元で試すときはそのまま手元を指す。
      // 事前レンダリングの時点では分からないので、本番の URL を初期値にする
      origin: 'https://podcastfreaks.com',
      copied: false
    }
  },
  mounted: function() {
    this.origin = window.location.origin
  },
  computed: {
    // 見ているページの URL とタイトルを付けて、このページを新しいタブで開く。
    // ブックマークの URL 欄に入るものなので、1行に収める
    bookmarklet: function() {
      return `javascript:(()=>{open('${this.origin}/request/?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank')})()`
    }
  },
  methods: {
    // ブックマークバーが無い環境のため。コピーできない場合は何も言わない
    // （押しても動かないことは、隣の説明で伝えてある）
    copy: function() {
      if(!navigator.clipboard) return
      navigator.clipboard.writeText(this.bookmarklet).then(() => {
        this.copied = true
      }).catch(() => {})
    }
  }
}
</script>
