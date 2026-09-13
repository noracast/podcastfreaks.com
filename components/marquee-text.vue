<template>
  <!-- 収まらない文字を、最後まで読めるようにする。

       同じ要素で「省略記号」と「流す」を切り替えると、切り替えの隙間で
       省略記号が文字の途中に残ったり、端末によってはぼかしが効かずに
       くっきり切れたりした。**2枚重ねて、見せる方を入れ替える**形にする。

       - 下（.scroller）… 横になぞって動かせる。ぼかしはこちらに掛ける
       - 上（.cap）    … 省略記号つきの見た目。触らせない（pointer-events: none）

       普段は上だけ見せる。動き始めたら下と入れ替え、止まってしばらく
       経ったら頭に戻して元に戻す。

       幅は呼ぶ側が決める。この要素は与えられた幅いっぱいに広がるだけで、
       自分では幅を持たない（flex の中に置くときは min-width: 0 を忘れないこと）。 -->
  <span
    class="marquee-text"
    :class="{ 'is-open': open, 'is-running': running, 'fade-head': moreBefore, 'fade-tail': moreAfter }"
    :style="running ? { '--marquee-shift': `${-distance}px`, '--marquee-duration': `${duration}s` } : null"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
  >
    <span ref="scroller" class="scroller" @scroll="onScroll" @pointerdown="onDown"><span class="inner"><slot /></span></span>
    <!-- 上に重ねる見た目。中身は下と同じなので、読み上げには渡さない -->
    <span class="cap" aria-hidden="true"><slot /></span>
  </span>
</template>

<style scoped>
.marquee-text {
  display: block;
  min-width: 0;
  position: relative;
  /* ぼかしの幅。JS 側の FADE と揃える */
  --fade: 14px;
}

/* 下。指でなぞって動かせる方 */
.scroller {
  display: block;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  /* 端まで来たときに、ページの「戻る」やページ自体の横スクロールへ
     引き継がせない */
  overscroll-behavior-x: contain;
  /* 横棒は出さない。一覧の行の中に出ると、それだけで場所を取る */
  scrollbar-width: none;
  /* 普段は隠しておく。上の .cap と同じ文字なので、入れ替わっても
     見た目は変わらない。opacity: 0 のままでも指は触れる */
  opacity: 0;
  &::-webkit-scrollbar {
    display: none;
  }
  >.inner {
    display: inline-block;
  }
}

/* 上。省略記号つきの見た目だけを受け持つ。触らせない */
.cap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}

/* 動き始めたら入れ替える */
.marquee-text.is-open, .marquee-text.is-running {
  >.scroller {
    opacity: 1;
  }
  >.cap {
    opacity: 0;
  }
}

/* ぼかすのは続きがある側だけ。両端をいつもぼかすと、端まで動かしたときに
   最後の文字が沈んで読めない */
.marquee-text.fade-head.fade-tail > .scroller {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
  mask-image: linear-gradient(to right, transparent, #000 var(--fade), #000 calc(100% - var(--fade)), transparent);
}
.marquee-text.fade-head:not(.fade-tail) > .scroller {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 var(--fade));
  mask-image: linear-gradient(to right, transparent, #000 var(--fade));
}
.marquee-text.fade-tail:not(.fade-head) > .scroller {
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - var(--fade)), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - var(--fade)), transparent);
}

/* ポインタを重ねている間は、自動で流す */
.marquee-text.is-running > .scroller > .inner {
  /* 重ねてすぐ動き出すと目が追いつかないので、少しだけ置く。
     末尾まで来たらそこで止める（forwards） */
  animation: marquee-text var(--marquee-duration) linear 0.35s forwards;
}

@keyframes marquee-text {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--marquee-shift));
  }
}
</style>

<script>
// 流す速さ。題名の長さによらず一定にしたいので、距離から時間を出す。
// 秒あたり80px（12pxの文字で6〜7文字）が、目で追える速さだった
const PX_PER_SECOND = 80

// 続きがあることを示すぼかしの幅（px）。CSS の --fade と揃える
const FADE = 14

// 動きが止まってから、頭へ戻すまでの時間。読み終えるくらいは置いておく
const RESET_DELAY = 2500

export default {
  data: function() {
    return {
      // 下（なぞれる方）を見せているか
      open: false,
      // ポインタを重ねて自動で流しているか
      running: false,
      // はみ出している幅
      shift: 0,
      // どちら側に続きがあるか。ある側だけぼかす
      moreBefore: false,
      moreAfter: false
    }
  },
  computed: {
    // 送る距離。ぼかしのぶんだけ余計に送る（ぴったりで止めると、最後の
    // 文字が右端のぼかしに隠れたままになる）
    distance: function() {
      return this.shift + FADE
    },
    // 速さは題名の長さによらず一定にしたい。**実際に送る距離**から時間を
    // 出すこと。shift だけで割ると、短いものほど速くなる（40px の題名で
    // 秒あたり108px、600px の題名で82px と、1.3倍の開きがあった）
    duration: function() {
      return Math.max(0.4, Math.round((this.distance / PX_PER_SECOND) * 10) / 10)
    }
  },
  created: function() {
    this.resetTimer = null
    this.pressing = false
  },
  beforeUnmount: function() {
    clearTimeout(this.resetTimer)
    this.releaseWindow()
  },
  methods: {
    // はみ出していなければ何もしない。幅は画面の向きや絞り込みで変わるので、
    // そのたびに測る（見張り続けるより確実で、費用も要らない）
    measure: function() {
      const el = this.$refs.scroller
      if(!el) return 0
      this.shift = Math.max(0, el.scrollWidth - el.clientWidth)
      return this.shift
    },
    // どちら側に続きがあるか。小数の丸めで1pxずれることがあるので、
    // 1px は端とみなす
    updateEdges: function() {
      const el = this.$refs.scroller
      if(!el) return
      const max = el.scrollWidth - el.clientWidth
      this.moreBefore = el.scrollLeft > 1
      this.moreAfter = el.scrollLeft < max - 1
    },
    close: function() {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
      this.open = false
      this.moreBefore = false
      this.moreAfter = false
      const el = this.$refs.scroller
      if(el) el.scrollLeft = 0
    },
    // 動きが止まってしばらく経ったら、頭に戻して元の見た目へ。
    // 指を離してすぐ戻すと、読み終える前に消える
    scheduleReset: function() {
      clearTimeout(this.resetTimer)
      this.resetTimer = setTimeout(() => {
        if(this.pressing || this.running) return
        this.close()
      }, RESET_DELAY)
    },
    releaseWindow: function() {
      if(!import.meta.client) return
      window.removeEventListener('pointerup', this.onUp)
      window.removeEventListener('pointercancel', this.onUp)
    },
    onDown: function() {
      if(this.measure() <= 0) return
      this.pressing = true
      clearTimeout(this.resetTimer)
      this.updateEdges()
      this.open = true
      // 指を離したことは、この要素では取りこぼすことがある
      // （慣性で動いている間に外へ出るなど）。窓で受けておく
      this.releaseWindow()
      window.addEventListener('pointerup', this.onUp)
      window.addEventListener('pointercancel', this.onUp)
    },
    onUp: function() {
      this.releaseWindow()
      this.pressing = false
      this.scheduleReset()
    },
    onScroll: function() {
      const el = this.$refs.scroller
      if(!el) return

      // 頭に戻ったら閉じる。
      // close() が自分で戻したぶんもここに来るので、ここで開き直さないこと
      // （開き直すと、閉じる → 戻す → 開く、を繰り返して閉じられなくなる）
      if(el.scrollLeft <= 0 && !this.pressing) {
        if(this.running) return
        clearTimeout(this.resetTimer)
        this.resetTimer = null
        this.open = false
        this.moreBefore = false
        this.moreAfter = false
        return
      }

      if(!this.open) {
        // 触れずに動かされた場合（マウスの横スクロールなど）
        if(this.measure() <= 0) return
        this.open = true
      }
      this.updateEdges()
      this.scheduleReset()
    },
    // ポインタのある環境だけ、重ねただけで流す。
    // 指の場合も pointerenter は来るので、種類で分ける
    onEnter: function(event) {
      if(event.pointerType === 'touch') return
      if(this.measure() <= 0) return
      clearTimeout(this.resetTimer)
      // これから左へ送っていくので、送り出す側と、まだ見えていない側の
      // 両方に続きがある
      this.moreBefore = true
      this.moreAfter = true
      this.running = true
    },
    onLeave: function(event) {
      if(event.pointerType === 'touch') return
      this.running = false
      this.close()
    }
  }
}
</script>
