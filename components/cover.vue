<template>
  <div class="cover" :style="styles" />
</template>

<style scoped>
.cover {
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  /* 白背景のアートワークが行に溶け込んで消えて見えるため、輪郭を出す。
     border ではなく inset shadow にしているのは、指定された width / height を
     変えずに border-radius にも追従させるため */
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}
</style>

<script>
import build_info from '@/static/downloads/build_info.json'

export default {
  props: {
    channel: {
      type: String,
      required: true
    },
    radius: {
      type: String,
      default: '10%'
    },
    // 出す大きさ（px）。0 を渡すと幅と高さを指定せず、元の大きさの画像を使う
    size: {
      type: Number,
      default: 60
    },
    // 読む画像の選び方。既定では size の倍の画像を探すが、用意してあるのは
    // -60 と -120 の2枚だけ（scripts/pf-util.js の downloadAndResize）なので、
    // size に 30 と 60 以外を渡すときは、ここで 30 か 60 を指定して
    // どちらの画像を使うか決める
    imageSize: {
      type: Number,
      default: null
    }
  },
  computed: {
    styles () {
      const pick = this.imageSize == null ? this.size : this.imageSize
      const suffix = pick == 0 ? '' : `-${pick*2}`
      let style = {
        'border-radius': this.radius
      }
      if(build_info.channels[this.channel].cover){
        // 拡張子の直前にサイズを挿し込む。最初のドットにマッチさせると
        // キーにドットを含む番組（yota.fm, CEO.FM など）で
        // "yota-120.fm.jpg" のような存在しないURLになってしまう
        const image_url = build_info.channels[this.channel].cover.replace(/\.([^.]+)$/,`${suffix}.$1`)
        style['background-image'] = `url(${image_url})`
      }
      else {
        style['background-color'] = '#ccc'
      }
      if(this.size != 0){
        style.width = `${this.size}px`
        style.height = `${this.size}px`
      }
      return style
    }
  }
}
</script>
