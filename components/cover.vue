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
      let image_url = build_info.channels[this.channel].cover.replace(/\.(.*)/,`-${this.size}.$1`)
      // TODO: Fix image_url if file not found
      return {
        'width': `${this.size}px`,
        'height': `${this.size}px`,
        'background-image': `url(${image_url})`,
        'border-radius': this.radius
      }
    }
  }
}
</script>