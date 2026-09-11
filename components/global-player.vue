<template>
  <!-- 右下に浮かべる。エピソードを選ぶまでは出さない -->
  <div v-if="episode" class="global-player" :class="{ 'is-playing': playing, 'is-minimized': minimized }">
    <!-- 上端のつまみ。押すと本体が画面の下へ逃げ、この行だけが残る。
         隠れている間は、何が鳴っているか分かるように題名も出す -->
    <button
      class="tab"
      :title="minimized ? '元に戻す' : '下に隠す'"
      :aria-label="minimized ? '元に戻す' : '下に隠す'"
      @click="toggleMinimized"
    >
      <span class="state" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <g v-if="playing" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </g>
          <path v-else fill="currentColor" d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
      <span class="label">{{ episode.title }}</span>
      <svg class="arrow" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="head">
      <!-- 36px で出したいが、用意してある画像は -60 と -120 の2枚だけなので、
           読む方は 30（= -60）を指定する -->
      <cover v-if="episode.key" class="cover" :channel="episode.key" :size="36" :image-size="30" />
      <div class="names">
        <!-- 番組名と配信日、その下に題名。右端を揃えたいので行ごとに分ける -->
        <div class="line">
          <button v-if="episode.key" class="channel" title="この番組の回一覧を開く" @click="goToChannel">{{ episode.channelTitle || episode.key }}</button>
          <span v-else class="channel as-text">{{ episode.channelTitle }}</span>
          <span v-if="publishedOn" class="date">{{ publishedOn }}</span>
        </div>
        <div class="line">
          <span class="title" :title="episode.title">{{ episode.title }}</span>
        </div>
      </div>
    </div>

    <div class="body">
      <button class="play" :title="playing ? '一時停止' : '再生'" :aria-label="playing ? '一時停止' : '再生'" @click="onToggle">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <g v-if="playing" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </g>
          <path v-else fill="currentColor" d="M8 5.5v13l11-6.5z" />
        </svg>
      </button>

      <!-- 再生ボタンより右がまるごとシークバー。背景の伸びが再生位置を表す -->
      <div
        ref="track"
        role="slider"
        :aria-label="`${episode.title} の再生位置`"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(duration) || 0"
        :aria-valuenow="Math.round(currentTime)"
        :aria-valuetext="`${formattedCurrent} / ${formattedDuration}`"
        tabindex="0"
        class="track"
        @pointerdown="onPointerDown"
        @keydown="onKeydown"
      >
        <div class="progress" :style="{ width: progressPercent }" />
        <div class="time">
          <span class="now">{{ formattedCurrent }}</span>
          <span class="total"><span class="sep">/</span>{{ formattedDuration }}</span>
        </div>
      </div>
    </div>

    <div class="controls">
      <div class="group">
        <button title="先頭に戻る" aria-label="先頭に戻る" @click="toStart">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <g fill="currentColor">
              <rect x="5" y="6" width="2.5" height="12" rx="1" />
              <path d="M19 6.5v11L9.5 12z" />
            </g>
          </svg>
        </button>
        <button class="sec" title="10秒もどす" aria-label="10秒もどす" @click="onSkip(-10)">−10</button>
        <button class="sec" title="10秒すすめる" aria-label="10秒すすめる" @click="onSkip(10)">+10</button>
        <!-- 掛け算記号（×）は数字より高い位置に描かれ、浮いて見える。
             小文字の x はベースラインに乗るので、数字と下が揃う -->
        <button class="rate" :title="`再生速度 ${rate}倍（押すと切り替え）`" :aria-label="`再生速度 ${rate}倍`" @click="onCycleRate">{{ rate }}x</button>
      </div>

      <!-- 聴いた順をさかのぼる／進む。その回の頭に戻る ⏮ と紛らわしいので、
           曲がった矢印にして、離れた場所へまとめて置く -->
      <div class="group">
        <button :disabled="!backAvailable" title="さっき聴いていた回に戻る" aria-label="さっき聴いていた回に戻る" @click="onBack">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <!-- 図形は y 4〜21 に収めてある。隣の箇条書き（y 5.5〜18.5）と
                 中心を揃えないと、矢印だけ下がって見える -->
            <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 4 4 9l5 5" />
              <path d="M4 9h9a6 6 0 0 1 0 12h-1" />
            </g>
          </svg>
        </button>
        <button :disabled="!forwardAvailable" title="次の回へ進む" aria-label="次の回へ進む" @click="onForward">
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 4l5 5-5 5" />
              <path d="M20 9h-9a6 6 0 0 0 0 12h1" />
            </g>
          </svg>
        </button>
        <!-- 聴いたものを並べて見せる。1つ前へ戻るだけでは足りないときに使う -->
        <button
          class="drawer-toggle"
          :class="{ 'is-open': drawerOpen }"
          :disabled="history.length < 2"
          :aria-expanded="drawerOpen ? 'true' : 'false'"
          :title="drawerOpen ? '聴いたものを隠す' : `聴いたものを見る（${history.length}件）`"
          :aria-label="drawerOpen ? '聴いたものを隠す' : '聴いたものを見る'"
          @click="drawerOpen = !drawerOpen"
        >
          <!-- 箇条書き。上端のつまみ（矢印）と見分けが付くようにしている。
               線が細いぶん小さく見えるので、他より少しだけ大きく描く -->
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <g fill="currentColor">
              <circle cx="5" cy="7" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="5" cy="17" r="1.5" />
            </g>
            <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M10 7h9" />
              <path d="M10 12h9" />
              <path d="M10 17h9" />
            </g>
          </svg>
        </button>
      </div>
    </div>

    <!-- 聴いたもの。新しいものが上。押すとその回に戻る。
         開け閉めを滑らかにするため、閉じている間も置いたままにして
         高さだけを 0 にする -->
    <div v-if="history.length > 1" class="drawer" :class="{ 'is-open': drawerOpen }">
      <div class="inner">
        <ul>
          <li v-for="entry in historyNewestFirst" :key="entry.index">
            <button :class="{ 'is-current': entry.index === historyIndex }" :title="entry.title" :tabindex="drawerOpen ? null : -1" @click="onPlayAt(entry.index)">
              <cover v-if="entry.key" class="cover" :channel="entry.key" :size="36" :image-size="30" />
              <span v-else class="cover no-image" />
              <span class="names">
                <span class="channel">{{ entry.channelTitle || entry.key || '' }}</span>
                <span class="title">{{ entry.title }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.global-player {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  width: 456px;
  max-width: calc(100vw - 40px);
  /* 下の余白は .controls が持つ。ここに持たせると、下端まで伸ばしたい
     ドロワーが打ち消し（負のマージン）を必要とし、閉じているときまで
     余白が消えてしまう */
  /* 上の余白は .tab が持つ。つまみを上端いっぱいの帯にしたいので */
  padding: 0 17px;
  border-radius: 12px;
  /* 畳むときに下へ滑らせる。触れている間は濃くする（下の :hover） */
  transition: transform 0.28s ease-out, background-color 0.2s;
  /* ぶら下げた一覧が角からはみ出さないようにする */
  overflow: hidden;
  /* 後ろの一覧が少し透けてぼける。重なっていることが分かる程度に留める
     （透かしすぎると白い文字が読みにくい）。彩度を上げているのは、
     ぼかすと色が平均化されて灰色に寄るため */
  background-color: rgba(34, 34, 34, 0.86);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  backdrop-filter: blur(18px) saturate(180%);
  /* 触れている間は濃くする。読むとき・操作するときは、後ろが透けるより
     はっきり見えた方がよい */
  &:hover {
    background-color: rgba(26, 26, 26, 0.97);
  }
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  color: #ccc;
  font-size: 14px;

  /* 畳んだ状態。本体を画面の下へ逃がして、つまみの行だけ残す。
     bottom: 20px のぶんも下げて、画面の下端に貼り付ける
     （つまみの高さ32px − 20px = 12px を 100% から引く） */
  &.is-minimized {
    /* 幅はそのまま。右下には余裕があるので縮める必要がなく、
       隠れている間も題名が読める */
    transform: translateY(calc(100% - 12px));
    .tab {
      >.state, >.label {
        display: flex;
      }
      >.arrow {
        transform: rotate(180deg);
      }
    }
  }

  /* 上端のつまみ。押すと畳む／戻す。
     カードの左右の余白を打ち消して、端まで届く帯にする */
  .tab {
    /* レイアウトのグローバルな button の指定を打ち消す */
    border: 0;
    border-radius: 0;
    min-width: 0;
    background: none;
    color: #777;
    font: inherit;
    margin: 0 -17px;
    width: calc(100% + 34px);
    height: 32px;
    padding: 0 14px 0 17px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    /* 背景は変えない。不透明な色を敷くと、そこだけ後ろが透けなくなって
       別の板が載っているように見える */
    &:hover {
      color: #ccc;
    }
    /* 開いているうちは矢印だけ。何が鳴っているかは本体に出ている */
    >.state, >.label {
      display: none;
    }
    >.state {
      flex: none;
      align-items: center;
      color: #ccc;
    }
    >.label {
      flex: 1;
      min-width: 0;
      color: #ccc;
      font-size: 12px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    >.arrow {
      flex: none;
      margin-left: auto;
      transition: transform 0.25s;
    }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    /* つまみのぶん上が詰まるので、少しだけ空ける */
    margin-top: 2px;
    .cover {
      flex: none;
      border-radius: 5px;
      overflow: hidden;
    }
    /* 番組名とタイトルを縦に積む。どちらも1行に省略する */
    .names {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
      /* 日付とリンクを右端に置く。長い題名に押し出されないよう
         flex: none にし、縮むのは左側だけにする */
      >.line {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .date {
        flex: none;
        color: #777;
        font-size: 12px;
        /* 数字の幅を揃える */
        font-variant-numeric: tabular-nums;
      }
      .channel {
        /* レイアウトのグローバルな button の指定を打ち消す */
        border: 0;
        border-radius: 0;
        min-width: 0;
        padding: 0;
        background: none;
        /* 残りの幅を埋めて、日付を行の右端へ押しやる。
           長い番組名はここで省略する */
        flex: 1;
        min-width: 0;
        color: #aaa;
        font-size: 13px;
        font-weight: bold;
        text-align: left;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        &:hover {
          color: #fff;
          text-decoration: underline;
        }
        /* 番組が特定できないとき（/new から鳴らして key が無い場合）は
           押せないので、リンクに見せない */
        &.as-text {
          cursor: default;
          &:hover {
            color: #aaa;
            text-decoration: none;
          }
        }
      }
      .title {
        flex: 1;
        min-width: 0;
        color: #eee;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }

  .body {
    display: flex;
    align-items: stretch;
    height: 38px;
    margin-top: 12px;
    .play {
      flex: none;
      width: 48px;
      border: 0;
      padding: 0;
      /* レイアウトのグローバルな button の指定（角丸・余白・最小幅）を打ち消す */
      border-radius: 5px 0 0 5px;
      min-width: 0;
      cursor: pointer;
      color: white;
      background-color: #7f00ff;
      display: flex;
      justify-content: center;
      align-items: center;
      &:hover {
        background-color: #9933ff;
      }
      &:active {
        background-color: #b266ff;
      }
    }
    /* 再生ボタンより右がまるごとシークバー。押した位置へ飛び、
       そのまま動かすとつまみを持っているように追従する */
    .track {
      flex: 1;
      min-width: 0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      border-radius: 0 5px 5px 0;
      /* 後ろのグラデーションを透かす。不透明な帯だと、そこだけ
         別の板が載っているように見えるため */
      background-color: rgba(255, 255, 255, 0.08);
      /* 左右に動かして位置を変えられることを、カーソルの形で示す */
      cursor: col-resize;
      overflow: hidden;
      /* 縦に動かしたときはスクロールさせ、横だけこちらで受け取る */
      touch-action: pan-y;
      &:focus-visible {
        outline: 1px solid #7f00ff;
        outline-offset: -1px;
      }
      .progress {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0;
        /* 溝より明るく、けれど後ろは透ける程度に */
        background-color: rgba(255, 255, 255, 0.2);
        pointer-events: none;
      }
      .time {
        /* 背景の伸びより手前に置く */
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        padding: 0 12px;
        color: #aaa;
        font-size: 13px;
        /* 数字の幅を揃えて、再生中に左右へ揺れないようにする */
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        .sep {
          padding: 0 4px;
        }
      }
    }
  }

  .controls {
    display: flex;
    align-items: center;
    /* 再生位置の操作は左、聴いた順の行き来は右。役割が違うので離して置く */
    justify-content: space-between;
    margin: 7px 0 12px;
    .group {
      display: flex;
      align-items: center;
      >* {
        /* レイアウトのグローバルな button の指定を打ち消す */
        background: none;
        border: 0;
        padding: 0;
        border-radius: 0;
        min-width: 0;
        width: 29px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
        font-size: 13px;
        cursor: pointer;
        &:not(:first-child) {
          margin-left: 7px;
        }
        &:hover {
          color: #fff;
        }
      }
      >.sec, >.rate {
        width: 34px;
        font-variant-numeric: tabular-nums;
      }
      /* 開いている間は色で示す。上端のつまみと違って裏返さない
         （箇条書きは回しても意味が変わらない） */
      >.drawer-toggle {
        transition: color 0.2s;
        /* 隣の矢印は半円を描くぶん縦に長く、図形の重心が下にある。
           数値上の中心を揃えても箇条書きの方が上に見えるので、少し下げる */
        svg {
          transform: translateY(1px);
        }
      }
      >.drawer-toggle.is-open {
        color: #fff;
      }
      /* 端まで来たら押せないことを見せる */
      >button:disabled {
        color: #555;
        cursor: default;
        &:hover {
          color: #555;
        }
      }
    }
  }
  /* 聴いたもの。プレーヤーの下にぶら下げる。
     多くなっても画面を埋めないよう、高さを決めて中でスクロールさせる */
  /* 閉じている間も置いたままにして、高さだけを動かす。
     grid の行を 0fr と 1fr のあいだで動かすと、中身の量を測らずに
     実際の高さへ向かって伸ばせる（max-height でやると、中身が上限より
     短いときに「開ききったあと何も起きない時間」ができる） */
  .drawer {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.22s ease-out;
    margin: 0 -17px;
    &.is-open {
      grid-template-rows: 1fr;
    }
    >.inner {
      /* grid の行に従わせるために要る。既定の auto だと縮まない */
      min-height: 0;
      max-height: 216px;
      overflow-y: auto;
    }
    >.inner >ul {
      /* 余白も線も持たせない。ここに空けると1件目との間に何も無い帯が
         できて、触れたときの色もそこまで届かない。
         操作との境目は .controls の下余白で足りている */
      margin: 0;
      padding: 0;
      list-style: none;
      >li >button {
        /* レイアウトのグローバルな button の指定を打ち消す */
        border: 0;
        border-radius: 0;
        min-width: 0;
        padding: 7px 17px;
        background: none;
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
        /* 半透明にしておく。不透明な色を敷くと、そこだけ後ろが
           透けなくなって浮いて見える */
        &:hover {
          background-color: rgba(255, 255, 255, 0.07);
        }
        &:focus-visible {
          outline: 1px solid #7f00ff;
          outline-offset: -1px;
        }
        .cover {
          flex: none;
          border-radius: 5px;
          overflow: hidden;
          /* 画像を持たない番組のぶん。大きさだけ取って場所を保つ */
          &.no-image {
            width: 36px;
            height: 36px;
            background-color: #444;
          }
        }
        .names {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          .channel {
            color: #999;
            font-size: 12px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .title {
            color: #ccc;
            font-size: 14px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
        }
        /* いま鳴っている回 */
        &.is-current {
          .channel {
            color: #ccc;
          }
          .title {
            color: #fff;
            font-weight: bold;
          }
        }
      }
    }
  }
}

/* 狭い画面では左右いっぱいに敷く。角も下だけ落とす */
@media (max-width: 900px) {
  .global-player {
    right: 0;
    bottom: 0;
    left: 0;
    width: auto;
    max-width: none;
    border-radius: 10px 10px 0 0;
    /* 下端に貼り付いているぶん、広い画面より引く量が大きい
       （つまみの高さそのまま） */
    &.is-minimized {
      transform: translateY(calc(100% - 32px));
    }
  }
}
</style>

<script>
import formatTime from '@/lib/format-time'
import { jst } from '@/lib/jst'
import { player, toggle, seekTo, skip, cycleRate, requestReveal, goBack, goForward, canGoBack, canGoForward, playAt } from '@/lib/player'

// 指で横へこれだけ動かしたら、スクロールではなくシークとみなす
const SEEK_DRAG_THRESHOLD = 8
// これ未満の動きで離したら、その場を叩いたとみなす
const TAP_SLOP = 8

export default {
  data: function() {
    return {
      // 聴いたものの一覧を開いているか
      drawerOpen: false
    }
  },
  computed: {
    episode: function() { return player.episode },
    playing: function() { return player.playing },
    currentTime: function() { return player.currentTime },
    duration: function() { return player.duration },
    rate: function() { return player.rate },
    minimized: function() { return player.minimized },
    backAvailable: function() { return canGoBack() },
    forwardAvailable: function() { return canGoForward() },
    history: function() { return player.history },
    historyIndex: function() { return player.historyIndex },
    // 新しいものを上に出す。押したときに元の位置が要るので添字を持たせる
    historyNewestFirst: function() {
      return player.history.map((entry, index) => ({ ...entry, index })).reverse()
    },
    progressPercent: function() {
      if(!this.duration) return '0%'
      return `${Math.min(100, (this.currentTime / this.duration) * 100)}%`
    },
    formattedCurrent: function() { return formatTime(this.currentTime) },
    formattedDuration: function() { return formatTime(this.duration) },
    // 配信日。フィードの pubDate は RFC2822 なので、日本時間に寄せて出す
    publishedOn: function() {
      if(!this.episode || !this.episode.pubDate) return null
      return jst(this.episode.pubDate).format('YYYY.MM.DD')
    }
  },
  created: function() {
    // 操作中の指（カーソル）の情報。見た目に関わらないので data には持たせない
    this.pointer = null
  },
  mounted: function() {
    // 再生中にページを閉じようとしたら確かめる。
    // ブラウザは文言を出せないので、引き止めるかどうかだけを伝える
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeUnmount: function() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
    this.releasePointer()
  },
  methods: {
    onToggle: function() { toggle() },
    toStart: function() { seekTo(0) },
    onSkip: function(seconds) { skip(seconds) },
    onCycleRate: function() { cycleRate() },
    onBack: function() { goBack() },
    onForward: function() { goForward() },
    onPlayAt: function(index) { playAt(index) },
    toggleMinimized: function() {
      player.minimized = !player.minimized
      // 隠すときは一覧も閉じる。開いたまま隠して戻すと、いきなり出てくる
      if(player.minimized) this.drawerOpen = false
    },

    // 鳴っている回の子行を開きに行く。URL は変えない（issue #236）
    goToChannel: function() {
      requestReveal()
      if(this.$route.path !== '/') this.$router.push('/')
    },

    onBeforeUnload: function(event) {
      if(!player.playing) return
      event.preventDefault()
      // 古いブラウザはこちらを見る
      event.returnValue = ''
    },

    // シークバーの操作。
    //
    // 指の場合は、触れた時点では動かさない。プレーヤーの上で下へ
    // スクロールしようとしただけで再生位置が飛んでしまうため。
    // 横に動かし始めたときと、その場で軽く叩いたときだけ位置を変える。
    // 縦に動かしたときはブラウザに任せる（touch-action: pan-y）
    seekToPointer: function(event) {
      const rect = this.$refs.track.getBoundingClientRect()
      if(!rect.width || !isFinite(this.duration)) return
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      seekTo(this.duration * ratio)
    },
    onPointerDown: function(event) {
      // マウスは押した時点で動かして構わない。スクロールと取り合わないため
      const byMouse = event.pointerType === 'mouse'
      this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, seeking: byMouse }
      // 先に受け取る用意をしてから動かす
      this.$refs.track.addEventListener('pointermove', this.onPointerMove)
      this.$refs.track.addEventListener('pointerup', this.onPointerUp)
      this.$refs.track.addEventListener('pointercancel', this.releasePointer)
      if(byMouse) {
        this.seekToPointer(event)
        this.capturePointer(event)
      }
    },
    onPointerMove: function(event) {
      const pointer = this.pointer
      if(!pointer || event.pointerId !== pointer.id) return
      if(!pointer.seeking) {
        const dx = Math.abs(event.clientX - pointer.x)
        const dy = Math.abs(event.clientY - pointer.y)
        // 横へはっきり動いたときだけシークに入る
        if(dx < SEEK_DRAG_THRESHOLD || dx <= dy) return
        pointer.seeking = true
        this.capturePointer(event)
      }
      this.seekToPointer(event)
    },
    onPointerUp: function(event) {
      const pointer = this.pointer
      if(pointer && !pointer.seeking) {
        const dx = Math.abs(event.clientX - pointer.x)
        const dy = Math.abs(event.clientY - pointer.y)
        // ほとんど動かさずに離した＝その位置を指したとみなす
        if(dx < TAP_SLOP && dy < TAP_SLOP) this.seekToPointer(event)
      }
      this.releasePointer()
    },
    // 要素の外へ出ても追従させる
    capturePointer: function(event) {
      const track = this.$refs.track
      if(!track || !track.setPointerCapture) return
      try {
        track.setPointerCapture(event.pointerId)
      } catch {
        // 実際のポインタでないときは掴めない。追従できないだけで動作は続く
      }
    },
    releasePointer: function() {
      this.pointer = null
      if(!this.$refs.track) return
      this.$refs.track.removeEventListener('pointermove', this.onPointerMove)
      this.$refs.track.removeEventListener('pointerup', this.onPointerUp)
      this.$refs.track.removeEventListener('pointercancel', this.releasePointer)
    },
    onKeydown: function(event) {
      const step = { ArrowLeft: -10, ArrowRight: 10, ArrowDown: -10, ArrowUp: 10 }[event.key]
      if(step) {
        skip(step)
        event.preventDefault()
        return
      }
      if(event.key === 'Home') {
        seekTo(0)
        event.preventDefault()
      }
      if(event.key === ' ' || event.key === 'Enter') {
        toggle()
        event.preventDefault()
      }
    }
  }
}
</script>
