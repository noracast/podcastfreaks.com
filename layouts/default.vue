<template lang='pug'>
//- 狭い画面の切り替えは CSS のメディアクエリで行う。
//- 以前は Responsive コンポーネントで要素幅を測っていたが、幅が分かるまで
//- 中身を visibility: hidden で隠す作りのため、事前レンダリング済みの HTML が
//- JS を読み終えるまで表示されず、最初の表示が白いままだった。
//- 対象はページ全幅の要素なので、要素幅で測る必要はない
.wrapper
  header
    .brand
      //- タイトルとリード文をまとめて1つのリンクにする。
      //- どちらもトップへ戻る同じリンクなので、範囲を分けると紛らわしい
      nuxt-link(to='/')
        h1 Podcast Freaks
        p.lead テック系ポッドキャストまとめ
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
    //- アクセス解析から外れているときだけ出る印。
    //- 除外は localStorage に持つのでブラウザごと。他の人には出ない
    .ga-optout(title="このブラウザはアクセス解析の対象外です。戻すには ?ga-optout=0 を付けて開いてください") 計測オフ
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
@use 'sass:color'

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
// タイトルとリード文を縦に並べ、2つまとめてヘッダーの中央に置く。
// 全体が1つのリンクなので、縦に並べる指定はリンク側に持たせる
.brand
  float: left
  height: 100%
  >a
    display: -webkit-flex
    -webkit-flex-direction: column
    -webkit-justify-content: center
    display: flex
    flex-direction: column
    justify-content: center
    height: 100%
h1
  margin: 0
  line-height: 1.2
  // 文字を直接持つようになったので、h1 の既定（2em）ではなくここで指定する
  font-size: 22px
.lead
  margin: 3px 0 0
  color: #fff
  font-size: 11px
  line-height: 1.2
  // 小さい文字なので少し字間を空けて読みやすくする
  letter-spacing: 0.05em
  // タイトルより一段引いた見え方にする
  opacity: 0.8
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
// アクセス解析の除外中だけ出す。既定では隠しておき、
// プラグインが html に付ける data-ga-optout で表示を切り替える
.ga-optout
  display: none
  margin-left: 15px
  padding: 3px 8px
  border-radius: 3px
  font-size: 10px
  color: rgba(255,255,255,0.9)
  border: 1px solid rgba(255,255,255,0.5)
  white-space: nowrap
  cursor: help
html[data-ga-optout] .ga-optout
  display: block

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
      background-color: color.adjust(#7f00ff, $lightness: 10%)
    &:active
      background-color: color.adjust(#7f00ff, $lightness: 20%)

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
  // 3つの stats をまとめて右端へ寄せる。
  // 以前は :nth-of-type(1) で先頭を指していたが、これは同じ要素名の中での
  // 順番を見るため、ヘッダーに div を1つ足しただけで外れてしまう。
  // クラスで指定して DOM の変更に左右されないようにする
  &.channels
    margin-left: auto
  &:not(:last-child)
    margin-right: 20px
  >span:first-child
    font-size: 16px
  >span:nth-child(2)
    font-size: 10px
// 810px は Responsive で測っていたときの境界をそのまま引き継いだもの
@media (max-width: 810px)
  .wrapper
    header
      padding-left: 15px
      padding-right: 0
      height: 70px
      h1
        font-size: 13px
      nav
        float: right
        margin-left: 15px
        font-size: 10px
        a
          font-size: 10px
        a:not(:first-child)
          margin-left: 10px
      .lead
        display: none
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
import build_info from '@/static/downloads/build_info.json'

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
