<template>
  <!-- バッジ自体を About の凡例への入口にする。段階の意味を知りたくなるのは
       この印を見たときなので、見出しに別の目印を置くより素直に辿れる -->
  <nuxt-link v-if="duration" class="badge" :class="convertToClass(duration)" :title="tooltip" to="/about/#duration">{{ minutesOf(duration) }}<small>分</small><small v-if="isOver(duration)" class="plus">+</small></nuxt-link>
  <nuxt-link v-else class="badge" to="/about/#duration" title="RSSからdurationが取得できませんでした">N/A</nuxt-link>
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
// 丸め方とツールチップの文言は lib/duration-label.js に出してある
// （段の境目をテストで固めておきたいため）
import { durationClass, minutesOf, isOver, durationTooltip } from '@/lib/duration-label'

export default {
  props: {
    duration: {
      type: String,
      default: null
    }
  },
  computed: {
    tooltip() {
      return durationTooltip(this.duration)
    }
  },
  methods: {
    convertToClass: durationClass,
    minutesOf,
    isOver
  }
}
</script>
