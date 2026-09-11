<template>
  <!-- /new の頭に置く、日ごとの更新の濃淡。番組ごとに出すと更新の催促に
       見えてしまうので、全体をまとめた1枚だけにしている -->
  <div class="heatmap">
    <div class="head">
      <span class="title">{{ title }}</span>
      <span class="total">{{ total }} episodes</span>
      <!-- 遡って見られるようにする。新しい年から並べる -->
      <div class="years">
        <button
          v-for="year in years"
          :key="year.value"
          class="year"
          :class="{ 'is-selected': year.value === selected }"
          @click="selected = year.value"
        >
          {{ year.label }}
        </button>
      </div>
    </div>
    <!-- 狭い画面では収まらないので横に送る。開いたときは右端（最新）を見せる -->
    <div ref="scroll" class="scroll">
      <div class="chart" :style="{ '--weeks': weeks.length }">
        <div class="months">
          <span v-for="month in months" :key="month.column" class="month" :style="{ gridColumnStart: month.column }">{{ month.label }}</span>
        </div>
        <div class="grid">
          <template v-for="(week, index) in weeks" :key="index">
            <div
              v-for="cell in week"
              :key="cell.key"
              class="cell"
              :class="[`level-${cell.level}`, { 'is-blank': cell.future || cell.outside }]"
              :title="cell.label"
            />
          </template>
        </div>
      </div>
    </div>
    <div class="legend">
      <span class="caption">少ない</span>
      <span v-for="level in 5" :key="level" class="cell" :class="`level-${level - 1}`" />
      <span class="caption">多い</span>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  padding: 0 20px;
  /* 日付の見出し（pages/new.vue の .date）と同じ大きさに揃える */
  font-size: 13px;
  .head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 10px;
    .title {
      flex: none;
      font-weight: bold;
    }
    .total {
      flex: none;
      color: #999;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    /* 年の並び。数が多いので、入らなければ横に送る */
    .years {
      flex: 1;
      min-width: 0;
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      overflow-x: auto;
      .year {
        /* レイアウトのグローバルな button の指定を打ち消す */
        border: 0;
        border-radius: 4px;
        min-width: 0;
        background: none;
        font: inherit;
        font-size: 11px;
        flex: none;
        padding: 3px 8px;
        color: #999;
        white-space: nowrap;
        cursor: pointer;
        font-variant-numeric: tabular-nums;
        &.is-selected {
          background-color: #7f00ff;
          color: #fff;
        }
      }
    }
  }
  .scroll {
    overflow-x: auto;
    /* 送れることが分かるよう、下の余白は残す */
    padding-bottom: 4px;
  }
  .chart {
    /* 列の数はその時々で変わるので、JS から渡す */
    width: calc(var(--weeks) * 14px);
  }
  .months {
    display: grid;
    grid-template-columns: repeat(var(--weeks), 14px);
    height: 14px;
    color: #999;
    font-size: 10px;
    .month {
      /* 月の頭の週の上に置く。次の月に押し出されないよう、はみ出させる */
      grid-row: 1;
      white-space: nowrap;
    }
  }
  .grid {
    display: grid;
    grid-template-rows: repeat(7, 11px);
    grid-auto-flow: column;
    grid-auto-columns: 11px;
    gap: 3px;
  }
  .cell {
    width: 11px;
    height: 11px;
    border-radius: 2px;
    /* 更新が多い日ほど濃い紫にする。段は 0 / 1〜2 / 3〜4 / 5〜7 / 8話以上。
       1日の中央値が4話なので、その前後で分かれるようにしてある */
    &.level-0 {
      background-color: #eee;
    }
    &.level-1 {
      background-color: #e4d5fb;
    }
    &.level-2 {
      background-color: #c3a0f4;
    }
    &.level-3 {
      background-color: #9a5cef;
    }
    &.level-4 {
      background-color: #7f00ff;
    }
    /* まだ来ていない日と、選んだ年の外の日は、枠だけ空けておく。
       週の形を崩さないために置いてあるだけなので、色は付けない */
    &.is-blank {
      background-color: transparent;
    }
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: 8px;
    color: #999;
    font-size: 10px;
    .caption {
      margin: 0 4px;
    }
  }
}

/* 触れたときの色は、ポインタのある環境だけ（指では押したあとも残るため） */
@media (hover: hover) {
  .heatmap .head .years .year:not(.is-selected):hover {
    background-color: #f0e8fc;
    color: #7f00ff;
  }
}

@media (max-width: 900px) {
  .heatmap {
    padding: 0 10px;
    /* 幅が残らないので、年の並びは見出しの下へ落とす */
    .head {
      flex-wrap: wrap;
      .years {
        flex-basis: 100%;
        justify-content: flex-start;
      }
    }
  }
}
</style>

<script>
import build_info from '@/static/downloads/build_info.json'
import counts from '@/static/downloads/daily-counts.json'
import { jst } from '@/lib/jst'

// 既定で出す日数（直近1年）。週の頭で切り揃えるので、実際はこれを含む週まで
const DAYS = 365

// 年ではなく直近1年を出しているときの目印
const RECENT = 'recent'

// 1日の話数を色の段に落とす。境目は実データから決めてある
// （1日あたりの中央値が4話、直近1年の最大が15話）
const levelOf = (count) => {
  if(!count) return 0
  if(count <= 2) return 1
  if(count <= 4) return 2
  if(count <= 7) return 3
  return 4
}

export default {
  data: function() {
    return {
      // 'recent' か西暦4桁
      selected: RECENT
    }
  },
  computed: {
    // 基準は「いま」ではなくビルド時刻。実行時のタイムゾーンで日付が変わると、
    // 事前レンダリングした結果と閲覧者のブラウザで食い違う（lib/jst.js）
    today: function() { return jst(build_info.updated).startOf('date') },
    title: function() {
      return this.selected === RECENT ? 'この1年の更新' : `${this.selected}年の更新`
    },
    // 選べる年。話数のある最初の年から今年まで、新しいほうを先に並べる
    years: function() {
      const days = Object.keys(counts)
      const first = days.length ? Number(days[0].slice(0, 4)) : this.today.year()
      const list = [{ value: RECENT, label: 'この1年' }]
      for(let year = this.today.year(); year >= first; year--) {
        list.push({ value: String(year), label: String(year) })
      }
      return list
    },
    // 描く範囲の、最初の日曜と最後の土曜。週の頭で切り揃える
    range: function() {
      const today = this.today
      if(this.selected === RECENT) {
        const last = today.add(6 - today.day(), 'day')
        return { first: last.subtract(Math.ceil(DAYS / 7) * 7 - 1, 'day'), last }
      }
      const start = this.today.set('year', Number(this.selected)).startOf('year')
      const end = start.endOf('year').startOf('date')
      return {
        first: start.subtract(start.day(), 'day'),
        last: end.add(6 - end.day(), 'day')
      }
    },
    weeks: function() {
      const today = this.today
      const firstSunday = this.range.first
      const count = Math.round(this.range.last.diff(firstSunday, 'day') / 7) + 1

      const weeks = []
      for(let w = 0; w < count; w++) {
        const days = []
        for(let d = 0; d < 7; d++) {
          const date = firstSunday.add(w * 7 + d, 'day')
          const key = date.format('YYYY-MM-DD')
          // 年で見ているとき、週の頭とお尻には前後の年の日が混ざる。
          // 週の形は崩したくないので置いておくが、数にも色にも入れない
          const outside = this.selected !== RECENT && key.slice(0, 4) !== this.selected
          const n = outside ? 0 : (counts[key] || 0)
          days.push({
            key,
            count: n,
            level: levelOf(n),
            future: date.isAfter(today),
            outside,
            label: outside ? null : `${date.format('YYYY.MM.DD')}　${n} episodes`
          })
        }
        weeks.push(days)
      }
      return weeks
    },
    // 月が変わる週の上に月名を置く。最初の週は、その月が1日から始まって
    // いなければ飛ばす（列の頭で切れて読めないため）
    months: function() {
      const months = []
      this.weeks.forEach((week, index) => {
        // まるごと年の外に出ている週（年で見たときの最後の1列など）には
        // 何も描いていないので、月名も置かない
        if(week.every(cell => cell.outside)) return
        const first = week[0]
        const month = first.key.slice(0, 7)
        const previous = index == 0 ? null : this.weeks[index - 1][0].key.slice(0, 7)
        if(month === previous) return
        if(index == 0 && Number(first.key.slice(8, 10)) > 7) return
        months.push({
          label: jst(`${month}-01T00:00:00+09:00`).format('MMM'),
          // grid の列は 1 から数える
          column: index + 1
        })
      })
      return months
    },
    total: function() {
      return this.weeks.reduce((sum, week) => sum + week.reduce((n, cell) => n + cell.count, 0), 0)
    }
  },
  watch: {
    // 年を選び直したら、また最新のほうから見せる
    selected: function() {
      this.$nextTick(this.scrollToEnd)
    }
  },
  mounted: function() {
    this.scrollToEnd()
  },
  methods: {
    // 開いたときに見せたいのは新しいほう
    scrollToEnd: function() {
      const scroll = this.$refs.scroll
      if(scroll) scroll.scrollLeft = scroll.scrollWidth
    }
  }
}
</script>
