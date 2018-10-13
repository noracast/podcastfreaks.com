<template lang='pug'>
Responsive(:breakpoints="{small: el => el.width <= 700}")
  .wrapper(slot-scope="el" :class="{ small: el.is.small }")
    header
      h1
        nuxt-link(to='/') Podcast Freaks
      nav
        nuxt-link(to='/about/') About
        nuxt-link(to='/channels/') Channels
      .last-update Last update: {{ updated }}
    .main
      nuxt
</template>

<style lang='sass?indentedSyntax' scoped>
a
  &:hover
    color: #fff
    opacity: 0.8
header
  height: 40px
  background: #8c22a7
  padding: 20px
.main
  padding: 20px
h1
  float: left
  display: -webkit-flex
  -webkit-align-items: center
  display: flex
  align-items: center
  margin: 0
  height: 100%
  a
    font-size: 15px
    color: #fff
nav
  float: left
  display: -webkit-flex
  -webkit-align-items: center
  display: flex
  align-items: center
  font-size: 13px
  margin-left: 60px
  height: 100%
  a
    display: inline-block
    color: #fff
  a + a
    margin-left: 2em
.last-update
  margin-left: auto
  font-size: 11px
  color: #fff
  float: right
  height: 100%
  display: -webkit-flex
  -webkit-align-items: center
  display: flex
  align-items: center

.wrapper
  &.small
    .last-update
      display: none
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