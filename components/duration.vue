<template lang="pug">
span(:class="this.convertToClass(duration)" v-text="this.text(duration)")
</template>

<style lang="sass" scoped>
span
  background-color: #ededed
  color: white
  font-weight: bold
  width: 70px
  height: 23px
  border-radius: 23px
  display: flex
  justify-content: center
  align-items: center
  &.min15
    background-color: #6BEE59
  &.min30
    background-color: #49EC6D
  &.min45
    background-color: #3AEB9D
  &.min60
    background-color: #2BE9D7
  &.min90
    background-color: #1CB5E8
  &.min120
    background-color: #0E67E6
  &.min120plus
    background-color: #0010E5
</style>

<script>
import moment from 'moment'

export default {
  props: {
    duration: {
      type: String,
      default: null
    }
  },
  methods: {
    convertToClass(str) {
      if(str){
        return this.roughlyTime(str).replace(/([\d-]+)(\w*)/,'$2$1').replace('+','plus')
      }
    },
    roughlyTime(val) {
      if(!val){
        return null
      }
      let _val = moment(String(val), 'HH:mm:ss')
      if(2 <= _val.hours()){
        return '120min+'
      }
      else if(1 <= _val.hours()){
        if(30 <= _val.minutes()) {
          return '120min'
        }
        return '90min'
      }
      else if(45 < _val.minutes()){
        return '60min'
      }
      else if(30 < _val.minutes()){
        return '45min'
      }
      else if(15 < _val.minutes()){
        return '30min'
      }
      return '15min'
    },
    text(val) {
      return this.roughlyTime(val) || 'N/A'
    }
  }
}
</script>
