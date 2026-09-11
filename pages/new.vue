<template>
  <!-- 狭い画面の切り替えは CSS のメディアクエリで行う。
       Responsive は幅を測るまで中身を visibility: hidden で隠すため、
       事前レンダリング済みの HTML が JS を読み終えるまで表示されなかった -->
  <div class="root">
    <!-- 上に貼り付いたまま、下の並びだけが動く。押した日まで辿れる -->
    <episode-heatmap class="heatmap" @pick="pickDay" />
    <div class="days">
      <!-- 過去へ飛んだあと、新着へ戻る道を残しておく -->
      <div v-if="!fromLatest" class="back">
        <button @click="backToLatest">最新の新着に戻る</button>
      </div>
      <template v-for="day in days" :key="day.key">
        <div :id="`day-${day.key}`" class="border">
          <span class="date">{{ day.label }}</span>
        </div>
        <episode-row v-for="episode in day.episodes" :key="episode.id" :episode="episode" />
      </template>
      <!-- ここが見えたら続きを読む -->
      <div ref="sentinel" class="sentinel">
        <span v-if="loading">読み込み中…</span>
        <span v-else-if="reachedEnd">ここが一番古い回です</span>
      </div>
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
  /* 見出しの上下は About（.root の padding）と同じ 20px にする */
  padding-top: 20px;
  padding-bottom: 14px;
  /* ヘッダーや右下のプレーヤーと同じすりガラス。下を通る並びがぼけて
     透けることで、そこに面があると分かる。
     線や影で境目を作ると、日ごとの区切り線が近づいたときに2本が並んで
     見えてしまうので、境目は質感だけで示す */
  background-color: rgba(255, 255, 255, 0.58);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  backdrop-filter: blur(18px) saturate(180%);
  transition: background-color 0.25s;
}
.days {
  /* 貼り付いた濃淡の下端に、最初の区切り線をそのまま付ける。
     間を空けると、スクロールしていないときにそこだけ隙間に見える */
  padding-top: 0;
}
.back {
  padding: 0 20px 10px;
  & button {
    /* レイアウトのグローバルな button の指定を打ち消す */
    border: 0;
    border-radius: 4px;
    min-width: 0;
    background: none;
    font: inherit;
    font-size: 12px;
    padding: 4px 8px;
    color: #7f00ff;
    cursor: pointer;
  }
}
.sentinel {
  /* 最後まで見たあとも、押した日を上へ持ってこられるだけの高さを残す。
     続きがあるうちは、ここが見えた時点で読み込みが始まる */
  min-height: 60vh;
  padding: 20px;
  color: #999;
  font-size: 12px;
  text-align: center;
}
.border {
  height: 0;
  border-top: 1px solid #ccc;
  margin: 10px 0;
  position: relative;
  &:first-of-type {
    margin-top: 0;
  }
}
/* 日付は一覧（pages/index.vue）と同じ YYYY.MM.DD・13px で出す。
   色は一覧の Last episode 列（回が出た日）と同じ。日ごとのまとまりの
   見出しなので、区切り線と同じ薄さでは沈んでしまう */
.date {
  position: absolute;
  top: 10px;
  padding: 5px 20px;
  height: 30px;
  line-height: 30px;
  color: #444;
  font-size: 13px;
  /* 数字の幅を揃えて、日ごとの見出しの並びが揺れないようにする */
  font-variant-numeric: tabular-nums;
}
/* 触れている間は塞ぐ。濃淡を読むときに、下を通る並びが透けていると
   目が散る。ポインタのある環境だけにする（指では離れられない） */
@media (hover: hover) {
  .heatmap:hover {
    background-color: #fff;
  }
}

/* 900px は Responsive で測っていたときの境界をそのまま引き継いだもの */
@media (max-width: 900px) {
  .heatmap {
    /* 狭い画面の header は 70px */
    top: 70px;
  }
  .back {
    padding: 0 10px 10px;
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
import counts from '@/static/downloads/daily-counts.json'

// 話数のある最初の月。これより前は読みに行かない
const FIRST_MONTH = Object.keys(counts)[0].slice(0, 7)

// 1度に遡る上限。1話も出ていない月が続くことがあるので
// （2009〜2012 は疎）、何も足せなかったときは次の月へ進む
const MAX_STEPS = 12

const previousMonth = (month) => {
  const [year, number] = month.split('-').map(Number)
  return number === 1
    ? `${year - 1}-12`
    : `${year}-${String(number - 1).padStart(2, '0')}`
}

export default {
  setup() {
    // 2週間の新着だけでなく、2009年からを日ごとに辿れるようになったので
    // 「New episodes」ではなく「Episodes」。URL は /new のまま
    useHead({ title: 'Episodes | Podcast Freaks - Japanese techie podcast archive' })
  },
  data: function() {
    return {
      // 表示しているエピソード（新しい順）。まずはビルドに含まれている2週間ぶん。
      // ここだけは読み込みを待たずに出せる
      episodes: build_info.episodes_in_2weeks,
      // 月ごとのファイルを、どこまで遡って読んだか。null はまだ読んでいない
      loadedFrom: null,
      loading: false,
      // 最新から続けて見ているか。heatmap で過去へ飛ぶと false になる
      fromLatest: true
    }
  },
  computed: {
    // 日ごとにまとめる。fetch-feeds が新しい順に並べてあるので、そのまま辿る。
    // 日付の判定と表示は日本時間で揃える（lib/jst.js）
    days: function() {
      const days = []
      let current = null
      for(const episode of this.episodes) {
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
    reachedEnd: function() {
      return this.loadedFrom === FIRST_MONTH
    }
  },
  mounted: function() {
    // 下端が見えたら続きを読む。スクロールを毎回数えるより軽い
    this.observer = new IntersectionObserver(entries => {
      if(entries.some(entry => entry.isIntersecting)) this.loadMore()
    }, { rootMargin: '200px' })
    this.observer.observe(this.$refs.sentinel)
  },
  beforeUnmount: function() {
    if(this.observer) this.observer.disconnect()
  },
  methods: {
    // 月ごとのファイルを1つ読む。無い月（1話も出ていない月）は 404 になるので、
    // そのときは読めなかったことにして次へ進む
    fetchMonth: async function(month) {
      try {
        return await $fetch(`/downloads/months/${month}.json`)
      }
      catch {
        return []
      }
    },
    // 表示している最後の日より前を継ぎ足す
    loadMore: async function() {
      if(this.loading || this.reachedEnd) return
      this.loading = true
      try {
        let month = this.loadedFrom
          ? previousMonth(this.loadedFrom)
          : (this.days.length ? this.days[this.days.length - 1].key.slice(0, 7) : FIRST_MONTH)
        for(let step = 0; step < MAX_STEPS; step++) {
          if(month < FIRST_MONTH) {
            this.loadedFrom = FIRST_MONTH
            return
          }
          const list = await this.fetchMonth(month)
          this.loadedFrom = month
          // 2週間ぶんと重なるところがあるので、同じ回は足さない
          const known = new Set(this.episodes.map(episode => episode.id))
          const added = list.filter(episode => !known.has(episode.id))
          if(added.length) {
            this.episodes = this.episodes.concat(added)
            return
          }
          if(month === FIRST_MONTH) return
          month = previousMonth(month)
        }
      }
      finally {
        this.loading = false
      }
    },
    // heatmap の日を押したとき。並びに無ければ、その月から出し直す
    pickDay: async function(key) {
      if(document.getElementById(`day-${key}`)) {
        this.scrollToDay(key)
        return
      }
      const month = key.slice(0, 7)
      this.loading = true
      try {
        const list = await this.fetchMonth(month)
        if(!list.length) return
        this.episodes = list
        this.loadedFrom = month
        this.fromLatest = false
      }
      finally {
        this.loading = false
      }
      await this.$nextTick()
      this.scrollToDay(key)
    },
    backToLatest: function() {
      this.episodes = build_info.episodes_in_2weeks
      this.loadedFrom = null
      this.fromLatest = true
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    scrollToDay: function(key) {
      const target = document.getElementById(`day-${key}`)
      if(!target) return
      // 貼り付いているぶんだけ上に隠れてしまうので、その高さを引く。
      // 余白は足さない。少しでも空けると、そこだけ下の並びが覗いて
      // 濃淡と区切り線の間に隙間ができる。
      // offsetHeight は整数に丸めるので、端数のぶんずれる
      const header = document.querySelector('header')
      const heatmap = this.$el.querySelector('.heatmap')
      const offset = (header ? header.getBoundingClientRect().height : 0) +
        (heatmap ? heatmap.getBoundingClientRect().height : 0)
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth'
      })
    }
  }
}
</script>
