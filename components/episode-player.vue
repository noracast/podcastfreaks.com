<template lang="pug">
.episode
  a.play(@click="play()") {{ icon }}
  a-blank.title(href="episode.link") {{ episode.title }}
</template>

<style lang="sass" scoped>
.episode
  height: 60px
  display: flex
  flex-wrap: wrap
  flex-direction: column
  border-bottom: 1px solid #333
  .play
    width: 60px
    height: 60px
    background: #000
    display: flex
    justify-content: center
    align-items: center
    cursor: pointer
    color: #7f00ff
    &:hover
      color: lighten(#7f00ff, 10)
    &:active
      color: lighten(#7f00ff, 20)
  .title
    height: 60px
    width: calc(100% - 100px)
    padding: 0 20px
    color: #aaa
    display: flex
    align-items: center
    overflow: hidden
    white-space: nowrap
    text-overflow: ellipsis
</style>

<script>
export default {
  props: {
    episode: {
      required: true,
      type: Object
    },
    player: {
      required: false,
      type: Object,
      default: null
    },
    icon: {
      required: false,
      type: String,
      default: '▶'
    },
    timer: {
      required: false,
      type: Object,
      default: null
    }
  },
  mounted: function(){
    this.player = new Audio(this.episode.enclosure.$.url);
  },
  methods: {
    play: function(url) {
      if(this.player.paused) {
        this.player.play()
        if(this.timer == null) {
          this.icon = 60
          let me = this
          this.timer = setInterval(function() {
            if(!me.player.paused) {
              me.icon -= 1
              if(me.icon <= 0) {
                me.player.pause()
                me.player.currentTime = 0
                me.icon = '▶'
                clearInterval(me.timer)
                me.timer = null
              }
            }
          }, 1000)
        }
      }
      else {
        this.player.pause()
      }
    }
  }
}
</script>