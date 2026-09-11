<template>
  <!-- 狭い画面の切り替えは CSS のメディアクエリで行う。
       Responsive は幅を測るまで中身を visibility: hidden で隠すため、
       事前レンダリング済みの HTML が JS を読み終えるまで表示されなかった -->
  <div class="root">
    <!-- 上に貼り付いたまま、下の並びだけが動く。押した日まで辿れる -->
    <episode-heatmap class="heatmap" :available="availableDays" @pick="scrollToDay" />
    <div class="days">
      <template v-for="day in days" :key="day.key">
        <div :id="`day-${day.key}`" class="border">
          <span class="date">{{ day.label }}</span>
        </div>
        <!-- key は並び順そのもの。この一覧はビルド時に決まって、
             あとから並べ替えも差し込みもしないので添字でよい -->
        <episode-row v-for="(episode, index) in day.episodes" :key="index" :episode="episode" />
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
/* 日ごとの並びの上に貼り付ける。header（layouts/default.vue）の下に付ける
   ので、その高さぶん下げる。下を並びが通るので、背景は敷いてぼかす */
.heatmap {
  position: sticky;
  top: 80px;
  /* header は 5 */
  z-index: 4;
  padding-top: 14px;
  padding-bottom: 10px;
  background-color: rgba(255, 255, 255, 0.93);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #eee;
}
.days {
  padding-top: 10px;
  /* 最後の日を押したときも、貼り付いた heatmap のすぐ下まで来られるように
     しておく。これが無いと、末尾の日はページの途中までしかスクロールしない */
  padding-bottom: 60vh;
}
.border {
  height: 0;
  border-top: 1px solid #ccc;
  margin: 10px 0;
  position: relative;
}
/* 日付は一覧（pages/index.vue）と同じ YYYY.MM.DD・13px で出す。
   色も一覧の日付のグレー（First episode 列）に揃えてある。
   区切り線と同じ色なので、見出しとして浮かない */
.date {
  position: absolute;
  top: 10px;
  padding: 5px 20px;
  height: 30px;
  line-height: 30px;
  color: #ccc;
  font-size: 13px;
  /* 数字の幅を揃えて、日ごとの見出しの並びが揺れないようにする */
  font-variant-numeric: tabular-nums;
}
/* 900px は Responsive で測っていたときの境界をそのまま引き継いだもの */
@media (max-width: 900px) {
  .heatmap {
    /* 狭い画面の header は 70px */
    top: 70px;
  }
  .border {
    height: auto;
    margin-left: -20px;
    margin-right: 0;
  }
  .date {
    position: relative;
    margin-left: 20px;
    padding: 0 10px;
    height: 20px;
    line-height: 20px;
    font-size: 11px;
  }
}
</style>

<script>
import { jst } from '@/lib/jst'
import build_info from '@/static/downloads/build_info.json'

// 貼り付いている heatmap の下に、押した日の見出しが出るようにする隙間
const SCROLL_MARGIN = 8

export default {
  setup() {
    useHead({ title: 'New episodes | Podcast Freaks - Japanese techie podcast archive' })
  },
  computed: {
    // 日ごとにまとめる。fetch-feeds が新しい順に並べてあるので、そのまま辿る。
    // 日付の判定と表示は日本時間で揃える（lib/jst.js）
    days: function() {
      const days = []
      let current = null
      for(const episode of build_info.episodes_in_2weeks) {
        const date = jst(episode.pubDate)
        const key = date.format('YYYY-MM-DD')
        if(!current || current.key !== key) {
          current = { key, label: date.format('YYYY.MM.DD'), episodes: [] }
          days.push(current)
        }
        current.episodes.push(episode)
      }
      return days
    },
    // heatmap のうち、この並びに出ている日。そこだけ押せるようにする
    availableDays: function() {
      return this.days.map(day => day.key)
    }
  },
  methods: {
    scrollToDay: function(key) {
      const target = document.getElementById(`day-${key}`)
      if(!target) return
      // 貼り付いているぶんだけ上に隠れてしまうので、その高さを引く
      const header = document.querySelector('header')
      const heatmap = this.$el.querySelector('.heatmap')
      const offset = (header ? header.offsetHeight : 0) + (heatmap ? heatmap.offsetHeight : 0)
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset - SCROLL_MARGIN,
        behavior: 'smooth'
      })
    }
  }
}
</script>
