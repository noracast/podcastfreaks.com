<template lang="pug">
//- バッジ自体を About の凡例への入口にする。段階の意味を知りたくなるのは
//- この印を見たときなので、見出しに別の目印を置くより素直に辿れる
nuxt-link.badge(v-if="duration" :class="convertToClass(duration)" :title="tooltip" to="/about/#duration")
  | {{ minutesOf(duration) }}
  small 分
  small.plus(v-if="isOver(duration)") +
nuxt-link.badge(v-else to="/about/#duration" title="RSSからdurationが取得できませんでした") N/A
</template>

<style scoped>
.badge {
  background-color: #ededed;
  /* リンクにしたので、レイアウトの a の指定（色・下線）を打ち消す */
  text-decoration: none;
  color: white;
  &:hover {
    color: white;
    /* 押せることが分かるよう、触れたときだけ少し明るくする */
    filter: brightness(1.08);
  }
  font-weight: bold;
  width: 60px;
  height: 23px;
  border-radius: 23px;
  /* flex で中央寄せすると、数字と「分」がそれぞれ別の flex item として
     中央に置かれるため、小さい「分」だけが浮いて見える。
     インラインとして並べればベースラインを共有するので揃う。
     行の高さを箱の高さに合わせることで上下の中央にも来る */
  display: block;
  line-height: 23px;
  text-align: center;
  & small {
    font-size: 0.75em;
    margin-left: 1px;
    /* 「分」と詰まって見えるので少し離す */
    &.plus {
      margin-left: 2px;
    }
  }
  /* 収録時間が短いほど鮮やかで濃くする（短いものほど聴き始めやすいため）。
     色相は青（216度）に固定し、彩度 88%→14%、明度 56%→44% で段階を作る。
     Frequency は緑（140度）で、そちらは暗くではなく淡くしていく。
     濃い青と淡い緑という明暗の差で、2つの列を見分ける */
  &.min15 {
    background-color: #2C7BF2;
  }
  &.min30 {
    background-color: #3378E1;
  }
  &.min45 {
    background-color: #3B76CE;
  }
  &.min60 {
    background-color: #4474BB;
  }
  &.min90 {
    background-color: #5072A5;
  }
  &.min120 {
    background-color: #597091;
  }
  &.min120plus {
    background-color: #606D80;
  }
}
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
  computed: {
    // バッジは段階に丸めた値なので、元の中央値をツールチップで補う。
    // Frequency の「直近の更新間隔の中央値: ◯日」と対にしている
    tooltip() {
      if(!this.duration) return null
      const m = moment(String(this.duration), 'HH:mm:ss')
      if(!m.isValid()) return null
      const h = m.hours()
      const min = m.minutes()
      const sec = m.seconds()
      // 1時間を超える番組で秒まで出しても仕方がないので、そこでは落とす。
      // 逆に1分に満たない番組が実際にあり（フィードの値がおかしいものを含む）、
      // 分だけで出すと「0分」になってしまうため、短いものは秒まで出す
      let length
      if(h) length = min ? `${h}時間${min}分` : `${h}時間`
      else if(min) length = sec ? `${min}分${sec}秒` : `${min}分`
      else length = `${sec}秒`
      return `収録時間の中央値: ${length}`
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
