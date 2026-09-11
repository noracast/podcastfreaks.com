<template>
  <!-- /episodes の頭に置く、日ごとの更新の濃淡。番組ごとに出すと更新の催促に
       見えてしまうので、全体をまとめた1枚だけにしている -->
  <div class="heatmap" :class="{ 'is-collapsed': collapsed }" :style="{ '--weeks': weeks.length }">
    <!-- すりガラスは全幅に敷き、中身だけを幅で止める。全幅にすると、
         濃淡の右に何もない広い余白ができてしまう -->
    <div class="inner">
      <div class="head">
        <h2 class="period">{{ period }}</h2>
        <span class="total">{{ totalLabel }}</span>
        <!-- 上に貼り付いているので、要らないときは畳んで並びに場所を譲れる -->
        <button class="fold" :title="collapsed ? '開く' : '畳む'" :aria-label="collapsed ? '開く' : '畳む'" @click="collapsed = !collapsed">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <!-- 畳むときは高さを 0 にする（0fr ↔ 1fr）。中身の高さはセルの大きさで
         変わるので、決め打ちの max-height にはできない -->
      <div class="fold-wrap">
        <div class="fold-inner">
          <div class="body">
            <div class="chart-side">
              <!-- 曜日の目印。1つおきに出す。横に送っても読めるよう、
                 送る枠の外に置いてある -->
              <div class="weekdays">
                <span v-for="(label, index) in weekdays" :key="index">{{ label }}</span>
              </div>
              <!-- 収まらないときは横に送る。開いたときは右端（最新）を見せる -->
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
              <div class="legend">
                <span class="caption">Less</span>
                <span v-for="level in 5" :key="level" class="cell" :class="`level-${level - 1}`" />
                <span class="caption">More</span>
              </div>
            </div>
            <!-- 年は右に縦に並べる。ここが埋まることで、横幅の決まっている
               濃淡の右側が余らない -->
            <div
              ref="years"
              class="years"
              :class="{ 'at-start': yearsAtStart, 'at-end': yearsAtEnd }"
              @scroll="measureYears"
            >
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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  /* GitHub の contribution graph と同じ大きさ。
     狭い画面では貼り付けたまま場所を取りすぎるので、そこだけ小さくする */
  --cell: 10px;
  --gap: 3px;
  /* 月の並びと、その下のセルの間 */
  --months-gap: 4px;
  /* 曜日の目印のぶん。月の並びと凡例を、その右に揃えるのに使う */
  --weekday-width: 26px;
  padding: 0 20px;
  color: #999;
  font-size: 12px;

  /* 濃淡（53〜54週 + 曜日 + 年の並び）が横に送らずに収まる幅 */
  .inner {
    max-width: 820px;
  }

  .head {
    display: flex;
    /* 見出しと、その隣の話数の下端を揃える */
    align-items: baseline;
    gap: 10px;
    /* About の h2 の下の余白（0.83em）と同じ */
    margin-bottom: 20px;
    transition: margin-bottom 0.22s;
    /* このページの見出し。About の h2 と同じ大きさ・太さにしてある。
       話数は入れない。桁が増えると見出しが長くなってしまう */
    .period {
      flex: none;
      margin: 0;
      color: #444;
      font-size: 24px;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
    }
    .total {
      flex: none;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    /* 濃淡ごと畳む */
    .fold {
      /* レイアウトのグローバルな button の指定を打ち消す */
      border: 0;
      border-radius: 4px;
      min-width: 0;
      background: none;
      font: inherit;
      flex: none;
      /* 行の下端ではなく、見出しの高さの真ん中に置く */
      align-self: center;
      margin-left: auto;
      padding: 2px;
      display: flex;
      align-items: center;
      color: #999;
      cursor: pointer;
      & svg {
        transition: transform 0.22s;
      }
    }
  }

  .fold-wrap {
    display: grid;
    grid-template-rows: 1fr;
    transition: grid-template-rows 0.22s;
    .fold-inner {
      min-height: 0;
      overflow: hidden;
    }
  }
  /* 畳んだときは、見出しの行だけが残る */
  &.is-collapsed {
    .fold-wrap {
      grid-template-rows: 0fr;
    }
    /* 濃淡が無くなるので、見出しの下の余白も畳む。
       残すと、上（帯の padding）より下だけが広くなる */
    .head {
      margin-bottom: 0;
    }
    .head .fold svg {
      transform: rotate(180deg);
    }
  }

  /* 年の並びは絶対位置で右に置く。並べて置くと、年のほうが高いせいで
     濃淡の高さまで引き伸ばされてしまう（上に貼り付けているので高さは
     抑えたい） */
  .body {
    position: relative;
    padding-right: 80px;
  }
  /* 曜日・濃淡・凡例 */
  .chart-side {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }
  /* 月の並びのぶんだけ下げて、セルの行と揃える */
  .weekdays {
    width: calc(var(--weekday-width) - 4px);
    padding-top: calc(14px + var(--months-gap));
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
    margin-bottom: var(--months-gap);
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
       色はブランドの紫を薄めていったもの */
    &.level-0 {
      background-color: #ececec;
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
  /* 凡例は濃淡の右下に寄せる。曜日のぶんを空けて、並びの右端に揃える */
  .legend {
    grid-column: 2;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: var(--gap);
    margin-top: 6px;
    font-size: 11px;
    .caption {
      margin: 0 4px;
    }
  }
  /* 年は縦に積む。濃淡と同じ高さに収め、入らないぶんはここだけ縦に送る。
     送れることが分かるよう、下端をうっすら消しておく */
  .years {
    --fade: 18px;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 64px;
    overflow-y: auto;
    /* 送れる向きの端だけを消す。両端に届いていれば消さない。
       どこまで来ているかは JS が測ってクラスで知らせる */
    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
    mask-image: linear-gradient(to bottom, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
    &.at-start {
      -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - var(--fade)), transparent);
      mask-image: linear-gradient(to bottom, #000 calc(100% - var(--fade)), transparent);
    }
    &.at-end {
      -webkit-mask-image: linear-gradient(to bottom, transparent, #000 var(--fade));
      mask-image: linear-gradient(to bottom, transparent, #000 var(--fade));
    }
    &.at-start.at-end {
      -webkit-mask-image: none;
      mask-image: none;
    }
    display: flex;
    flex-direction: column;
    gap: 2px;
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
      text-align: right;
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

/* 触れたときの色は、ポインタのある環境だけ（指では押したあとも残るため） */
@media (hover: hover) {
  .heatmap .years .year:not(.is-selected):hover,
  .heatmap .head .fold:hover {
    background-color: #f0e8fc;
    color: #7f00ff;
  }
  /* 押せる日は、触れると輪郭を出して分かるようにする */
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
    /* 幅が残らないので、年は濃淡の下へ横並びで落とす */
    .body {
      padding-right: 0;
    }
    /* 横並びになるので、消す向きも横にする */
    .years {
      position: static;
      width: auto;
      margin-top: 8px;
      flex-direction: row;
      overflow-x: auto;
      overflow-y: visible;
      -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
      mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
      &.at-start {
        -webkit-mask-image: linear-gradient(to right, #000 calc(100% - var(--fade)), transparent);
        mask-image: linear-gradient(to right, #000 calc(100% - var(--fade)), transparent);
      }
      &.at-end {
        -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade));
        mask-image: linear-gradient(to right, transparent, #000 var(--fade));
      }
      &.at-start.at-end {
        -webkit-mask-image: none;
        mask-image: none;
      }
      .year {
        text-align: center;
      }
    }
  }
}

/* 見出しと話数が1行に並びきらない幅では、話数を下の行へ落とす。
   横に並べたままだと（どちらも縮まないので）ページごと横にはみ出す */
@media (max-width: 480px) {
  .heatmap {
    .head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      column-gap: 10px;
      row-gap: 2px;
      .period,
      .total {
        grid-column: 1;
      }
      /* 畳むボタンは、落とした話数に付いていかず見出しの行に残す */
      .fold {
        grid-column: 2;
        grid-row: 1;
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

// 曜日の目印。1つおきに出す（日曜始まり）
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
      // 濃淡を畳んでいるか
      collapsed: false,
      // 年の並びが、どちらの端まで来ているか。端を消すかどうかに使う
      yearsAtStart: true,
      yearsAtEnd: false
    }
  },
  computed: {
    // 基準は「いま」ではなくビルド時刻。実行時のタイムゾーンで日付が変わると、
    // 事前レンダリングした結果と閲覧者のブラウザで食い違う（lib/jst.js）
    today: function() { return jst(build_info.updated).startOf('date') },
    weekdays: function() { return WEEKDAYS },
    // 見出しはどの範囲を見ているかだけ。話数は隣に小さく出す
    // （見出しに入れると、桁が増えるほど長くなってしまう）
    period: function() {
      return this.selected === RECENT
        ? 'Episodes in the last year'
        : `Episodes in ${this.selected}`
    },
    totalLabel: function() {
      return `${this.total.toLocaleString('en')} episodes`
    },
    // 選べる年。話数のある最初の年から今年まで、新しいほうを先に並べる
    years: function() {
      const days = Object.keys(counts)
      const first = days.length ? Number(days[0].slice(0, 4)) : this.today.year()
      const list = [{ value: RECENT, label: '1 year' }]
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
    // 年を選び直したら、また新しいほうから見せる
    selected: function() {
      this.$nextTick(this.scrollToEnd)
    },
    // 畳んでいる間は測れない（高さが 0）ので、開いたときに測り直す
    collapsed: function(value) {
      if(!value) this.$nextTick(this.measureYears)
    }
  },
  mounted: function() {
    this.scrollToEnd()
    this.measureYears()
    window.addEventListener('resize', this.measureYears)
  },
  beforeUnmount: function() {
    window.removeEventListener('resize', this.measureYears)
  },
  methods: {
    // 年の並びが、どちらの端まで来ているか。縦にも横にも並ぶので
    // （狭い画面では下に落ちる）、両方の向きを見る
    measureYears: function() {
      const years = this.$refs.years
      if(!years) return
      const vertical = years.scrollHeight > years.clientHeight
      const position = vertical ? years.scrollTop : years.scrollLeft
      const size = vertical ? years.clientHeight : years.clientWidth
      const total = vertical ? years.scrollHeight : years.scrollWidth
      this.yearsAtStart = position <= 1
      this.yearsAtEnd = position + size >= total - 1
    },
    // 開いたときに見せたいのは新しいほう
    scrollToEnd: function() {
      const scroll = this.$refs.scroll
      if(scroll) scroll.scrollLeft = scroll.scrollWidth
    }
  }
}
</script>
