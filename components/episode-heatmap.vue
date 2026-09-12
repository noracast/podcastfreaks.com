<template>
  <!-- /episodes の頭に置く、日ごとの更新の濃淡。番組ごとに出すと更新の催促に
       見えてしまうので、全体をまとめた1枚だけにしている -->
  <div class="heatmap" :class="{ 'is-collapsed': collapsed }" :style="{ '--weeks': weeks.length }">
    <!-- 上に貼り付いているので、要らないときは畳んで並びに場所を譲れる。
         矢印だけでなく、見出しの行のどこを押しても開け閉めできる。
         この行だけは幅で止めず、画面の端まで使う（矢印を右端に置くため） -->
    <div class="head" @click="collapsed = !collapsed">
      <h2 class="period">{{ period }}</h2>
      <span class="total">{{ totalLabel }}</span>
      <!-- 押したときの動きは行が持っているので、ここでは受けない -->
      <button class="fold" type="button" :title="collapsed ? '開く' : '畳む'" :aria-label="collapsed ? '開く' : '畳む'" :aria-expanded="!collapsed">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <!-- 濃淡のほうは幅で止める。全幅にすると、右に何もない広い余白が
         できてしまう -->
    <div class="inner">
      <!-- 畳むときは高さを 0 にする（0fr ↔ 1fr）。中身の高さはセルの大きさで
         変わるので、決め打ちの max-height にはできない -->
      <div class="fold-wrap">
        <div class="fold-inner">
          <!-- 狭い画面では、右の並びの代わりにこちらを出す。選択肢を
               全部見せずに済む（出し分けは CSS のほうでしている） -->
          <div class="years-select">
            <select v-model="selected" aria-label="濃淡に出す期間">
              <option v-for="year in years" :key="year.value" :value="year.value">{{ year.label }}</option>
            </select>
            <!-- 素の矢印を消しているので、畳むボタンと同じ形を重ねる -->
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
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
  /* 曜日の目印のぶん。文字の幅（18px）と、濃淡との間（8px）の合計 */
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
    /* 行ごと押せる。二度押しで選択されてしまわないよう、選択は止める */
    cursor: pointer;
    user-select: none;
    /* 触れたときの色を端まで敷くため、上と左右の余白はここで持つ。
       上は About（.root の padding）と同じ 20px */
    padding-top: 20px;
    margin-left: -20px;
    margin-right: -20px;
    padding-left: 20px;
    padding-right: 20px;
    transition: background-color 0.2s;
    /* 濃淡との境目。日ごとの区切り線（#ccc）より薄くして、
       ここが区画の切れ目だと分かる程度にとどめる */
    border-bottom: 1px solid #e8e8e8;
    /* 上下で分けて、About の h2 の下の余白（0.83em）と同じ 20px にする */
    padding-bottom: 10px;
    margin-bottom: 10px;
    transition: margin-bottom 0.22s, padding-bottom 0.22s;
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
      /* レイアウトのグローバルな button の指定を打ち消す。
         背景を敷かないので、角丸も要らない */
      border: 0;
      border-radius: 0;
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
       残すと、上（帯の padding）より下だけが広くなる。
       区切る相手が無くなるので線も消す。残すと、すぐ下にある
       日ごとの区切り線と2本が並んで見えてしまう */
    .head {
      padding-bottom: 0;
      margin-bottom: 0;
      border-bottom-color: transparent;
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
    /* 濃淡の列は、その中身（週の数で決まる幅）に合わせる。1fr にすると
       余った幅まで広がり、右下に寄せた凡例だけが濃淡から離れてしまう。
       収まらないときは 0 まで縮めて、中で横に送る */
    grid-template-columns: auto minmax(0, max-content);
    grid-template-rows: auto auto;
  }
  /* 月の並びのぶんだけ下げて、セルの行と揃える */
  .weekdays {
    /* 文字の幅と、その右に空ける濃淡との間。合わせて --weekday-width */
    width: calc(var(--weekday-width) - 8px);
    padding-right: 8px;
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
    /* 曜日の目印と同じ大きさ。ここだけ大きいと、並びの中で月名が浮く */
    font-size: 9px;
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
  /* 凡例は濃淡の右下に寄せる。年を変えて濃淡の幅が変わっても、
     その右端に付いていく（列の幅を中身に合わせてあるため） */
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
      /* 濃淡の右端に文字を合わせる */
      &:last-child {
        margin-right: 0;
      }
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
  /* 年を選ぶプルダウン。狭い画面でだけ出す（広い画面では上の並びを見せる）。
     素の枠のままだと並びの中で浮くので、「元に戻す」ボタン（pages/episodes.vue
     の .back）と同じグレーの座布団に載せる */
  .years-select {
    display: none;
    position: relative;
    width: fit-content;
    color: #444;
    & select {
      appearance: none;
      /* レイアウトのグローバルな指定は button だけだが、素の枠と矢印は
         ここで消しておく */
      border: 0;
      border-radius: 4px;
      background-color: #ececec;
      color: inherit;
      font: inherit;
      font-size: 12px;
      /* 右は、重ねた矢印のぶんを空ける */
      padding: 6px 26px 6px 12px;
      cursor: pointer;
      /* 触れた瞬間に出る青い囲み（iOS・Chrome）と、タップの色を消す */
      -webkit-tap-highlight-color: transparent;
      &:focus {
        outline: none;
      }
      /* キーボードで辿ってきたときは、囲みではなく座布団の色で示す */
      &:focus-visible {
        background-color: #e0e0e0;
      }
    }
    & svg {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      /* 押したときは下の select が受ける */
      pointer-events: none;
    }
  }
}

/* 触れたときの色は、ポインタのある環境だけ（指では押したあとも残るため） */
@media (hover: hover) {
  .heatmap .years .year:not(.is-selected):hover {
    background-color: #f0e8fc;
    color: #7f00ff;
  }
  /* 押せるのは行ごとなので、行ごと薄く色を敷く。矢印だけを囲うと、
     そこだけが押せるように見えてしまう */
  .heatmap .head:hover {
    background-color: #faf6ff;
  }
  .heatmap .head:hover .fold {
    color: #7f00ff;
  }
  .heatmap .years-select select:hover {
    background-color: #e0e0e0;
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
    /* 年を置く場所が右に残らない幅。ここからはプルダウンに替える。
       濃淡の下へ横並びで落とすこともできるが、選択肢が19個あって
       横に送らないと端まで見えないので、並べては出さない */
    .body {
      padding-right: 0;
    }
    .years {
      display: none;
    }
    .years-select {
      display: block;
      margin-bottom: 10px;
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
    // 年の並びが、上下どちらの端まで来ているか。端を消すかどうかに使う
    // （狭い画面ではプルダウンに替わるので、縦だけを見ればいい）
    measureYears: function() {
      const years = this.$refs.years
      if(!years) return
      this.yearsAtStart = years.scrollTop <= 1
      this.yearsAtEnd = years.scrollTop + years.clientHeight >= years.scrollHeight - 1
    },
    // 開いたときに見せたいのは新しいほう
    scrollToEnd: function() {
      const scroll = this.$refs.scroll
      if(scroll) scroll.scrollLeft = scroll.scrollWidth
    }
  }
}
</script>
