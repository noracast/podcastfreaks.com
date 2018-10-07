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

export default {
  props: {
    src: {
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
        'background-image': `url(${this.src})`,
        'border-radius': this.radius
      }
    }
  }
}
</script>