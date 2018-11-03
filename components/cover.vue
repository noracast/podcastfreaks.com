<template lang="pug">
div.cover(:style="styles")
</template>

<style lang="sass?indentedSyntax" scoped>
.cover
  background-repeat: no-repeat
  background-position: center
  background-size: cover
</style>

<script>
import build_info from '~/static/downloads/build_info.json'

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
    size: {
      type: Number,
      default: 60
    }
  },
  computed: {
    styles () {
      const suffix = this.size == 0 ? '' : `-${this.size}`
      const image_url = build_info.channels[this.channel].cover.replace(/\.(.*)/,`${suffix}.$1`)
      // TODO: Fix image_url if file not found
      let style = {
        'background-image': `url(${image_url})`,
        'border-radius': this.radius
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