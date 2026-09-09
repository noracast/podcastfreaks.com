<template lang="pug">
div.root
  button.download(@click="downloadOpml" :disabled="markedRows.length == 0" ref="downloadBtn") Download OPML
  v-client-table(:columns="columns" :data="channels" :options="options" ref="table")
    template(slot="cover" slot-scope="props")
      cover.cover(:channel="props.row.key" @click.native="toggleChildRow(props.row.key)" title="Click to show detail")
    template(slot="title" slot-scope="props")
      .title-cell
        .clip
          //- .value をタイトルの文字幅に沿わせ、その右上にバッジを置く。
          //- 省略は内側の .text が受け持つので、バッジは省略に巻き込まれない
          span.value
            span.new(v-if="isRecentlyAdded(props.row.addedAt)" :title="`${props.row.addedAt} に登録`") New!
            //- 省略された場合に全体を確認できるよう title 属性を付ける
            span.text(:title="props.row.title" @click.self="toggleChildRow(props.row.key)") {{ props.row.title }}
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
        .info
          p.description(v-if="props.row.desciprtion" v-html.raw="props.row.desciprtion")
          p.description(v-else) No description
          button-text(v-if="props.row.link" :text="props.row.link" :buttonText="'Open Web'" buttonAction="'open'")
          button-text(:text="props.row.feed" :buttonText="'Copy RSS'")
        .episodes
          episode-player(v-for="(ep, i) in props.row.recentEpisodes" :key="i" :episode="ep" @play="playEpisode")

</template>

<style lang="sass" scoped>
@use 'sass:color'

$color_new: #e100ff
// ソートアイコンの占有幅。ラベルの位置合わせにも使う
$sort_icon_width: 1.6em

.download
  margin-right: 20px
  position: absolute
  width: 150px
  top: 20px
  right: 0

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
              >*:not(:first-child)
                margin-left: 6px


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
            >.info
              width: calc(50% - 40px)
              padding: 20px
            >.episodes
              width: 50%
              borde-left: 1px solid #333

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

.small
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
    tr
      &.VueTables__child-row
        td > .wrap
          flex-direction: column
          >.episodes
            width: 100%
            border-top: 1px solid #333
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
      channels: Object.values(build_info.channels)
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
  },
  methods: {
    toggleChildRow: function(key){
      this.$refs.table.toggleChildRow(key)
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
      if(this.currentPlayer) {
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
