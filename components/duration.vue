<template lang="pug">
span(v-if="duration" :class="convertToClass(duration)")
  | {{ minutesOf(duration) }}
  small 分
  small.plus(v-if="isOver(duration)") +
span(v-else v-text="'N/A'" title="RSSからdurationが取得できませんでした")
</template>

<style lang="sass" scoped>
span
  background-color: #ededed
  color: white
  font-weight: bold
  width: 60px
  height: 23px
  border-radius: 23px
  // flex で中央寄せすると、数字と「分」がそれぞれ別の flex item として
  // 中央に置かれるため、小さい「分」だけが浮いて見える。
  // インラインとして並べればベースラインを共有するので揃う。
  // 行の高さを箱の高さに合わせることで上下の中央にも来る
  display: block
  line-height: 23px
  text-align: center
  small
    font-size: 0.75em
    margin-left: 1px
    // 「分」と詰まって見えるので少し離す
    &.plus
      margin-left: 2px
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
      if(!str) return null
      return `min${this.roughlyMinutes(str).replace('+', 'plus')}`
    },
    // 「120+分」ではなく「120分+」と出したいので、数値と単位を分けて返す
    minutesOf(val) {
      const minutes = this.roughlyMinutes(val)
      return minutes ? minutes.replace('+', '') : minutes
    },
    // 2時間以上かどうか。「120分+」の + を出すかの判定に使う
    isOver(val) {
      const minutes = this.roughlyMinutes(val)
      return !!minutes && minutes.includes('+')
    },
    // 収録時間をおおまかな分数に丸める
    roughlyMinutes(val) {
      if(!val){
        return null
      }
      let _val = moment(String(val), 'HH:mm:ss')
      if(2 <= _val.hours()){
        return '120+'
      }
      else if(1 <= _val.hours()){
        if(30 <= _val.minutes()) {
          return '120'
        }
        return '90'
      }
      else if(45 < _val.minutes()){
        return '60'
      }
      else if(30 < _val.minutes()){
        return '45'
      }
      else if(15 < _val.minutes()){
        return '30'
      }
      return '15'
    }
  }
}
</script>
