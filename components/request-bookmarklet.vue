<template>
  <!-- 使う人は限られるので、既定では畳んでおく。
       開いたときだけ作り方まで読ませる -->
  <details class="bookmarklet-section">
    <summary>ブックマークレット</summary>
    <!-- class は .lead にしない。レイアウトの（scoped でない）スタイルで
         ヘッダーのリード文と同じ白文字になり、白地に白で消える -->
    <div class="body">
      <p class="intro">番組のページを見ているときに押すと、その URL とタイトルをこの欄に入れて開きます。</p>
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
    </div>
  </details>
</template>

<style scoped>
/* 説明と、入れる欄のあいだに置く。畳んでいるあいだは1行の添え物だが、
   ここにあることに気づいてもらえるよう、薄い罫線で囲っておく */
.bookmarklet-section {
  margin-top: 20px;
  /* 余白は summary と中身が持つ。details に持たせると、その余白の上を
     押しても開かない（押せるのは summary の中だけ） */
  padding: 0;
  border: 1px solid #eee;
  border-radius: 6px;
  font-size: 12px;
  /* 畳んでいるあいだは、見出しのぶんだけの小さな枠にする。
     入れる欄より目立つと、本題を追い越してしまう。
     inline-block にすると行ボックスのぶん下にずれ、開いたときに上端が
     動いて見えるので、block のまま幅だけ中身に合わせる */
  width: max-content;
  max-width: 100%;
  /* 開いているあいだは、今そこを読んでいることが分かるように色を付ける。
     見出しの三角（::marker）も文字色に付いてくる */
  &[open] {
    width: auto;
    border-color: #7f00ff;
    & summary {
      color: #7f00ff;
    }
    &:hover {
      border-color: #6600cc;
      & summary {
        color: #6600cc;
      }
    }
  }
  & summary {
    padding: 8px 12px;
    color: #666;
    cursor: pointer;
  }
  & .body {
    padding: 0 12px 12px;
  }
  /* 押せることが分かるよう、重ねたときに少し濃くする */
  &:hover {
    border-color: #ddd;
    & summary {
      color: #444;
    }
  }
  & .intro {
    margin-top: 5px;
  }
}
/* ブックマークバーへ引っ張るもの。掴めることが分かるよう、
   リンクではなくボタンの見え方にして、カーソルも掴む形にする */
.bookmarklet {
  display: inline-block;
  border-radius: 3px;
  color: #fff;
  background-color: #7f00ff;
  /* 探すボタンより小さく。ここは本題ではない */
  font-size: 12px;
  font-weight: bold;
  padding: 7px 14px;
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
