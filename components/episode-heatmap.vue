<template>
  <!-- /new の頭に置く、日ごとの更新の濃淡。番組ごとに出すと更新の催促に
       見えてしまうので、全体をまとめた1枚だけにしている -->
  <div class="heatmap">
    <div class="head">
      <span class="title">この1年の更新</span>
      <span class="total">{{ total }} episodes</span>
    </div>
    <!-- 狭い画面では収まらないので横に送る。開いたときは右端（最新）を見せる -->
    <div ref="scroll" class="scroll">
      <div class="chart" :style="{ '--weeks': weeks.length }">
        <div class="months">
          <span v-for="month in months" :key="month.label" class="month" :style="{ gridColumnStart: month.column }">{{ month.label }}</span>
        </div>
        <div class="grid">
          <template v-for="(week, index) in weeks" :key="index">
            <div
              v-for="cell in week"
              :key="cell.key"
              class="cell"
              :class="[`level-${cell.level}`, { 'is-future': cell.future }]"
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
      font-weight: bold;
    }
    .total {
      color: #999;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
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
    /* まだ来ていない日は、枠だけ空けておく */
    &.is-future {
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

@media (max-width: 900px) {
  .heatmap {
    padding: 0 10px;
  }
}
</style>

<script>
import build_info from '@/static/downloads/build_info.json'
import counts from '@/static/downloads/daily-counts.json'
import { jst } from '@/lib/jst'

// 出す日数。週の頭で切り揃えるので、実際はこれを含む週まで
const DAYS = 365

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
  computed: {
    // 基準は「いま」ではなくビルド時刻。実行時のタイムゾーンで日付が変わると、
    // 事前レンダリングした結果と閲覧者のブラウザで食い違う（lib/jst.js）
    today: function() { return jst(build_info.updated).startOf('date') },
    weeks: function() {
      const today = this.today
      // 今日を含む週の土曜まで描き、そこから週単位で遡る（週の頭は日曜）
      const lastSaturday = today.add(6 - today.day(), 'day')
      const count = Math.ceil(DAYS / 7)
      const firstSunday = lastSaturday.subtract(count * 7 - 1, 'day')

      const weeks = []
      for(let w = 0; w < count; w++) {
        const days = []
        for(let d = 0; d < 7; d++) {
          const date = firstSunday.add(w * 7 + d, 'day')
          const key = date.format('YYYY-MM-DD')
          const n = counts[key] || 0
          days.push({
            key,
            count: n,
            level: levelOf(n),
            future: date.isAfter(today),
            label: `${date.format('YYYY.MM.DD')}　${n} episodes`
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
  mounted: function() {
    // 開いたときに見せたいのは最新のほう
    const scroll = this.$refs.scroll
    if(scroll) scroll.scrollLeft = scroll.scrollWidth
  }
}
</script>
