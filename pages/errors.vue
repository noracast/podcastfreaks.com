<template lang="pug">
.root
  h2 Prebuild errors
  pre(v-highlightjs)
    code.javascript(v-html="errors")
</template>

<style lang="sass" scoped>
.root
  padding: 20px
  max-width: 600px
</style>

<script>
import build_info from '@/static/downloads/build_info.json'

export default {
  data: function() {
    return {
      errors: build_info.errors
    }
  },
  head() {
    return {
      title: 'Errors | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
