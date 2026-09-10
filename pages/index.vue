<template lang="pug">
div.root
  button.download(@click="downloadOpml" :disabled="markedRows.length == 0" ref="downloadBtn") Download OPML
  v-client-table(:columns="columns" :data="channels" :options="options" ref="table")
    template(slot="cover" slot-scope="props")
      cover.cover(:channel="props.row.key" @click.native="toggleChildRow(props.row.key, $event)" title="Click to show detail")
    template(slot="title" slot-scope="props")
      .title-cell
        .clip
          //- .value をタイトルの文字幅に沿わせ、その右上にバッジを置く。
          //- 省略は内側の .text が受け持つので、バッジは省略に巻き込まれない
          span.value
            span.new(v-if="isRecentlyAdded(props.row.addedAt)" :title="`${props.row.addedAt} に登録`") New!
            //- 省略された場合に全体を確認できるよう title 属性を付ける
            span.text(:title="props.row.title" @click.self="toggleChildRow(props.row.key, $event)") {{ props.row.title }}
            //- タイトルの後ろに並べる外部リンク。
            //- Apple 側と登録フィードURLが違う番組は自動で特定できないため、
            //- Apple Podcasts のリンクを持たない番組がある
            //- （data/apple-podcasts.json に手で足せる）
            span.links
              apple-podcasts-link(v-if="props.row.applePodcasts" :url="props.row.applePodcasts")
              x-link(v-if="props.row.twitter" :account="props.row.twitter")
              hashtag-link(v-if="props.row.hashtag" :hashtag="props.row.hashtag")
    template(slot="lastEpisodeDate" slot-scope="props")
      a-blank(v-if="props.row.lastEpisodeLink" :href="props.row.lastEpisodeLink")
        //- .value を基準にして、バッジを日付の右上に置く
        span.value
          span.new(v-if="isIn(props.row.lastEpisodeDate, newThreshold1)") New!
          | {{ props.row.lastEpisodeDate | formatDate }}
      span.date(v-else)
        span.value
          span.new(v-if="isIn(props.row.lastEpisodeDate, newThreshold1)") New!
          | {{ props.row.lastEpisodeDate | formatDate }}
    template(slot="durationMedian" slot-scope="props")
      duration(:duration="props.row.durationMedian")
    template(slot="updateInterval" slot-scope="props")
      frequency(:interval="props.row.updateInterval")
    template(slot="fileServer" slot-scope="props")
      .clip
        small(:title="props.row.fileServer") {{ props.row.fileServer }}
    template(slot="firstEpisodeDate" slot-scope="props")
      a-blank(v-if="props.row.firstEpisodeLink" :href="props.row.firstEpisodeLink")
        span.value
          span.new(v-if="isIn(props.row.firstEpisodeDate, newThreshold2)") New!
          | {{ props.row.firstEpisodeDate | formatDate }}
      span.date(v-else)
        span.value
          span.new(v-if="isIn(props.row.firstEpisodeDate, newThreshold2)") New!
          | {{ props.row.firstEpisodeDate | formatDate }}
    template(slot="download" slot-scope="props")
      input(type="checkbox" :value="props.row.key" v-model="markedRows")
    template(slot="child_row" slot-scope="props")
      .wrap
        //- 影はスクロールしない枠に重ねる。スクロールする側に置くと、
        //- 端に着いたときに位置が食い違う
        .column
          .info(@scroll="onColumnScroll")
            p.description(v-if="props.row.desciprtion" v-html.raw="props.row.desciprtion")
            p.description(v-else) No description
            button-text(v-if="props.row.link" :text="props.row.link" :buttonText="'Open Web'" buttonAction="'open'")
            button-text(:text="props.row.feed" :buttonText="'Copy RSS'")
          //- 上下にまだ続きがあることを示す影
          .scroll-fade.top
          .scroll-fade.bottom
        //- エピソードは番組ごとの別ファイルにあり、行を開いた時点で読み込む
        .column
          .episodes(@scroll="onEpisodesScroll(props.row.key, $event)")
            template(v-if="episodes[props.row.key]")
              episode-player(
                v-for="(ep, i) in visibleEpisodes(props.row.key)"
                :key="i"
                :episode="ep"
                @play="playEpisode"
              )
            p.episodes-status(v-else-if="episodesFailed[props.row.key]") エピソードを読み込めませんでした
            p.episodes-status(v-else) エピソードを読み込んでいます…
          .scroll-fade.top
          .scroll-fade.bottom

</template>

<style lang="sass" scoped>
@use 'sass:color'
@import '@/assets/brand'

$color_new: #e100ff
// 子行の高さ。エピソード5話ぶん（1話60px＋区切り線1px）
$child_row_height: 305px

@keyframes child-row-in
  from
    opacity: 0
  to
    opacity: 1
// ソートアイコンの占有幅。ラベルの位置合わせにも使う
$sort_icon_width: 1.6em

.download
  margin-right: 20px
  position: absolute
  width: 150px
  top: 20px
  right: 0
  // ヘッダーと同じ背景にする。後ろは白いだけなので透かさない。
  // 押したときの変化は、色を差し替えるのではなく明るさで付ける
  +brand-solid
  // 文字は普段うっすら、ホバーでくっきり。ガラス越しに見えている感じにする
  color: rgba(255,255,255,0.72)
  transition-duration: 0.2s
  &[disabled]
    color: rgba(255,255,255,0.35)
  &:not([disabled])
    &:hover
      color: #fff
      filter: brightness(1.06)
    &:active
      color: #fff
      filter: brightness(1.14)

// 新しいことを表す目印の吹き出し。日付の上、またはタイトルの上に浮かせる。
//
// 以前は top: -40px / right: -30px だったが、行の高さが変わったことで
// 上の行に食い込み、さらに右へはみ出して隣の列に重なっていた。
// 自分の行の中に収まる位置に直し、指す対象の真上に置く
.new
  $color: #f7ff00
  background: $color
  font-weight: bold
  font-size: 10px
  display: flex
  justify-content: center
  align-items: center
  width: 50px
  height: 20px
  border-radius: 10px
  color: #47525d
  position: absolute
  // 行の区切り線ではなく、指し示す文字列のすぐ上に置く。
  // 吹き出し自体は文字に被せず、▼ の先だけが少し重なる。
  // 左右は文字列の右端を基準にして、少し右へずらす
  top: -23px
  right: -30px
  &:after
    content: '▼'
    font-size: 12px
    line-height: 1em
    position: absolute
    display: block
    color: $color
    bottom: -7px
    left: calc(50% - 8px)
    transform: rotate(19deg)

.root ::v-deep
  padding-top: 20px
  padding-bottom: 20px
  -webkit-overflow-scrolling: touch
  overflow-scrolling: touch
  position: relative
  table
    border-collapse: collapse
    border-spacing: 0
    width: 100%
  th
    white-space: nowrap
    // Hosting の見出しに重ねる select の基準にする。
    // 他の見出しはセル全体がクリック領域なので、それに合わせる
    position: relative
    &.title
      width: 40%
  // 画面が広いとき、余った幅をアートワークの列が吸ってしまい、
  // カバー画像とタイトルの間が間延びする。width: 1% で内容
  // （カバー画像60px＋左右のpadding）の幅に張り付かせて固定する
  th.artwork,
  td.artwork
    width: 1%
    white-space: nowrap
  th,td
    text-align: left
    vertical-align: top
    padding: 10px
    outline: 0
    &:first-child:not(:last-child)
      display: none
    &:nth-child(2)
      padding-left: 20px
  thead
    color: #ccc
    font-size: 12px
    th
      font-weight: normal
  tbody
    th,td
      font-weight: 500
      font-size: 13px
      vertical-align: middle
    td.artwork
      position: relative
    td.title
      font-weight: bold
      font-size: 15px
      // 日付の列と同じ仕組みで、タイトルの文字列の右上に吹き出しを浮かせる。
      //
      // .clip の既定では中身が左右いっぱいに広がるため、そのままだと
      // 「文字列の右端」が取れない。.value を右に伸ばさず（right: auto）、
      // 列幅までに収まる範囲で文字幅に沿わせることで、短いタイトルでも
      // バッジが文字のすぐ右上に付く。
      // 省略は内側の .text が受け持ち、.value は overflow を切らないので
      // 上にはみ出すバッジが欠けない
      .title-cell
        .clip
          >.value
            right: auto
            max-width: 100%
            overflow: visible
            // タイトルとアップルマークを横に並べる。
            // 幅が足りないときに縮むのはタイトル側だけにしたいので、
            // .text に min-width: 0 を与えて flex の既定を外す
            display: flex
            align-items: center
            .text
              min-width: 0
              overflow: hidden
              text-overflow: ellipsis
              white-space: nowrap
            // タイトルの後ろに並べる外部リンク。
            // 幅が足りないときに縮むのはタイトル側だけなので、ここは固定
            .links
              flex: none
              display: flex
              align-items: center
              margin-left: 16px
              >*
                position: relative
              >*:not(:first-child)
                margin-left: 6px
              // ホバーしたアイコンの右横に、その名前を出す。
              //
              // アイコンだけでは何のリンクか分からず、リンク先を開くまで
              // 確かめられなかった。行の高さと列の幅を変えたくないので、
              // 絶対配置にして並びの計算から外す。
              // 隣のアイコンに重なるため、行と同じ色の背景を敷いて隠す
              .label
                position: absolute
                left: 100%
                top: 50%
                margin-left: 4px
                padding-right: 4px
                background-color: #fff
                color: #888
                font-size: 11px
                font-weight: normal
                // 行間は文字の高さぴったりにする。既定（normal）だと
                // 日本語フォントの大きな行送りのぶん箱が上下に広がり、
                // 箱の中央で揃えてもアイコンに対して文字がずれて見える
                line-height: 1
                white-space: nowrap
                pointer-events: none
                opacity: 0
                // 少し右から滑り込ませる
                transform: translate(-4px, -50%)
                transition: opacity 0.2s, transform 0.2s
              // @ と # は字形が四角い枠いっぱいに広がらないぶん、
              // Podcast アイコンより間隔を詰めた方が一体に読める
              >.x .label,
              >.hashtag .label
                margin-left: 1px
              // 隣のアイコンは DOM の後ろにあるぶん手前に描かれるので、
              // ホバー中のものを前に出して、ラベルの背景で隠せるようにする
              >*:hover
                z-index: 1
                .label
                  opacity: 1
                  transform: translate(0, -50%)


      span
        cursor: pointer
        &:hover
          color: color.adjust(#444, $lightness: 10%)
    td.file-server
      small
        display: block
        font-size: 10px
        color: #ccc
    // 長いタイトルやホスト名で折り返して行の高さが変わらないよう、1行に省略する。
    //
    // 中身をそのまま nowrap にすると、その幅が列幅の下限になってしまい
    // テーブルが画面幅に収まらず横スクロールしてしまう。
    // .clip で1階層くるみ、中身を絶対配置にすることで列幅の計算から外す。
    // これで「画面幅に応じて伸縮する」と「1行に省略する」が両立する
    .clip
      position: relative
      // 絶対配置にした中身は高さを持たないので、ここで1行分を確保する
      height: 1.4em
      // 幅を主張しなくなるため、狭くなりすぎない下限を決めておく
      min-width: 60px
      >*
        position: absolute
        top: 0
        left: 0
        right: 0
      // a でくるまれている列は実際の文字が中の small にあるため、
      // 外側だけに指定すると「…」が出ずに切り落とされてしまう
      >*,
      small
        display: block
        overflow: hidden
        text-overflow: ellipsis
        white-space: nowrap
    // タイトルは可変幅の主役なので、優先的に幅を取る
    td.title
      width: 40%
    td.total
      font-size: 18px
    td.last,
    td.first
      >a,
      >.date
        // /new ページの非スコープなスタイルに .date { position: absolute } があり、
        // ここで打ち消さないと日付がページ上部へ飛ぶ
        position: relative
        display: flex
        align-items: center
      // 日付の文字列そのものを基準にして、その右上にバッジを置く
      .value
        position: relative
    tr
      &:first-child
        border-top: 1px solid #ccc
      &:not(.VueTables__child-row)
        border-top: 1px solid #ccc
      &.VueTables__child-row
        border-top: 1px solid #eee
        background-color: #222
        background-size: auto 21px
        color: white !important
        >td
          line-height: 1.8em
          padding: 0
          // colspan で全列にまたがるため、内容の幅が他の列の幅計算に影響し、
          // 子行を開くたびに列の位置がずれてしまう。
          // 幅の要求を出さないようにする（描画幅は colspan により全幅になる）
          width: 0
          >.wrap
            display: flex
            // 高さが動くのに合わせて、中身も淡く出す
            animation: child-row-in 0.22s ease-out
            // td の width: 0 だけでは足りない。中身（長いエピソード名など）の
            // 最小幅がセルの幅として要求され、開く行によってテーブルが広がって
            // 横スクロールが出たり出なかったりしていた。
            // 幅を要求せず、セルいっぱいに広げる
            width: 0
            min-width: 100%
            // 中身の量で高さが変わると、開くたびに一覧が大きく動く。
            // エピソード5話ぶんに固定し、はみ出す分は各列でスクロールさせる
            height: $child_row_height
            >.column
              position: relative
              width: 50%
              height: 100%
              // 中身の最小幅を外へ出さない
              min-width: 0
              // エピソードが少ない番組でも左右の区切りが分かるようにする
              &:last-child
                border-left: 1px solid #333
              >.info,
              >.episodes
                height: 100%
                overflow-y: auto
              >.info
                padding: 20px
                box-sizing: border-box
              >.episodes
                // 読み込みが済むまでの控えめな案内。すぐ入れ替わるので目立たせない
                .episodes-status
                  padding: 20px
                  color: #999
                  font-size: 12px
              // まだ続きがある側の端をうっすら暗くして、スクロールできることを示す。
              // 中身の上に重ねる（背景に敷くと再生ボタンの色に隠れてしまう）
              >.scroll-fade
                position: absolute
                left: 0
                right: 0
                height: 28px
                pointer-events: none
                opacity: 0
                transition: opacity 0.2s
                &.top
                  top: 0
                  background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))
                &.bottom
                  bottom: 0
                  background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.55))
              >.can-scroll-up ~ .scroll-fade.top,
              >.can-scroll-down ~ .scroll-fade.bottom
                opacity: 1

        p
          max-width: calc(100vw - 30px)
          &:first-child
            margin-top: 0
    button
      font-size: 10px
      padding: 5px 10px
      min-width: initial
  .VueTables
    .row
      padding-left: 20px
      padding-right: 20px
    .table-responsive
      overflow: auto
      width: 100%
      margin-top: 15px
    .cover
      cursor: pointer
      transition-duration: 0.2s
      overflow: hidden
      &:before
        content: 'info\A▼'
        white-space: pre
        color: white
        font-size: 10px
        line-height: 1.3em
        font-weight: bold
        background-color: rgba(0,0,0,0.4)
        display: flex
        justify-content: center
        align-items: center
        text-align: center
        width: 100%
        height: 100%
        opacity: 0
        transition-duration: 0.2s
      &:hover
        &:before
          opacity: 1
          transition-duration: 0.2s
      &:active
        &:before
          opacity: 0
  .VueTables__search-field
    margin-bottom: 20px
    input
      padding: 8px
      outline: none
      font-size: 13px
      border: 1px solid #ddd
      width: 300px
      &:placeholder-shown
        color: #ccc
      &::-webkit-input-placeholder
        color: #ccc
      &::-moz-placeholder
        color: #ccc
  .VueTables__search
    float: left
    width: calc(100% - 270px)
  .VueTables__columns-dropdown
    float: right
    width: 100px
    .dropdown-menu
      position: absolute
      right: 20px
      padding: 15px
      margin-top: 6px
      margin-bottom: 0
      background: #050935
      border-radius: 3px
      list-style: none
      z-index: 10
      a
        color: white
        font-size: 12px
      input[type=checkbox]
        margin-right: 1em
  .VueTables__limit
    display: none
  .VueTables__sortable
    cursor: pointer
    &:hover
      color: #7f00ff
  // Hosting の見出しは配信サービスで絞り込むプルダウンになっている。
  // ラベルの上に透明な select を重ねることで、見出しの文言を変えずに
  // ネイティブのプルダウンを使う
  .hosting-filter
    display: inline-block
    cursor: pointer
    &:hover
      color: #7f00ff
    // 絞り込み中であることが分かるようにする
    &.is-active
      color: #7f00ff
      font-weight: bold
    // th を基準に、セル全体を覆う
    select
      position: absolute
      top: 0
      left: 0
      width: 100%
      height: 100%
      opacity: 0
      cursor: pointer
  // ソートアイコンの span はソート中かどうかに関わらず描画されるが、
  // ▼▲ が入るのはソート中だけ。幅を常に確保しておかないと、
  // ソートするたびに見出しの位置がずれる
  .VueTables__sort-icon
    display: inline-block
    width: $sort_icon_width
    text-align: right
  .glyphicon-chevron-down
    &:before
      content: '▼'
      font-size: 0.7em
  .glyphicon-chevron-up
    &:before
      content: '▲'
      font-size: 0.7em
  .VuePagination
    .text-center
      margin-left: 0

// 810px は layouts/default.vue の境界と揃える
@media (max-width: 810px)
  .root ::v-deep
    padding-top: 15px
    padding-bottom: 15px
    table
      margin-top: 15px
    tbody
      th,td
        font-size: 11px
      td.total
        font-size: 14px
      // 画面が狭いと、他の列に押されてタイトルが数文字しか出ない
      // （実測で文字に割り当てられる幅が10pxだった）。
      // テーブルはもともと横スクロールするので、読める幅を先に確保する
      td.title .clip
        min-width: 180px
      // タイトルとアイコン群の間隔も、広い画面ほど要らない
      td.title .title-cell .links
        margin-left: 8px
    button
      font-size: 10px
    .download
      position: relative
      margin-left: 15px
      top: initial
      left: initial
      height: 38px
    .VueTables
      margin-top: 15px
      .row
        padding-left: 15px
        padding-right: 15px
      // hoverが解除されないので、打ち消す
      .cover:hover:before
        opacity: 0
    .VueTables__columns-dropdown
      .dropdown-menu
        right: 15px
    .VueTables__search
      width: 100%
    .VueTables__search-field
      margin-bottom: 0
      input
        width: calc(100% - 20px)
        padding: 9px
        font-size: 16px
    .VueTables__columns-dropdown
      clear: left
    th,td
      &:nth-child(2)
        padding-left: 15px
    // 広い画面側の指定（tbody tr.VueTables__child-row > td > .wrap）と
    // 同じ強さにしておく。弱いとメディアクエリの中でも上書きできない
    tbody tr
      &.VueTables__child-row
        >td > .wrap
          flex-direction: column
          // 縦に積むぶん高さは伸びるが、説明の長い番組だと一覧が
          // 大きく動いてしまう。上下それぞれ5話ぶんまでに収める
          height: auto
          >.column
            width: auto
            height: auto
            // 縦に積むと上下の関係で続きがあることは分かるので、影は出さない
            >.scroll-fade
              display: none
            &:last-child
              border-left: 0
              border-top: 1px solid #333
            // 番組情報はそのまま伸ばす。狭い画面で入れ子のスクロールが
            // 増えると、ページ全体のスクロールと取り合いになって扱いづらい
            >.info
              height: auto
              max-height: none
              overflow-y: visible
            >.episodes
              height: $child_row_height
    .description
      max-width: calc(100vw - 30px)
</style>

<script>
import axios from 'axios'
import xml2js from '@/lib/xml2js-promise'
import rss from '@/data/rss.json'
import build_info from '@/static/downloads/build_info.json'
import opml from 'opml-generator'
import { saveAs } from 'file-saver'
import { RSS_DIR } from '@/scripts/constants'
import frequencyLabel from '@/lib/frequency-label'
import { jst, jstDate } from '@/lib/jst'
import { Event as VueTablesEvent } from 'vue-tables-2'

// 配信サービスでの絞り込み。1番組しか使っていないホストは自前配信とみなし、
// 選択肢が増えすぎないよう「その他」にまとめる（71ホスト中62が該当）
// 一度に描くエピソードの数。下まで見たらこの数ずつ足していく
const EPISODES_PER_CHUNK = 30

// 子行を開け閉めするときの長さ
const CHILD_ROW_ANIM_MS = 220

const HOSTING_MIN_COUNT = 2
const OTHER_HOSTING = '__other__'

export default {
  components: {
    'button-text': require('@/components/button-text.vue').default,
    'cover': require('@/components/cover.vue').default,
    'duration': require('@/components/duration.vue').default,
    'episode-player': require('@/components/episode-player.vue').default,
    'frequency': require('@/components/frequency.vue').default,
    'apple-podcasts-link': require('@/components/apple-podcasts-link.vue').default,
    'x-link': require('@/components/x-link.vue').default,
    'hashtag-link': require('@/components/hashtag-link.vue').default
  },
  data: function() {
    return {
      rssDir: `@/${RSS_DIR}/`,

      // 行ごとに何度も作成しないように予め作る。
      // moment() ではなくビルド時刻を基準にするのは、実行時のタイムゾーンで
      // 判定が変わると、UTC で事前レンダリングした結果と閲覧者のブラウザで
      // バッジの有無が食い違い、ハイドレーションが無駄にやり直されるため
      newThreshold1: jst(build_info.updated).subtract(3, 'days').startOf('date'),
      newThreshold2: jst(build_info.updated).subtract(30, 'days').startOf('date'),
      // サイトへの登録が新しいと見なす範囲
      addedThreshold: jst(build_info.updated).subtract(30, 'days').startOf('date'),

      allMarked: false,
      hostingFilter: '',
      columns: [
        'cover',
        'title',
        'fileServer',
        'durationMedian',
        'updateInterval',
        'total',
        'firstEpisodeDate',
        'lastEpisodeDate',
        'download'
      ],
      markedRows: [],
      options: {
        columnsClasses: {
          cover: 'artwork',
          title: 'title',
          fileServer: 'file-server',
          total: 'total',
          firstEpisodeDate: 'first',
          lastEpisodeDate: 'last',
          durationMedian: 'duration',
          updateInterval: 'frequency'
        },
        // 列幅は内容に合わせて決めている。手で変えられると崩れるうえ、
        // 見出しの境目にカーソルを乗せたときの左右矢印が紛らわしい
        resizableColumns: false,
        orderBy: {
          ascending: false,
          column: 'lastEpisodeDate'
        },
        perPage: 9999,
        headings: {
          cover: '▽ Click',
          title: 'Title',
          // 配信サービスで絞り込めるようプルダウンにする。
          // vue-tables-2 は headings の関数を内部コンポーネントの文脈で call するため、
          // アロー関数にして data() の this（＝ページコンポーネント）を束縛する
          fileServer: (h) => {
            // ラベルは "Hosting" のまま固定し、透明な select を重ねる。
            // select 自体に文字を出すと、絞り込み中に見出しの文言が変わってしまう
            return h('span', {
              class: ['hosting-filter', { 'is-active': !!this.hostingFilter }]
            }, [
              'Hosting',
              h('select', {
                domProps: { value: this.hostingFilter },
                on: {
                  change: (event) => this.filterByHosting(event.target.value),
                  // 見出しのクリック（並べ替え）を誘発させない
                  click: (event) => event.stopPropagation()
                }
              }, [
                h('option', { domProps: { value: '' } }, 'すべて'),
                ...this.hostingOptions.map(o =>
                  h('option', { domProps: { value: o.value } }, `${o.label} (${o.count})`)
                )
              ])
            ])
          },
          total: 'Episodes',
          firstEpisodeDate: 'First episode',
          lastEpisodeDate: 'Last episode',
          durationMedian: 'Duration',
          updateInterval: 'Frequency',
          // vue-tables-2 は headings の関数を内部コンポーネントの文脈で call するため、
          // 通常の function だと this がページコンポーネントにならない。
          // アロー関数にして data() の this（＝ページコンポーネント）を束縛する
          download: (h) => {
            return h('input', {
              attrs: { type: 'checkbox', checked: true },
              class: 'form-control check-all',
              on: {
                change: this.toggleAllCheckbox
              }
            })
          }
        },
        headingsTooltips: {
          title: 'クリックすると詳細情報が確認できます',
          durationMedian: '収録時間の中央値',
          updateInterval: '直近の更新間隔から求めたおおよその頻度',
          fileServer: '音声ファイルの配信元',
          download: 'ダウンロードするためにチェックしてください'
        },
        sortable: [
          'title',
          'total',
          'firstEpisodeDate',
          'lastEpisodeDate',
          'durationMedian',
          'updateInterval'
        ],
        descOrderColumns: [
          'total',
          'lastEpisodeDate',
          'durationMedian'
        ],
        customSorting: {
          // 算出できない番組（N/A）は昇順・降順どちらでも末尾にまとめる。
          // 既定の比較では null が数値の間に紛れ、N/A が飛び飛びに現れてしまう
          updateInterval: (ascending) => (a, b) => {
            if(a.updateInterval == null && b.updateInterval == null) return 0
            if(a.updateInterval == null) return 1
            if(b.updateInterval == null) return -1
            return ascending ? a.updateInterval - b.updateInterval : b.updateInterval - a.updateInterval
          }
        },
        // 検索ボックスとは独立したフィルタ。両方を同時に効かせられる
        customFilters: [
          {
            name: 'hosting',
            callback: (row, value) => {
              if(value === OTHER_HOSTING) return this.minorHostings.includes(row.fileServer)
              return row.fileServer === value
            }
          }
        ],
        // 実際の判定は filterAlgorithm.title でまとめて行うため、
        // 検索対象の列は1つだけにしておく
        filterable: ['title'],
        filterAlgorithm: {
          // 既定の実装はクエリ全体を1つの文字列として部分一致させるため、
          // 「anchor キマグレエフエム」のように複数語で絞り込めなかった。
          // スペース区切りの語をすべて含む行だけを残す（AND 検索）
          title: (row, query) => {
            const terms = String(query).toLowerCase().split(/\s+/).filter(t => t)
            if(!terms.length) return true
            return terms.every(term => this.searchableText(row).includes(term))
          }
        },
        texts: {
          filter: '',
          filterPlaceholder: 'Search'
        },
        uniqueKey: 'key'
      },
      currentPlayer: null,
      channels: Object.values(build_info.channels),
      // 番組キー -> その番組の全エピソード。行を開いた時点で読み込む
      episodes: {},
      episodesFailed: {},
      // 番組キー -> いま描画している件数。1000話を超える番組があるため、
      // 開いた瞬間に全部は描かず、下まで見たら足していく
      episodesShown: {}
    }
  },
  computed: {
    hostingCounts: function() {
      const counts = {}
      this.channels.forEach(c => {
        if(c.fileServer) counts[c.fileServer] = (counts[c.fileServer] || 0) + 1
      })
      return counts
    },
    // 1番組しか使っていないホスト（自前配信とみなすもの）
    minorHostings: function() {
      return Object.keys(this.hostingCounts).filter(h => this.hostingCounts[h] < HOSTING_MIN_COUNT)
    },
    // Hosting のプルダウンに出す選択肢。番組数の多い順に並べ、末尾に「その他」を置く
    hostingOptions: function() {
      const options = Object.keys(this.hostingCounts)
        .filter(h => this.hostingCounts[h] >= HOSTING_MIN_COUNT)
        .map(host => ({ value: host, label: host, count: this.hostingCounts[host] }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

      const otherCount = this.minorHostings.reduce((sum, h) => sum + this.hostingCounts[h], 0)
      if(otherCount) options.push({ value: OTHER_HOSTING, label: 'その他（自前配信など）', count: otherCount })

      return options
    }
  },
  mounted: function(){
    this.toggleAllCheckbox()
    window.addEventListener('resize', this.refreshScrollFades)
  },
  beforeDestroy: function(){
    window.removeEventListener('resize', this.refreshScrollFades)
  },
  methods: {
    // エピソードは番組ごとのファイルに分けてある。
    //
    // 以前は build_info.json に全番組の直近5話を入れてページのバンドルに
    // 同梱していたが、全体3.07MBのうち2.73MB（9割）をこれが占めていた。
    // 全話を扱うようになったので、開いた番組のぶんだけ読みに行く
    loadEpisodes: function(key) {
      if(this.episodes[key]) return
      this.$set(this.episodesFailed, key, false)
      axios.get(`/downloads/episodes/${encodeURIComponent(key)}.json`)
        .then(res => {
          this.$set(this.episodes, key, res.data)
          this.$set(this.episodesShown, key, EPISODES_PER_CHUNK)
          this.$nextTick(this.refreshScrollFades)
        })
        .catch(() => { this.$set(this.episodesFailed, key, true) })
    },
    visibleEpisodes: function(key) {
      const all = this.episodes[key] || []
      return all.slice(0, this.episodesShown[key] || EPISODES_PER_CHUNK)
    },
    // 下まで見たら続きを描く。1000話を超える番組があるため、
    // 開いた瞬間に全部描くと固まってしまう
    onEpisodesScroll: function(key, event) {
      this.onColumnScroll(event)
      const el = event.target
      if(el.scrollTop + el.clientHeight < el.scrollHeight - 200) return
      const all = this.episodes[key] || []
      const shown = this.episodesShown[key] || EPISODES_PER_CHUNK
      if(shown >= all.length) return
      this.$set(this.episodesShown, key, shown + EPISODES_PER_CHUNK)
      this.$nextTick(this.refreshScrollFades)
    },

    // まだ下に続きがある列にだけ影を出す。
    // 子行は開くたびに作り直されるので、Vue の状態には持たずクラスで付ける
    onColumnScroll: function(event) {
      this.markScrollFade(event.target)
    },
    markScrollFade: function(el) {
      el.classList.toggle('can-scroll-up', el.scrollTop > 1)
      el.classList.toggle('can-scroll-down', el.scrollTop + el.clientHeight < el.scrollHeight - 1)
    },
    refreshScrollFades: function() {
      document.querySelectorAll('.VueTables__child-row .info, .VueTables__child-row .episodes')
        .forEach(this.markScrollFade)
    },

    // 子行の開け閉め。高さを 0 と実際の高さのあいだで動かす。
    //
    // 中身によって高さが変わる（狭い画面では番組情報の量で決まる）ため、
    // CSS だけでは書けない。開いたあとに測った高さへ動かし、
    // 終わったら指定を外して元の指定（auto や5話ぶん）へ戻す
    toggleChildRow: function(key, event){
      const tr = event && event.target && event.target.closest ? event.target.closest('tr') : null
      const wrapOf = (row) => {
        const next = row && row.nextElementSibling
        return next && next.classList.contains('VueTables__child-row') ? next.querySelector('.wrap') : null
      }
      const openedWrap = wrapOf(tr)

      // 開いている場合は、畳んでから行を消す
      if(openedWrap) {
        this.collapseChildRow(openedWrap, () => this.$refs.table.toggleChildRow(key))
        return
      }

      this.loadEpisodes(key)
      this.$refs.table.toggleChildRow(key)
      this.$nextTick(() => {
        this.expandChildRow(wrapOf(tr))
        this.refreshScrollFades()
      })
    },
    expandChildRow: function(wrap) {
      if(!wrap) return
      const height = wrap.getBoundingClientRect().height
      wrap.style.overflow = 'hidden'
      wrap.style.height = '0px'
      // 0 を一度反映させてから動かす
      wrap.getBoundingClientRect()
      wrap.style.transition = `height ${CHILD_ROW_ANIM_MS}ms ease-out`
      wrap.style.height = `${height}px`
      this.afterHeightAnimation(wrap, () => {
        wrap.style.transition = ''
        wrap.style.height = ''
        wrap.style.overflow = ''
      })
    },
    collapseChildRow: function(wrap, done) {
      wrap.style.overflow = 'hidden'
      wrap.style.height = `${wrap.getBoundingClientRect().height}px`
      wrap.getBoundingClientRect()
      wrap.style.transition = `height ${CHILD_ROW_ANIM_MS}ms ease-in`
      wrap.style.height = '0px'
      this.afterHeightAnimation(wrap, done)
    },
    // transitionend は中の要素からも上がってくるので、高さの分だけ拾う。
    // 何かの拍子に来なかったときのために時間でも打ち切る
    afterHeightAnimation: function(wrap, done) {
      let finished = false
      const finish = () => {
        if(finished) return
        finished = true
        wrap.removeEventListener('transitionend', onEnd)
        done()
      }
      const onEnd = (e) => {
        if(e.target !== wrap || e.propertyName !== 'height') return
        finish()
      }
      wrap.addEventListener('transitionend', onEnd)
      setTimeout(finish, CHILD_ROW_ANIM_MS + 50)
    },
    filterByHosting: function(value) {
      this.hostingFilter = value
      // customFilters はイベントバス経由で値を渡す。
      // 検索ボックス（query）とは別に保持されるので、両方を同時に効かせられる
      VueTablesEvent.$emit('vue-tables.filter::hosting', value)
    },
    // 検索対象にする文字列。画面に出ている値で絞り込めるよう、
    // 日付は表示と同じ YYYY.MM.DD の形にしてから含める
    searchableText: function(row) {
      if(!this._searchableCache) this._searchableCache = {}
      if(this._searchableCache[row.key] == null) {
        this._searchableCache[row.key] = [
          row.key,
          row.title,
          row.hashtag,
          row.twitter,
          row.fileServer,
          row.durationMedian,
          frequencyLabel(row.updateInterval),
          row.total,
          this.$options.filters.formatDate(row.firstEpisodeDate),
          this.$options.filters.formatDate(row.lastEpisodeDate)
        ].filter(v => v != null && v !== '').join(' ').toLowerCase()
      }
      return this._searchableCache[row.key]
    },
    toggleAllCheckbox: function() {
      this.markedRows = this.allMarked ? [] : Object.keys(rss)
      this.allMarked = !this.allMarked
    },
    isIn: function(date, threshold){
      return jstDate(date, 'YYYY.MM.DD').isAfter(threshold)
    },
    // サイトへの登録が最近かどうか。added-at.json の日付は YYYY-MM-DD なので、
    // 表示用の YYYY.MM.DD を前提にした isIn とは分けている
    isRecentlyAdded: function(date){
      if(!date) return false
      return jstDate(date, 'YYYY-MM-DD').isAfter(this.addedThreshold)
    },
    downloadOpml: function(){
      const header = {
        "title": "podcast-freaks channel list",
        "dateCreated": new Date(),
        "ownerName": "podcast-freaks"
      }
      const outlines = this.markedRows.map((channelName)=>{
        const channel = rss[channelName]
        return {
          text: "txt",
          title: channelName,
          type: "rss",
          "xmlUrl": channel.feed
        }
      })
      var blob = new Blob([opml(header, outlines)], {type: "text/plain;charset=utf-8"})
      saveAs(blob, "podcast-freaks.opml")
    },
    loadRecentEpisodes: async function(rss) {
      const xml = await readFile(rss).catch(() => { return })
      if(!xml){
        error('readFile', dist_rss)
        return // catch内では、fetchFeedを抜けられないのでここでreturn
      }
      return xml
    },
    playEpisode: function(player) {
      // 一時停止から再開したときは自分自身が渡ってくる。
      // そこで止めてしまうと、押した直後に停止してしまう
      if(this.currentPlayer && this.currentPlayer !== player) {
        this.currentPlayer.stop()
      }
      this.currentPlayer = player
    }
  },
  head() {
    return {
      title: 'Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
