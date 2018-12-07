<template lang="pug">
table
  thead
    tr
      th
      th Title
      th Twitter
      th Hashtag
      th Total episodes
      th First episode
      th Last episode
      th File server of sound files
  tbody
    tr(v-for="(val, key) in channels" :key="key")
      td.cover
        nuxt-link(:to="'/channels/'+key")
          cover(:channel="key")
      th
        nuxt-link(:to="'/channels/'+key" v-text="val.title")
        a.feed(:href="feed(key)" target="_blank") {{ feed(key) }}
        button.copy(type="button" v-clipboard:copy="feed(key)" :title="feed(key)") Copy RSS
      td
        a(:href="'https://twitter.com/'+twitter(key).replace('@','')" v-text="twitter(key)" v-if="twitter(key)")
      td
        a(:href="'https://twitter.com/search?q=%23'+hashtag(key).replace('#','')" v-text="hashtag(key)" v-if="hashtag(key)")
      td {{ val.total }}
      td {{ val.firstDate | formatDate }}
      td {{ val.lastDate | formatDate }}
      td {{ val.fileServer }}
</template>

<style lang="sass?indentedSyntax" scoped>

</style>

<script>
export default {

}
</script>