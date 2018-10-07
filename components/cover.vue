<template lang="pug">
div.cover(:style="'background-image:url('+src+')'")
</template>

<style lang="sass?indentedSyntax" scoped>
$size: 60px
.cover
  width: $size
  height: $size
  background-repeat: no-repeat
  background-position: center
  background-size: cover
  border-radius: 6px
</style>

<script>

export default {
  props: ['src'],
}
</script>