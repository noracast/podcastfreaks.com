<template lang="pug">
.root
  h2 Prebuild errors
  p.count {{ errors.length }}件
  pre(v-highlightjs)
    code.javascript(v-html="errors")

  //- ビルドは通るが放っておくと問題になるもの。
  //- 記事用のフィードを登録している、ドメインが第三者に取得されて
  //- 別サイトのフィードに変わっている、といった状態を拾う
  h2 Warnings
  p.count {{ warnings.length }}件
  pre(v-highlightjs)
    code.javascript(v-html="warnings")
</template>

<style lang="sass" scoped>
.root
  padding: 20px
  max-width: 600px
  .count
    color: #999
    font-size: 12px
    margin-bottom: 5px
</style>

<script>
import build_info from '@/static/downloads/build_info.json'

export default {
  data: function() {
    return {
      errors: build_info.errors,
      // まだ warnings を持たない build_info.json でも表示が壊れないようにする
      warnings: build_info.warnings || []
    }
  },
  head() {
    return {
      title: 'Errors | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
