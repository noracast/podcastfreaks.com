<template>
  <!-- 右下に浮かべる。エピソードを選ぶまでは出さない -->
  <div v-if="episode" class="global-player" :class="{ 'is-playing': playing }">
    <div class="head">
      <!-- size は 30 か 60 だけ。カバー画像は -60 と -120 の2枚しか作っていない
           （scripts/pf-util.js の downloadAndResize）ので、他を渡すと 404 になる -->
      <cover v-if="episode.key" class="cover" :channel="episode.key" :size="30" />
      <div class="names">
        <button v-if="episode.key" class="channel" title="この番組の回一覧を開く" @click="goToChannel">{{ episode.channelTitle || episode.key }}</button>
        <span v-else class="channel as-text">{{ episode.channelTitle }}</span>
        <span class="title" :title="episode.title">{{ episode.title }}</span>
      </div>
      <a-blank v-if="episode.link" class="open" :href="episode.link" title="エピソードのページを開く" aria-label="エピソードのページを開く">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
          <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M14 5h5v5" />
            <path d="M19 5l-8 8" />
            <path d="M18 14.5V18a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H10" />
          </g>
        </svg>
      </a-blank>
    </div>

    <div class="body">
      <button class="play" :title="playing ? '一時停止' : '再生'" :aria-label="playing ? '一時停止' : '再生'" @click="onToggle">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
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
      <!-- 聴いた順をさかのぼる／進む。その回の頭に戻る ⏮ と紛らわしいので、
           曲がった矢印にして、離れた場所へまとめて置く -->
      <div class="group">
        <button :disabled="!backAvailable" title="さっき聴いていた回に戻る" aria-label="さっき聴いていた回に戻る" @click="onBack">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 7 4 12l5 5" />
              <path d="M4 12h9a6 6 0 0 1 0 12h-1" />
            </g>
          </svg>
        </button>
        <button :disabled="!forwardAvailable" title="次の回へ進む" aria-label="次の回へ進む" @click="onForward">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 7l5 5-5 5" />
              <path d="M20 12h-9a6 6 0 0 0 0 12h1" />
            </g>
          </svg>
        </button>
      </div>

      <div class="group">
        <button title="先頭に戻る" aria-label="先頭に戻る" @click="toStart">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
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
    </div>
  </div>
</template>

<style scoped>
.global-player {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 100;
  width: 380px;
  max-width: calc(100vw - 40px);
  padding: 12px 14px 10px;
  border-radius: 10px;
  background-color: #222;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
  color: #ccc;
  font-size: 12px;

  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    .cover {
      flex: none;
      border-radius: 4px;
      overflow: hidden;
    }
    /* 番組名とタイトルを縦に積む。どちらも1行に省略する */
    .names {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      .channel {
        /* レイアウトのグローバルな button の指定を打ち消す */
        border: 0;
        border-radius: 0;
        min-width: 0;
        padding: 0;
        background: none;
        align-self: flex-start;
        max-width: 100%;
        color: #b388ff;
        font-size: 11px;
        font-weight: bold;
        text-align: left;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        &:hover {
          color: #d0b3ff;
          text-decoration: underline;
        }
        /* 番組が特定できないとき（/new から鳴らして key が無い場合）は
           押せないので、リンクに見せない */
        &.as-text {
          cursor: default;
          &:hover {
            color: #b388ff;
            text-decoration: none;
          }
        }
      }
      .title {
        color: #eee;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
    .open {
      flex: none;
      display: flex;
      align-items: center;
      color: #888;
      &:hover {
        color: #fff;
      }
    }
  }

  .body {
    display: flex;
    align-items: stretch;
    height: 32px;
    margin-top: 10px;
    .play {
      flex: none;
      width: 40px;
      border: 0;
      padding: 0;
      /* レイアウトのグローバルな button の指定（角丸・余白・最小幅）を打ち消す */
      border-radius: 4px 0 0 4px;
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
      border-radius: 0 4px 4px 0;
      background-color: #333;
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
        background-color: rgba(127, 0, 255, 0.45);
        pointer-events: none;
      }
      .time {
        /* 背景の伸びより手前に置く */
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        padding: 0 10px;
        color: #aaa;
        font-size: 11px;
        /* 数字の幅を揃えて、再生中に左右へ揺れないようにする */
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        .sep {
          padding: 0 3px;
        }
      }
    }
  }

  .controls {
    display: flex;
    align-items: center;
    /* 聴いた順の行き来は左、再生位置の操作は右。役割が違うので離して置く */
    justify-content: space-between;
    margin-top: 6px;
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
        width: 24px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
        font-size: 11px;
        cursor: pointer;
        &:not(:first-child) {
          margin-left: 6px;
        }
        &:hover {
          color: #fff;
        }
      }
      >.sec, >.rate {
        width: 28px;
        font-variant-numeric: tabular-nums;
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
  }
}
</style>

<script>
import formatTime from '@/lib/format-time'
import { player, toggle, seekTo, skip, cycleRate, requestReveal, goBack, goForward, canGoBack, canGoForward } from '@/lib/player'

// 指で横へこれだけ動かしたら、スクロールではなくシークとみなす
const SEEK_DRAG_THRESHOLD = 8
// これ未満の動きで離したら、その場を叩いたとみなす
const TAP_SLOP = 8

export default {
  computed: {
    episode: function() { return player.episode },
    playing: function() { return player.playing },
    currentTime: function() { return player.currentTime },
    duration: function() { return player.duration },
    rate: function() { return player.rate },
    backAvailable: function() { return canGoBack() },
    forwardAvailable: function() { return canGoForward() },
    progressPercent: function() {
      if(!this.duration) return '0%'
      return `${Math.min(100, (this.currentTime / this.duration) * 100)}%`
    },
    formattedCurrent: function() { return formatTime(this.currentTime) },
    formattedDuration: function() { return formatTime(this.duration) }
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
