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
    // 使えるのは 30 と 60 だけ。倍の大きさの画像を読むので、
    // 用意してある -60 と -120 に当たる（scripts/pf-util.js の
    // downloadAndResize がこの2枚を作る）。他の値を渡すと 404 になる。
    // 0 を渡すと元の大きさの画像を、幅と高さを指定せずに出す
    size: {
      type: Number,
      default: 60
    }
  },
  computed: {
    styles () {
      const suffix = this.size == 0 ? '' : `-${this.size*2}`
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
