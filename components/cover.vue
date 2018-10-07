<template lang="pug">
div.cover(:style="'background-image: url('+src+'); width: '+size+'px; height:'+size+'px'")
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
    size: Number,
    src: String
  },
}
</script>