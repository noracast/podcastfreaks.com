<template lang='pug'>
  .wrapper
    el-header
      h1
        nuxt-link(to='/') Podcast Freaks
      nav
        nuxt-link(to='/') Top
        nuxt-link(to='/about/') About
        nuxt-link(to='/channels/') Channels
      .last-update Last update: {{ updated }}
    el-main
      nuxt
</template>

<style lang='sass?indentedSyntax' scoped>

header
  height: 60px
  margin-bottom: 60px
  display: -webkit-flex
  -webkit-flex-wrap: wrap
  display: flex
  flex-wrap: wrap
h1
  float: left
  width: 300px
  display: -webkit-flex
  -webkit-align-items: center
  display: flex
  align-items: center
nav
  float: left
  width: calc(100% - 300px)
  display: -webkit-flex
  -webkit-align-items: center
  display: flex
  align-items: center
  a
    display: inline-block
  a + a
    margin-left: 2em
.last-update
  clear: both
  font-size: 11px
  color: #888

</style>

<script>
import moment from 'moment'
import build_info from '~/static/downloads/build_info.json'

export default {
  data: function() {
    return {
      updated: moment(build_info.updated).format('YYYY/MM/DD h:mm:ss a'),
    }
  }
}
</script>