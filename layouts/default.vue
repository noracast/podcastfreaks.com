<template lang='pug'>
Responsive(:breakpoints="{small: el => el.width <= 700}")
  .wrapper(slot-scope="el" :class="{ small: el.is.small }")
    header
      h1
        nuxt-link(to='/') Podcast Freaks
      nav
        nuxt-link(to='/about/') About
        nuxt-link(to='/in2weeks/') In 2 weeks
        nuxt-link(to='/request/') Request
      .stats.channels
        span {{ channelCount }}
        span channels
      .stats.update
        span {{ updatedDate }}
        span {{ updatedTime }} updated
    .main
      nuxt
</template>

<style lang='sass' scoped>
a
  &:hover
    color: #fff
    opacity: 0.8
header
  height: 80px
  background: linear-gradient(80deg, #af078b, #050935)
  padding: 0 20px
  position: sticky
  top: 0
  z-index: 5
  display: flex
  align-items: center
h1
  float: left
  display: -webkit-flex
  -webkit-align-items: center
  display: flex
  align-items: center
  margin: 0
  height: 100%
  a
    font-size: 22px
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

.stats
  margin-right: 0
  border-left: 1px solid rgba(255,255,255,0.2)
  color: rgba(255,255,255,0.3)
  padding-left: 20px
  height: 100%
  display: flex
  flex-direction: column
  justify-content: center
  transition-duration: 0.2s
  flex-shrink: 1
  &:nth-of-type(1)
    margin-left: auto
  &:not(:last-child)
    margin-right: 20px
  &:hover
    color: rgba(255,255,255,1)
    transition-duration: 0.2s
  >span:first-child
    font-size: 16px
  >span:nth-child(2)
    font-size: 10px
.wrapper.small
  header
    padding-left: 15px
    padding-right: 15px
  h1
    a
      font-size: 14px
  nav
    float: right
    margin-left: 0
    font-size: 10px
  .stats
    display: none
</style>

<script>
import moment from 'moment'
import build_info from '~/static/downloads/build_info.json'

export default {
  data: function() {
    return {
      updatedDate: moment(build_info.updated).format('YYYY.MM.DD'),
      updatedTime: moment(build_info.updated).format('h:mm:ss A'),
      channelCount: Object.keys(build_info.channels).length
    }
  }
}
</script>
