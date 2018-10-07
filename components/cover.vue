<template lang="pug">
div.cover(:style="'background-image: url('+src+'); width: '+size+'; height:'+size+';'")
</template>

<style lang="sass?indentedSyntax" scoped>
.cover
  background-repeat: no-repeat
  background-position: center
  background-size: cover
  border-radius: 10%
</style>

<script>

export default {
  props: {
    size: {
      type: String,
      default: '60px'
    },
    src: {
      type: String,
      required: true
    }
  },
}
</script>