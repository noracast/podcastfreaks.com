<template>
  <!-- 狭い画面の切り替えは CSS のメディアクエリで行う。
       Responsive は幅を測るまで中身を visibility: hidden で隠すため、
       事前レンダリング済みの HTML が JS を読み終えるまで表示されなかった -->
  <div class="root">
    <div>
      <template v-if="episodes_in_1weeks.length">
        <h5>今週の新着エピソード　　{{ episodes_in_1weeks.length }} episodes</h5>
        <div class="this-week">
          <template v-for="(val, idx) in episodes_in_1weeks" :key="idx">
            <!-- 違う日だったら。
                 key は並び順そのもの。この一覧はビルド時に決まって、
                 あとから並べ替えも差し込みもしないので添字でよい -->
            <div v-if="idx == 0 || !isSame(val.pubDate, episodes_in_1weeks[idx-1].pubDate)" class="border">
              <span class="date" v-text="date(val.pubDate)" />
            </div>
            <episode-row :episode="val" />
          </template>
        </div>
      </template>
      <template v-if="episodes_in_2weeks.length">
        <h5>先週の新着エピソード　　{{ episodes_in_2weeks.length }} episodes</h5>
        <div class="last-week">
          <template v-for="(val, idx) in episodes_in_2weeks" :key="idx">
            <!-- 違う日だったら。
                 key は並び順そのもの。この一覧はビルド時に決まって、
                 あとから並べ替えも差し込みもしないので添字でよい -->
            <div v-if="idx == 0 || !isSame(val.pubDate, episodes_in_2weeks[idx-1].pubDate)" class="border">
              <span class="date" v-text="date(val.pubDate)" />
            </div>
            <episode-row :episode="val" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<!--
  スコープを付けている。以前はスコープなしで .date { position: absolute; padding: 5px 20px }
  などがグローバルに漏れ、一覧ページ（pages/index.vue）でリンクを持たない番組の
  日付が20pxずれる、位置が飛ぶ、といった不具合を起こしていた。
  episode-row はコンポーネントのルート要素にスコープが付くため .row への指定は今までどおり効く
-->
<style scoped>
.root {
  padding-top: 0;
}
.border {
  height: 0;
  border-top: 1px solid #ccc;
  margin: 10px 0;
  position: relative;
}
.date {
  position: absolute;
  top: 10px;
  padding: 5px 20px;
  height: 30px;
  line-height: 30px;
}
h5 {
  padding: 0 20px;
}
/* 900px は Responsive で測っていたときの境界をそのまま引き継いだもの */
@media (max-width: 900px) {
  .border {
    height: auto;
    margin-left: -20px;
    margin-right: 0;
  }
  .date {
    font-size: 11px;
    height: 20px;
    line-height: 20px;
    position: relative;
    margin-left: 20px;
    padding-left: 10px;
  }
}
</style>

<script>
import { jst } from '@/lib/jst'
import build_info from '@/static/downloads/build_info.json'

export default {
  setup() {
    useHead({ title: 'New episodes | Podcast Freaks - Japanese techie podcast archive' })
  },
  data: function() {
    // ビルド時刻を基準に、日本時間で「今週」と「先週」に振り分ける。
    // moment() を使うと実行のたびに基準が変わり、UTC のビルドサーバーと
    // JST の閲覧者で件数が食い違ってハイドレーションが壊れる
    const aweekago = jst(build_info.updated).subtract(7, 'days').startOf('date')
    let episodes_in_1weeks = []
    let episodes_in_2weeks = []
    build_info.episodes_in_2weeks.forEach((item, index)=> {
      if(jst(item.pubDate).isAfter(aweekago)){
        episodes_in_1weeks.push(item)
      }
      else {
        episodes_in_2weeks.push(item)
      }
    })
    return {
      episodes_in_1weeks,
      episodes_in_2weeks
    }
  },
  methods: {
    date: function(_date) {
      // ロケールは lib/jst.js で ja に決めている
      return jst(_date).format('M/D(ddd)')
    },
    // 日付の区切り線を出すかの判定。表示と同じ日本時間で比べる
    isSame: function(_date1, _date2) {
      return jst(_date1).isSame(jst(_date2), 'day')
    }
  }
}
</script>
