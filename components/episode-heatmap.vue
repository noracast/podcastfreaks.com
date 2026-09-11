<template>
  <!-- /new の頭に置く、日ごとの更新の濃淡。番組ごとに出すと更新の催促に
       見えてしまうので、全体をまとめた1枚だけにしている -->
  <div class="heatmap" :style="{ '--weeks': weeks.length }">
    <div class="head">
      <span class="summary">{{ summary }}</span>
      <!-- 年の数だけ並ぶと場所を取るので、普段は畳んでおく -->
      <button class="toggle" :class="{ 'is-open': yearsOpen }" @click="yearsOpen = !yearsOpen">
        Years
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <!-- 遡って見られるようにする。新しい年から並べる -->
      <div v-show="yearsOpen" class="years">
        <button
          v-for="year in years"
          :key="year.value"
          class="year"
          :class="{ 'is-selected': year.value === selected }"
          @click="pickYear(year.value)"
        >
          {{ year.label }}
        </button>
      </div>
    </div>
    <div class="body">
      <!-- 曜日の目印。GitHub と同じく1つおきに出す。
           横に送っても読めるよう、送る枠の外に置いてある -->
      <div class="weekdays">
        <span v-for="(label, index) in weekdays" :key="index">{{ label }}</span>
      </div>
      <!-- 狭い画面では収まらないので横に送る。開いたときは右端（最新）を見せる -->
      <div ref="scroll" class="scroll">
        <div class="chart">
          <div class="months">
            <span v-for="month in months" :key="month.column" class="month" :style="{ gridColumnStart: month.column }">{{ month.label }}</span>
          </div>
          <div class="grid">
            <template v-for="(week, index) in weeks" :key="index">
              <component
                :is="cell.listed ? 'button' : 'div'"
                v-for="cell in week"
                :key="cell.key"
                class="cell"
                :class="[`level-${cell.level}`, { 'is-blank': cell.future || cell.outside, 'is-listed': cell.listed }]"
                :title="cell.label"
                @click="cell.listed && $emit('pick', cell.key)"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
    <div class="legend">
      <span class="caption">Less</span>
      <span v-for="level in 5" :key="level" class="cell" :class="`level-${level - 1}`" />
      <span class="caption">More</span>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  /* GitHub の contribution graph と同じ大きさ。
     狭い画面では貼り付けたまま場所を取りすぎるので、そこだけ小さくする */
  --cell: 10px;
  --gap: 3px;
  /* 曜日の目印のぶん。月の並びと legend を、その右に揃えるのに使う */
  --weekday-width: 26px;
  padding: 0 20px;
  color: #656d76;
  font-size: 12px;
  .head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 10px;
    .summary {
      flex: none;
      color: #1f2328;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
    }
    /* 年の出し入れ */
    .toggle {
      /* レイアウトのグローバルな button の指定を打ち消す */
      border: 0;
      border-radius: 4px;
      min-width: 0;
      background: none;
      font: inherit;
      font-size: 11px;
      flex: none;
      margin-left: auto;
      padding: 3px 6px 3px 8px;
      display: flex;
      align-items: center;
      gap: 2px;
      color: #999;
      white-space: nowrap;
      cursor: pointer;
      & svg {
        transition: transform 0.2s;
      }
      &.is-open svg {
        transform: rotate(180deg);
      }
    }
    /* 年の並び。数が多いので、入らなければ横に送る */
    .years {
      flex: none;
      max-width: 100%;
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
  .body {
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }
  /* 曜日の目印。月の並びのぶんだけ下げて、行の高さに合わせる */
  .weekdays {
    flex: none;
    width: calc(var(--weekday-width) - 4px);
    /* 月の並びのぶんだけ下げて、セルの行と揃える */
    padding-top: 14px;
    display: grid;
    grid-template-rows: repeat(7, var(--cell));
    gap: var(--gap);
    font-size: 9px;
    & span {
      display: flex;
      align-items: center;
    }
  }
  .scroll {
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    /* 送れることが分かるよう、下の余白は残す */
    padding-bottom: 4px;
  }
  .chart {
    /* 列の数はその時々で変わるので、JS から渡す */
    width: calc(var(--weeks) * (var(--cell) + var(--gap)));
  }
  .months {
    display: grid;
    grid-template-columns: repeat(var(--weeks), calc(var(--cell) + var(--gap)));
    height: 14px;
    font-size: 12px;
    .month {
      /* 月の頭の週の上に置く。次の月に押し出されないよう、はみ出させる */
      grid-row: 1;
      white-space: nowrap;
    }
  }
  .grid {
    display: grid;
    grid-template-rows: repeat(7, var(--cell));
    grid-auto-flow: column;
    grid-auto-columns: var(--cell);
    gap: var(--gap);
  }
  .cell {
    /* button になるものがあるので、レイアウトのグローバルな指定を打ち消す */
    border: 0;
    min-width: 0;
    padding: 0;
    width: var(--cell);
    height: var(--cell);
    border-radius: 2px;
    /* 1話でも出ている日は押せる。枠は出さない（ほとんどの日が押せるので、
       付けると並び全体がうるさくなる）。触れたときだけ輪郭を出す */
    &.is-listed {
      cursor: pointer;
    }
    /* 更新が多い日ほど濃くする。段は 0 / 1〜2 / 3〜4 / 5〜7 / 8話以上。
       1日の中央値が4話なので、その前後で分かれるようにしてある。
       色は GitHub の contribution graph と同じものを使っている */
    &.level-0 {
      background-color: #ebedf0;
    }
    &.level-1 {
      background-color: #9be9a8;
    }
    &.level-2 {
      background-color: #40c463;
    }
    &.level-3 {
      background-color: #30a14e;
    }
    &.level-4 {
      background-color: #216e39;
    }
    /* まだ来ていない日と、選んだ年の外の日は、枠だけ空けておく。
       週の形を崩さないために置いてあるだけなので、色は付けない */
    &.is-blank {
      background-color: transparent;
    }
  }
  /* GitHub と同じく右下に置く。曜日のぶんを空けて、並びの右端に揃える */
  .legend {
    box-sizing: border-box;
    width: calc(var(--weekday-width) + var(--weeks) * (var(--cell) + var(--gap)));
    max-width: 100%;
    padding-left: var(--weekday-width);
    margin-top: 6px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--gap);
    font-size: 11px;
    .caption {
      margin: 0 4px;
    }
  }
}

/* 触れたときの色は、ポインタのある環境だけ（指では押したあとも残るため） */
@media (hover: hover) {
  .heatmap .head .years .year:not(.is-selected):hover,
  .heatmap .head .toggle:hover {
    background-color: #f0e8fc;
    color: #7f00ff;
  }
  /* 押せる日は、触れると輪郭を出して分かるようにする。
     色は濃いめのグレー。ブランドの紫だと、緑の並びの中で浮いてしまう */
  .heatmap .cell.is-listed:hover {
    box-shadow: 0 0 0 2px rgba(27, 31, 36, 0.5);
  }
}

@media (max-width: 900px) {
  .heatmap {
    --cell: 9px;
    --gap: 2px;
    --weekday-width: 22px;
    padding: 0 10px;
    /* 幅が残らないので、年の並びは見出しの下へ落とす */
    .head {
      flex-wrap: wrap;
      .years {
        flex-basis: 100%;
        max-width: none;
        justify-content: flex-start;
      }
    }
  }
}
</style>

<script>
import build_info from '@/static/downloads/build_info.json'
import counts from '@/static/downloads/daily-counts.json'
import { jst, jstEn } from '@/lib/jst'

// 既定で出す日数（直近1年）。週の頭で切り揃えるので、実際はこれを含む週まで
const DAYS = 365

// 年ではなく直近1年を出しているときの目印
const RECENT = 'recent'

// 曜日の目印。GitHub と同じく1つおきに出す（日曜始まり）
const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

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
  emits: ['pick'],
  data: function() {
    return {
      // 'recent' か西暦4桁
      selected: RECENT,
      // 年の並びを出しているか。普段は畳んでおく
      yearsOpen: false
    }
  },
  computed: {
    // 基準は「いま」ではなくビルド時刻。実行時のタイムゾーンで日付が変わると、
    // 事前レンダリングした結果と閲覧者のブラウザで食い違う（lib/jst.js）
    today: function() { return jst(build_info.updated).startOf('date') },
    weekdays: function() { return WEEKDAYS },
    // GitHub の「N contributions in ...」と同じ形にしてある
    summary: function() {
      const when = this.selected === RECENT ? 'in the last year' : `in ${this.selected}`
      return `${this.total.toLocaleString('en')} episodes ${when}`
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
            // 1話でも出ている日なら、その日まで辿れる
            listed: !outside && n > 0 && !date.isAfter(today),
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
          label: jstEn(`${month}-01T00:00:00+09:00`).format('MMM'),
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
    pickYear: function(value) {
      this.selected = value
      // 選んだら畳む。貼り付いている高さを取り返す
      this.yearsOpen = false
    },
    // 開いたときに見せたいのは新しいほう
    scrollToEnd: function() {
      const scroll = this.$refs.scroll
      if(scroll) scroll.scrollLeft = scroll.scrollWidth
    }
  }
}
</script>
