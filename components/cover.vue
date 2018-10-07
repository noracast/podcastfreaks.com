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
      type: String,
      default: '60px'
    }
  },
  computed: {
    styles () {
      return {
        'width': this.size,
        'height': this.size,
        'background-image': `url(${build_info.channels[this.channel].cover})`,
        'border-radius': this.radius
      }
    }
  }
}
</script>