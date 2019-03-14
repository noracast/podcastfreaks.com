<template lang='pug'>
Responsive(:breakpoints="{small: el => el.width <= 810}")
  .wrapper(slot-scope="el" :class="{ small: el.is.small }")
    header
      h1
        nuxt-link(to='/') Podcast Freaks
      nav
        nuxt-link(to='/about/') About
        nuxt-link(to='/new/') New episodes
        nuxt-link(to='/request/') Request
      .stats.channels
        span {{ channelCount }}
        span channels
      .stats.episodes
        span {{ episodeCount }}
        span episodes
      .stats.update
        span {{ updatedDate }}
        span {{ updatedTime }} updated
    .main
      .sp_stats
        .channels
          span {{ channelCount }}
          span channels
        .episodes
          span {{ episodeCount }}
          span episodes
        .update
          span {{ updatedDate }} {{ updatedTime }}
          span updated
      nuxt
</template>

<style lang='sass'>
header
  height: 80px
  background: linear-gradient(90deg, #7f00ff, #e100ff)
  padding: 0 20px
  position: sticky
  top: 0
  z-index: 5
  display: flex
  align-items: center
  a
    color: #fff
    &:hover
      color: #fff
      opacity: 0.5
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
h2:first-child
  margin-top: 0
nav
  float: left
  display: flex
  align-items: center
  font-size: 13px
  margin-left: 60px
  height: 100%
  a
    display: inline-block
    color: #fff
  a:not(:first-child)
    margin-left: 2em
.sp_stats
  display: none
button
  display: block
  border-radius: 3px
  color: white
  font-size: 12px
  font-weight: bold
  padding: 10px 20px
  min-width: 100px
  outline: none
  border: 0
  cursor: pointer
  background-color: #7f00ff
  &[disabled]
    color: rgba(255,255,255,0.4)
    cursor: not-allowed
  &:not([disabled])
    &:hover
      background-color: lighten(#7f00ff, 10)
    &:active
      background-color: lighten(#7f00ff, 20)

.stats
  margin-right: 0
  border-left: 1px solid rgba(255,255,255,0.2)
  color: rgba(255,255,255,0.7)
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
  >span:first-child
    font-size: 16px
  >span:nth-child(2)
    font-size: 10px
.wrapper.small
  header
    padding-left: 15px
    padding-right: 0
    height: 70px
    h1
      a
        font-size: 13px
    nav
      float: right
      margin-left: 15px
      font-size: 10px
      a
        font-size: 10px
      a:not(:first-child)
        margin-left: 10px
    .stats
      display: none
  .sp_stats
    background: linear-gradient(90deg, #7f00ff, #e100ff)
    font-size: 10px
    color: white
    display: flex
    align-items: center
    height: 30px
    padding-top: 10px
    padding-bottom: 10px
    border-top: 1px solid rgba(255,255,255,0.4)
    >div
      display: flex
      flex-direction: column
      padding-left: 15px
      margin-right: 15px
      &:not(:first-child)
        border-left: 1px solid rgba(255,255,255,0.4)

</style>

<script>
import moment from 'moment'
import build_info from '~/static/downloads/build_info.json'

export default {
  data: function() {
    return {
      updatedDate: moment(build_info.updated).format('YYYY.MM.DD'),
      updatedTime: moment(build_info.updated).format('h:mm:ss A'),
      channelCount: Object.keys(build_info.channels).length,
      episodeCount: build_info.episodeCount
    }
  }
}
</script>
