<template>
  <!-- /episodes の頭に置く、日ごとの更新の濃淡。番組ごとに出すと更新の催促に
       見えてしまうので、全体をまとめた1枚だけにしている -->
  <div class="heatmap" :class="{ 'is-collapsed': collapsed }" :style="{ '--weeks': weeks.length }">
    <!-- 上に貼り付いているので、要らないときは畳んで並びに場所を譲れる。
         矢印だけでなく、見出しの行のどこを押しても開け閉めできる。
         この行だけは幅で止めず、画面の端まで使う（矢印を右端に置くため） -->
    <div class="head" @click="collapsed = !collapsed">
      <!-- 見出しは動かさない。どの範囲を見ているかは隣の話数（totalLabel）が
           言う。見出しに入れると、選び直すたびに見出しが変わってしまう -->
      <h2 class="period">Episodes</h2>
      <!-- 押したときの動きは行が持っているので、ここでは受けない。
           初めは畳んであるので、矢印ではなく濃淡そのものの形を出す
           （何が開くのかが分かる）。開いている間は色を付ける -->
      <button class="fold" type="button" :title="collapsed ? '濃淡を開く' : '濃淡を畳む'" :aria-label="collapsed ? '濃淡を開く' : '濃淡を畳む'" :aria-expanded="!collapsed">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="2" y="4" width="5" height="5" rx="1.2" opacity="0.45" />
          <rect x="9.5" y="4" width="5" height="5" rx="1.2" opacity="0.75" />
          <rect x="17" y="4" width="5" height="5" rx="1.2" opacity="0.3" />
          <rect x="2" y="11.5" width="5" height="5" rx="1.2" />
          <rect x="9.5" y="11.5" width="5" height="5" rx="1.2" opacity="0.3" />
          <rect x="17" y="11.5" width="5" height="5" rx="1.2" opacity="0.6" />
          <rect x="2" y="19" width="5" height="5" rx="1.2" opacity="0.3" />
          <rect x="9.5" y="19" width="5" height="5" rx="1.2" opacity="0.55" />
          <rect x="17" y="19" width="5" height="5" rx="1.2" opacity="0.85" />
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
          <!-- 話数は、どの範囲のものかが分かる場所に置く。見出しに入れると
               期間を選び直すたびに見出しが変わる。
               狭い画面ではプルダウンの隣、広い画面では（プルダウンが
               消えるので）濃淡の左上に出る -->
          <div class="period-row">
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
            <span class="total">{{ totalLabel }}</span>
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
                        :class="[`level-${cell.level}`, { 'is-blank': cell.future || cell.outside, 'is-listed': cell.listed, 'is-current': cell.key === current }]"
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
    /* 下の線を端まで引くため、上と左右の余白はここで持つ。
       上は About（.root の padding）と同じ 20px */
    padding-top: 20px;
    margin-left: -20px;
    margin-right: -20px;
    padding-left: 20px;
    padding-right: 20px;
    /* 見出しと濃淡のあいだに線は引かない。右端の矢印とのあいだが詰まって、
       アイコンに下線が付いているように見えるため。区画の切れ目は余白で示す */
    padding-bottom: 10px;
    margin-bottom: 20px;
    transition: margin-bottom 0.22s, padding-bottom 0.22s, opacity 0.2s;
    /* このページの見出し。About の h2 と同じ大きさ・太さにしてある
       （大きさは assets/common.css の --heading-size。狭い画面で
       小さくなるのも、サイトの他の見出しと揃う） */
    .period {
      flex: none;
      margin: 0;
      color: #444;
      font-size: var(--heading-size);
      font-weight: bold;
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
        transition: color 0.22s;
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
    /* 濃淡が無くなるので、見出しの下の余白はここで持つ（上の
       padding-top と同じ 20px にして、帯の上下を揃える）。
       親（pages/episodes.vue の .heatmap）の padding で空けると、
       そのぶんが押せない帯になってしまうため、押せるこちらに寄せる */
    .head {
      padding-bottom: 20px;
      margin-bottom: 0;
    }
  }
  /* 開いている間は色を付けて、いま出ていることを示す
     （矢印ではないので、向きでは表せない） */
  &:not(.is-collapsed) .fold {
    color: #7f00ff;
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
    /* いま一覧の先頭に見えている日。スクロールに合わせて動くので、
       濃淡の段（紫の濃さ）と取り違えないよう、色ではなく縁で示す。
       隣のセルに重なるので、前に出しておく */
    &.is-current {
      position: relative;
      z-index: 1;
      box-shadow: 0 0 0 1px #fff, 0 0 0 3px var(--brand-base);
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
  /* 期間の選択と話数の行。狭い画面ではプルダウンの隣、広い画面では
     プルダウンが消えるので話数だけが濃淡の左上に残る */
  .period-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .total {
    flex: none;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
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
  /* 押せるのは行ごとなので、行ごと薄くする。矢印だけを変えると、
     そこだけが押せるように見えてしまう。
     色を敷くと、画面の幅いっぱいに帯が出て見出しの区画が変わって見えた
     （下の線まで含めて別物になる）ので、濃さだけを変える */
  .heatmap .head:hover {
    opacity: 0.6;
  }
  .heatmap .years-select select:hover {
    background-color: #e0e0e0;
  }
  /* 押せる日は、触れると輪郭を出して分かるようにする。
     地の色に埋もれないよう、内側を白で1本抜いてから縁を引く */
  .heatmap .cell.is-listed:hover {
    box-shadow: 0 0 0 1px #fff, 0 0 0 3px rgba(27, 31, 36, 0.55);
    position: relative;
    z-index: 1;
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
  props: {
    // いま一覧の先頭に見えている日（YYYY-MM-DD）。スクロールに合わせて
    // pages/episodes.vue が渡してくる
    current: {
      type: String,
      default: ''
    }
  },
  emits: ['pick'],
  data: function() {
    return {
      // 'recent' か西暦4桁
      selected: RECENT,
      // 濃淡を畳んでいるか。**初めは畳んでおく**。開くと画面の上半分を
      // 占めるので、まず一覧が見えるほうがよい
      collapsed: true,
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
    // 見出しは「Episodes」で固定なので、どの範囲の話数なのかはここで言う
    totalLabel: function() {
      const where = this.selected === RECENT ? 'in the last year' : `in ${this.selected}`
      return `${this.total.toLocaleString('en')} episodes ${where}`
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
    // 畳んでいる間は測れない（高さが 0）ので、開いたときに測り直す。
    // 初めは畳んであるので、新しいほうへ寄せるのもここで行う
    collapsed: function(value) {
      if(value) return
      this.$nextTick(() => {
        this.scrollToEnd()
        this.measureYears()
      })
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
