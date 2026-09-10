<template lang="pug">
.episode(:class="{ 'is-active': isActive, 'is-playing': playing }")
  button.play(@click="toggle" :title="playing ? '一時停止' : '再生'" :aria-label="playing ? '一時停止' : '再生'")
    svg(viewBox="0 0 24 24" width="18" height="18" aria-hidden="true")
      g(v-if="playing" fill="currentColor")
        rect(x="6" y="5" width="4" height="14" rx="1")
        rect(x="14" y="5" width="4" height="14" rx="1")
      path(v-else fill="currentColor" d="M8 5.5v13l11-6.5z")

  //- 再生ボタンより右がまるごとシークバー。背景の伸びが再生位置を表す。
  //- 操作ボタンもこの中に置き、押されたときはシークしない
  .track(
    ref="track"
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
      //- 掛け算記号（×）は数字より高い位置に描かれ、浮いて見える。
      //- 小文字の x はベースラインに乗るので、数字と下が揃う
      button.rate(@click="cycleRate" :title="`再生速度 ${rate}倍（押すと切り替え）`" :aria-label="`再生速度 ${rate}倍`") {{ rate }}x
      a-blank.open(:href="episode.link" title="エピソードのページを開く" aria-label="エピソードのページを開く")
        svg(viewBox="0 0 24 24" width="14" height="14" aria-hidden="true")
          g(fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round")
            path(d="M14 5h5v5")
            path(d="M19 5l-8 8")
            path(d="M18 14.5V18a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V8a1.5 1.5 0 0 1 1.5-1.5H10")

    //- 操作していないうちは長さだけ出す。タイトルに幅を譲る
    .time
      template(v-if="isActive")
        span.now {{ formattedCurrent }}
        span.total
          span.sep /
          | {{ formattedDuration }}
      template(v-else) {{ formattedDuration }}
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
    // シークバーの上に載っているが、これは押すボタン
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

  // 再生ボタンより右がまるごとシークバー。押した位置へ飛び、
  // そのまま動かすとつまみを持っているように追従する
  .track
    flex: 1
    min-width: 0
    position: relative
    display: flex
    align-items: center
    padding-left: 20px
    // 左右に動かして位置を変えられることを、カーソルの形で示す
    cursor: col-resize
    overflow: hidden
    // 縦に動かしたときはスクロールさせ、横だけこちらで受け取る
    touch-action: pan-y
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
      pointer-events: none
    // 背景の伸びより手前に置く
    >*
      position: relative
    .text
      flex: 1
      min-width: 0
      color: #aaa
      overflow: hidden
      white-space: nowrap
      text-overflow: ellipsis
      transition: color 0.2s

    .time
      flex: none
      display: flex
      align-items: center
      padding: 0 20px 0 8px
      color: #777
      font-size: 11px
      // 数字の幅を揃えて、再生中に左右へ揺れないようにする
      font-variant-numeric: tabular-nums
      white-space: nowrap
      .sep
        padding: 0 3px

    // 再生していないうちは場所ごと空ける。
    // 操作が出ていないときは、その幅をタイトルに使いたい
    .controls
      flex: none
      display: none
      align-items: center
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
        // シーク操作ではなくボタンとして押せることを示す
        cursor: pointer
        &:hover
          color: #fff
      >.sec,
      >.rate
        width: 28px
        font-variant-numeric: tabular-nums

  &.is-active
    .track .controls
      display: flex

  // 今鳴っている回がどれか、並びの中で見て分かるようにする。
  // 止めているものは明るくしない（シークしただけの回まで光ってしまう）
  &.is-playing
    .track .text
      color: #fff

// 狭い画面ではタイトルの幅が残らないので、時間と操作ボタンを詰める。
// 全体の長さは再生前にも出ているので、再生中は今の位置だけで足りる
@media (max-width: 810px)
  .episode
    .track
      padding-left: 10px
      .time
        padding: 0 10px 0 4px
        .total
          display: none
      .controls
        >*
          margin-left: 2px
          width: 22px
        >.sec,
        >.rate
          width: 26px
</style>

<script>
// 再生速度の候補。押すたびに次へ送る
const RATES = [1, 1.25, 1.5, 2]

// 指で横へこれだけ動かしたら、スクロールではなくシークとみなす
const SEEK_DRAG_THRESHOLD = 8
// これ未満の動きで離したら、その場を叩いたとみなす
const TAP_SLOP = 8

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
      // 再生前はフィードに書かれている長さを使う。
      // 実際に読み込めたら、そちらの値で置き換える
      duration: this.episode.duration == null ? NaN : this.episode.duration,
      rate: 1
    }
  },
  created: function() {
    // 操作中の指（カーソル）の情報。見た目に関わらないので data には持たせない
    this.pointer = null
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
    // 音声は押されるまで用意しない。
    // 1000話を超える番組があり、行を開いた時点で全部を読みに行くと
    // それだけで大量の通信が走ってしまう。
    // 長さはフィードの値で先に出しているので、これで困らない。
    //
    // URL はフィードの enclosure をそのまま使う。中継もキャッシュもしない。
    // 配信元のログにリスナーの IP と UA が残る形を保つことで、ここでの再生が
    // そのまま各番組の統計になる（CLAUDE.md「音声の再生」）
    preparePlayer: function() {
      if(this.player) return this.player
      if(!this.episode.url) return null
      this.player = new Audio(this.episode.url)
      this.player.playbackRate = this.rate
      this.player.addEventListener('loadedmetadata', this.onLoadedMetadata)
      this.player.addEventListener('timeupdate', this.onTimeUpdate)
      this.player.addEventListener('play', this.onPlay)
      this.player.addEventListener('pause', this.onPause)
      this.player.addEventListener('ended', this.onEnded)
      return this.player
    },
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

    // 一覧側が「他のエピソードを止める」ために呼ぶ。
    // 画面には停止ボタンは置いていない（先頭に戻して一時停止すれば足りる）
    stop: function() {
      if(!this.player) return
      this.player.pause()
      this.player.currentTime = 0
      this.currentTime = 0
    },
    toggle: function() {
      if(!this.preparePlayer()) return
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
      if(!this.preparePlayer()) return
      const max = isFinite(this.duration) ? this.duration : Infinity
      const time = Math.max(0, Math.min(seconds, max))
      this.player.currentTime = time
      this.currentTime = time
    },

    // シークバーの操作。
    //
    // 指の場合は、触れた時点では動かさない。子行を開いた状態で下へ
    // スクロールしようとしただけで再生位置が飛んでしまうため。
    // 横に動かし始めたときと、その場で軽く叩いたときだけ位置を変える。
    // 縦に動かしたときはブラウザに任せる（touch-action: pan-y）
    seekToPointer: function(event) {
      const rect = this.$refs.track.getBoundingClientRect()
      if(!rect.width || !isFinite(this.duration)) return
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      this.seekTo(this.duration * ratio)
    },
    onPointerDown: function(event) {
      if(!this.preparePlayer()) return
      // 操作ボタンはシークバーの上に載っている。押されたのがボタンなら
      // そちらの操作なので、再生位置は動かさない
      if(event.target.closest && event.target.closest('.controls')) return

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
      } catch(e) {
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
