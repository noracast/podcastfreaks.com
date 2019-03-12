<template lang="pug">
div#index
  button.download(@click="downloadOpml" :disabled="markedRows.length == 0" ref="downloadBtn") Download OPML
  v-client-table(:columns="columns" :data="data" :options="options" ref="table")
    template(slot="download" slot-scope="props")
      input(type="checkbox" :value="props.row.key" v-model="markedRows")
    template(slot="cover" slot-scope="props")
      i.updated(v-if="isNew(props.row.lastEpisodeDate)" title="New episode!")
      cover.cover(:channel="props.row.key" @click.native="toggleChildRow(props.row.key)" title="Click to show detail")
    template(slot="title" slot-scope="props")
      a(target="_blank" :href="props.row.link") {{ props.row.title }}
    template(slot="averageDuration" slot-scope="props")
      span(:class="convertToClass(props.row.averageDuration)" v-if="props.row.averageDuration")| {{ props.row.averageDuration | roughlyTime }}
    a(slot="twitter" slot-scope="props" target="_blank" :href="twitterLink(props.row.twitter)") {{props.row.twitter}}
    a(slot="hashtag" slot-scope="props" target="_blank" :href="hashtagLink(props.row.hashtag)") {{props.row.hashtag}}
    template(slot="firstEpisodeDate" slot-scope="props")
      a(v-if="props.row.firstEpisodeLink" :href="props.row.firstEpisodeLink" target="_blank") {{ props.row.firstEpisodeDate | formatDate }}
      template(v-else="props.row.firstEpisodeLink") {{ props.row.firstEpisodeDate | formatDate }}
    template(slot="lastEpisodeDate" slot-scope="props")
      a(v-if="props.row.lastEpisodeLink" :href="props.row.lastEpisodeLink" target="_blank") {{ props.row.lastEpisodeDate | formatDate }}
      template(v-else="props.row.lastEpisodeLink") {{ props.row.lastEpisodeDate | formatDate }}
    template(slot="child_row" slot-scope="props")
      template(v-if="isNew(props.row.lastEpisodeDate)")
        a.updated(v-if="props.row.lastEpisodeLink" :href="props.row.lastEpisodeLink" target="_blank") New episode!
        span.updated(v-else) New episode!

      p.description(v-if="props.row.desciprtion") {{ props.row.desciprtion }}
      p.feed
        button.copy(v-clipboard:copy="props.row.feed" :title="props.row.feed") Copy RSS
        span(type="text" readonly="readonly") {{ props.row.feed }}
</template>

<style lang="sass">
$color_update: #8ffe5c

#index
  padding-top: 20px
  padding-bottom: 20px
  -webkit-overflow-scrolling: touch
  overflow-scrolling: touch
  position: relative
.download
  margin-right: 20px
  position: absolute
  width: 150px
  top: 20px
  right: 110px
table
  border-collapse: collapse
  border-spacing: 0
  width: 100%
th
  white-space: nowrap
th,td
  text-align: left
  vertical-align: top
  padding: 10px
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
    i.updated
      display: block
      width: 14px
      height: 14px
      background: $color_update
      border-radius: 14px
      z-index: 2
      position: absolute
      top: 3px
      left: 11px
      border: 2px solid white
  td.title
    font-weight: bold
    font-size: 15px
  td.total
    text-align: right
    font-size: 18px
  td.average
    span
      padding: 3px 5px
      border-radius: 3px
      background-color: #ccc
      color: white
      &.min0-15
        background-color: #89ef83
      &.min15-30
        background-color: #76dde8
      &.min30-45
        background-color: #4abbff
      &.min45-60
        background-color: #0064ff
      &.min60-90
        background-color: #2a67a9
      &.min90-120
        background-color: #7f00ff

  tr
    &:first-child
      border-top: 1px solid #ccc
    &:not(.VueTables__child-row)
      border-top: 1px solid #ccc
    &.VueTables__child-row
      border-top: 1px dotted #eee
      background-image: url(/img/slant-bg.png)
      background-color: #e4e4e4
      background-size: auto 168px
      td
        padding: 20px
        line-height: 1.8em
      a
        color: #ccc
        transition-duration: 0.2s
        &:hover
          color: #000
          transition-duration: 0.2s
      .updated
        font-weight: bold
        background-color: $color_update
        color: darken($color_update, 40%)
        display: inline
        padding: 7px 10px
        font-size: 10px
        border-radius: 3px
      a.updated:hover
        background-color: darken($color_update, 40%)
        color: white
      p:not(.feed)
        max-width: calc(100vw - 30px)
        &:first-child
          margin-top: 0

  button
    font-size: 10px
    padding: 5px 10px
    min-width: initial
.table-responsive
  overflow: auto
  width: 100%
  margin-top: 15px
.VueTables
  .row
    padding-left: 20px
    padding-right: 20px
  .cover
    cursor: pointer
    transition-duration: 0.2s
    overflow: hidden
    &:before
      content: 'SHOW\AINFO.'
      white-space: pre
      color: white
      font-size: 10px
      line-height: 1.4em
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
.glyphicon-chevron-down
  &:before
    content: '▼'
    margin-left: 10px
    font-size: 0.7em
.glyphicon-chevron-up
  &:before
    content: '▲'
    margin-left: 10px
    font-size: 0.7em
.feed
  display: flex
  align-items: center
  height: 30px
  margin-bottom: 0
  &:first-child
    margin-top: 0
  button
    height: 100%
    width: 80px
    margin: 0
    border-radius: 3px 0 0 3px
    display: flex
    align-items: center
    justify-content: center
    flex-shrink: 0
  span
    height: 100%
    border: 0
    outline: 0
    background: none
    background-color: #4c4c4c
    color: #ccc
    border-radius: 0 3px 3px 0
    padding: 0 10px
    margin: 0
    font-size: 11px
    display: flex
    align-items: center
.copy
  margin-top: 7px


.small
  #index
    padding-top: 10px
    padding-bottom: 15px
  table
    margin-top: 15px
  tbody
    th,td
      font-size: 11px
    td.artwork
      i.updated
        left: 6px

  button
    font-size: 10px
  .download
    top: 74px
    width: 130px
  .VueTables
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
      td
        padding: 15px
  .description
    max-width: calc(100vw - 30px)
    text-align: justify
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'
import opml from 'opml-generator'
import { saveAs } from 'file-saver'

export default {
  components: {
    'allpodcasts': require('~/components/allpodcasts.vue').default,
    'cover': require('~/components/cover.vue').default,
    'podcast': require('~/components/podcast.vue').default
  },
  data: function() {
    return {
      newThreshold: moment().subtract(3, 'days').startOf('date'),
      allMarked: false,
      markedRows: [],
      columns: [
        'cover',
        'title',
        'total',
        'lastEpisodeDate',
        'averageDuration',
        'twitter',
        'hashtag',
        'firstEpisodeDate',
        'download'
      ],
      options: {
        columnsDropdown: true,
        columnsDisplay: {
          firstEpisodeDate: 'not_mobile',
          twitter: 'not_mobile',
          hashtag: 'not_mobile'
        },
        columnsClasses: {
          cover: 'artwork',
          title: 'title',
          twitter: 'twitter',
          hashtag: 'hashtag',
          total: 'total',
          firstEpisodeDate: 'since',
          lastEpisodeDate: 'last',
          averageDuration: 'average'
        },
        perPage: 9999,
        headings: {
          cover: '',
          title: 'Title',
          twitter: 'Twitter',
          hashtag: 'Hashtag',
          total: 'Episodes',
          firstEpisodeDate: 'First Episode',
          lastEpisodeDate: 'Last Episode',
          averageDuration: 'Avarage Duration',
          download: function(h){
            const self = this;
            return h('input', {
              attrs: { type: 'checkbox' },
              domProps: { value: self.value },
              class: 'form-control check-all',
              on: {
                change: self.toggleAll,
                input: function(event) {
                  self.value = event.target.value
                  self.$emit('input', event.target.value)
                }
              }
            })
          }
        },
        headingsTooltips: {
          download: 'Check to download OPML'
        },
        sortable: [
          'title',
          'twitter',
          'hashtag',
          'total',
          'firstEpisodeDate',
          'lastEpisodeDate',
          'averageDuration'
        ],
        texts: {
          filter: '',
          filterPlaceholder: 'Search'
        },
        uniqueKey: 'key'
      },
      data: Object.values(build_info.channels)
    }
  },
  methods: {
    toggleChildRow: function(key){
      this.$refs.table.toggleChildRow(key)
    },
    twitterLink: function(str) {
      if(str != null) {
        return `https://twitter.com/${str.replace('@','')}`
      }
      return ''
    },
    convertToClass: function(str){
      if(str){
        return this.$options.filters.roughlyTime(str).replace(/([\d-]+)(\w*)/,'$2$1')
      }
    },
    hashtagLink: function(str) {
      if(str != null) {
        return `https://twitter.com/search?q=%23${str.replace('#','')}`
      }
      return ''
    },
    toggleAll: function() {
      this.markedRows = this.allMarked ? [] : Object.keys(rss)
      this.allMarked = !this.allMarked
    },
    isNew: function(date){
      return moment(date, 'YYYY.MM.DD').isAfter(this.newThreshold)
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
    }
  }
}
</script>
