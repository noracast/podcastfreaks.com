<template lang="pug">
.episode(:class="{ 'is-active': isActive }")
  button.play(@click="toggle" :title="playing ? '一時停止' : '再生'" :aria-label="playing ? '一時停止' : '再生'")
    svg(viewBox="0 0 24 24" width="18" height="18" aria-hidden="true")
      g(v-if="playing" fill="currentColor")
        rect(x="6" y="5" width="4" height="14" rx="1")
        rect(x="14" y="5" width="4" height="14" rx="1")
      path(v-else fill="currentColor" d="M8 5.5v13l11-6.5z")

  //- タイトルの箱がそのままシークバー。背景の伸びが再生位置を表す
  .seek(
    ref="seek"
    role="slider"
    :aria-label="`${episode.title} の再生位置`"
    :aria-valuemin="0"
    :aria-valuemax="Math.round(duration)"
    :aria-valuenow="Math.round(currentTime)"
    :aria-valuetext="`${formattedCurrent} / ${formattedDuration}`"
    tabindex="0"
    @pointerdown="onPointerDown"
    @keydown="onKeydown"
  )
    .progress(:style="{ width: progressPercent }")
    span.text {{ episode.title }}

  .controls
    button(@click="toStart" title="先頭に戻る" aria-label="先頭に戻る")
      svg(viewBox="0 0 24 24" width="14" height="14" aria-hidden="true")
        g(fill="currentColor")
          rect(x="5" y="6" width="2.5" height="12" rx="1")
          path(d="M19 6.5v11L9.5 12z")
    button.sec(@click="skip(-10)" title="10秒もどす" aria-label="10秒もどす") −10
    button.sec(@click="skip(10)" title="10秒すすめる" aria-label="10秒すすめる") +10
    button(@click="stop" title="停止" aria-label="停止")
      svg(viewBox="0 0 24 24" width="14" height="14" aria-hidden="true")
        rect(x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor")
    button.rate(@click="cycleRate" :title="`再生速度 ${rate}倍（押すと切り替え）`" :aria-label="`再生速度 ${rate}倍`") {{ rate }}×
    a-blank.open(:href="episode.link" title="エピソードのページを開く" aria-label="エピソードのページを開く")
      svg(viewBox="0 0 24 24" width="14" height="14" aria-hidden="true")
        g(fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round")
          path(d="M14 5h5v5")
          path(d="M19 5l-8 8")
          path(d="M18 14.5V18a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H10")

  .time
    span.now {{ formattedCurrent }}
    span.total
      span.sep /
      | {{ formattedDuration }}
</template>

<style lang="sass" scoped>
@use 'sass:color'

$accent: #7f00ff

.episode
  height: 60px
  display: flex
  align-items: stretch
  border-bottom: 1px solid #333

  .play
    flex: none
    width: 60px
    border: 0
    padding: 0
    // レイアウトのグローバルな button の指定（角丸・余白・最小幅）を打ち消す
    border-radius: 0
    min-width: 0
    cursor: pointer
    color: white
    background-color: $accent
    display: flex
    justify-content: center
    align-items: center
    &:hover
      background-color: color.adjust($accent, $lightness: 10%)
    &:active
      background-color: color.adjust($accent, $lightness: 20%)

  // タイトルの箱ぜんぶがシークバー。押した位置へ飛び、そのまま動かすと
  // つまみを持っているように追従する
  .seek
    flex: 1
    min-width: 0
    position: relative
    display: flex
    align-items: center
    padding: 0 20px
    cursor: pointer
    overflow: hidden
    touch-action: none
    &:focus-visible
      outline: 1px solid $accent
      outline-offset: -1px
    .progress
      position: absolute
      left: 0
      top: 0
      bottom: 0
      width: 0
      background-color: rgba(127, 0, 255, 0.35)
      // つまみを動かしている最中は追従を優先し、なめらかさは求めない
      pointer-events: none
    .text
      position: relative
      color: #aaa
      overflow: hidden
      white-space: nowrap
      text-overflow: ellipsis

  .time
    flex: none
    display: flex
    align-items: center
    padding: 0 10px 0 8px
    color: #777
    font-size: 11px
    // 数字の幅を揃えて、再生中に左右へ揺れないようにする
    font-variant-numeric: tabular-nums
    white-space: nowrap
    .sep
      padding: 0 3px

  // 再生していないうちは出さない。場所は空けたままにして、
  // 押した瞬間に行の中身がずれないようにする
  .controls
    flex: none
    display: flex
    align-items: center
    opacity: 0
    pointer-events: none
    transition: opacity 0.2s
    >*
      background: none
      border: 0
      padding: 0
      border-radius: 0
      min-width: 0
      margin-left: 6px
      width: 24px
      height: 24px
      display: flex
      align-items: center
      justify-content: center
      color: #888
      font-size: 11px
      cursor: pointer
      &:hover
        color: #fff
    >.sec,
    >.rate
      width: 28px
      font-variant-numeric: tabular-nums

  &.is-active .controls
    opacity: 1
    pointer-events: auto

// 狭い画面ではタイトルの幅が残らないので、時間と操作ボタンを詰める。
// 全体の長さは再生前にも出ているので、再生中は今の位置だけで足りる
@media (max-width: 810px)
  .episode
    .time
      padding: 0 6px 0 4px
      .total
        display: none
    .controls
      >*
        margin-left: 2px
        width: 22px
      >.sec,
      >.rate
        width: 26px
  .episode:not(.is-active)
    .time .total
      display: inline
</style>

<script>
// 再生速度の候補。押すたびに次へ送る
const RATES = [1, 1.25, 1.5, 2]

// 1つのエピソードに複数の enclosure を並べるフィードがあり、その場合
// xml2js は配列を返す（scripts/pf-util.js の enclosureUrls と同じ事情）
const audioUrl = (episode) => {
  const list = episode && episode.enclosure
  const enclosures = list == null ? [] : (Array.isArray(list) ? list : [list])
  for(const enclosure of enclosures) {
    const url = enclosure && enclosure.$ && enclosure.$.url
    if(url) return url
  }
  return null
}

const formatTime = (seconds) => {
  if(!isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export default {
  props: {
    episode: {
      required: true,
      type: Object
    }
  },
  data: function() {
    return {
      player: null,
      playing: false,
      currentTime: 0,
      duration: NaN,
      rate: 1
    }
  },
  computed: {
    // 再生中か、途中で止めてあるとき。操作ボタンはこのときだけ出す
    isActive: function() {
      return this.playing || this.currentTime > 0
    },
    progressPercent: function() {
      if(!this.duration) return '0%'
      return `${Math.min(100, (this.currentTime / this.duration) * 100)}%`
    },
    formattedCurrent: function() {
      return formatTime(this.currentTime)
    },
    formattedDuration: function() {
      return formatTime(this.duration)
    }
  },
  mounted: function() {
    const url = audioUrl(this.episode)
    if(!url) return
    this.player = new Audio(url)
    // 長さだけ先に読む。音声そのものは再生するまで取りに行かない
    this.player.preload = 'metadata'
    this.player.addEventListener('loadedmetadata', this.onLoadedMetadata)
    this.player.addEventListener('timeupdate', this.onTimeUpdate)
    this.player.addEventListener('play', this.onPlay)
    this.player.addEventListener('pause', this.onPause)
    this.player.addEventListener('ended', this.onEnded)
  },
  beforeDestroy: function() {
    if(!this.player) return
    this.player.pause()
    this.player.removeEventListener('loadedmetadata', this.onLoadedMetadata)
    this.player.removeEventListener('timeupdate', this.onTimeUpdate)
    this.player.removeEventListener('play', this.onPlay)
    this.player.removeEventListener('pause', this.onPause)
    this.player.removeEventListener('ended', this.onEnded)
    this.releasePointer()
  },
  methods: {
    onLoadedMetadata: function() {
      this.duration = this.player.duration
    },
    onTimeUpdate: function() {
      this.currentTime = this.player.currentTime
    },
    onPlay: function() {
      this.playing = true
    },
    onPause: function() {
      this.playing = false
    },
    onEnded: function() {
      this.playing = false
      this.currentTime = 0
      this.player.currentTime = 0
    },

    // 一覧側が「他のエピソードを止める」ために呼ぶ
    stop: function() {
      if(!this.player) return
      this.player.pause()
      this.player.currentTime = 0
      this.currentTime = 0
    },
    toggle: function() {
      if(!this.player) return
      if(this.player.paused) {
        this.player.play()
        // 同時に鳴らないよう、他に鳴っているものを止めてもらう
        this.$emit('play', this)
      }
      else {
        this.player.pause()
      }
    },
    toStart: function() {
      this.seekTo(0)
    },
    skip: function(seconds) {
      this.seekTo(this.currentTime + seconds)
    },
    cycleRate: function() {
      this.rate = RATES[(RATES.indexOf(this.rate) + 1) % RATES.length]
      if(this.player) this.player.playbackRate = this.rate
    },
    seekTo: function(seconds) {
      if(!this.player) return
      const max = isFinite(this.duration) ? this.duration : Infinity
      const time = Math.max(0, Math.min(seconds, max))
      this.player.currentTime = time
      this.currentTime = time
    },

    // シークバーの操作。押した位置へ飛び、離すまで指（カーソル）に追従する
    seekToPointer: function(event) {
      const rect = this.$refs.seek.getBoundingClientRect()
      if(!rect.width || !isFinite(this.duration)) return
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      this.seekTo(this.duration * ratio)
    },
    onPointerDown: function(event) {
      if(!this.player) return
      this.seekToPointer(event)
      this.$refs.seek.addEventListener('pointermove', this.seekToPointer)
      this.$refs.seek.addEventListener('pointerup', this.releasePointer)
      this.$refs.seek.addEventListener('pointercancel', this.releasePointer)
      // 要素の外へ出ても追従させる
      if(this.$refs.seek.setPointerCapture) this.$refs.seek.setPointerCapture(event.pointerId)
    },
    releasePointer: function() {
      if(!this.$refs.seek) return
      this.$refs.seek.removeEventListener('pointermove', this.seekToPointer)
      this.$refs.seek.removeEventListener('pointerup', this.releasePointer)
      this.$refs.seek.removeEventListener('pointercancel', this.releasePointer)
    },
    onKeydown: function(event) {
      const step = { ArrowLeft: -10, ArrowRight: 10, ArrowDown: -10, ArrowUp: 10 }[event.key]
      if(step) {
        this.skip(step)
        event.preventDefault()
        return
      }
      if(event.key === 'Home') {
        this.toStart()
        event.preventDefault()
      }
      if(event.key === ' ' || event.key === 'Enter') {
        this.toggle()
        event.preventDefault()
      }
    }
  }
}
</script>
