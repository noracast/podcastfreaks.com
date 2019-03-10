<template lang="pug">
div.main
  button.download(@click="downloadOpml" v-bind:disabled="markedRows.length == 0")
    span.pc Download OPML
    span.sp OPML
  v-client-table(:columns="columns" :data="data" :options="options" ref="table")
    template(slot="download" slot-scope="props")
      input(type="checkbox" :value="props.row.key" v-model="markedRows")
    template(slot="cover" slot-scope="props")
      cover.cover(:channel="props.row.key" @click.native="toggleChildRow(props.row.key)" title="Click to show detail")
    template(slot="title" slot-scope="props")
      a(target="_blank" :href="props.row.link") {{ props.row.title }}
    template(slot="averageDuration" slot-scope="props") {{ props.row.averageDuration | roughlyTime }}
    a(slot="twitter" slot-scope="props" target="_blank" :href="twitterLink(props.row.twitter)") {{props.row.twitter}}
    a(slot="hashtag" slot-scope="props" target="_blank" :href="hashtagLink(props.row.hashtag)") {{props.row.hashtag}}
    template(slot="firstEpisodeDate" slot-scope="props")
      a(v-if="props.row.firstEpisodeLink" :href="props.row.firstEpisodeLink" target="_blank") {{ props.row.firstEpisodeDate | formatDate }}
      template(v-else="props.row.firstEpisodeLink") {{ props.row.firstEpisodeDate | formatDate }}
    template(slot="lastEpisodeDate" slot-scope="props")
      a(v-if="props.row.lastEpisodeLink" :href="props.row.lastEpisodeLink" target="_blank") {{ props.row.lastEpisodeDate | formatDate }}
      template(v-else="props.row.lastEpisodeLink") {{ props.row.lastEpisodeDate | formatDate }}
    template(slot="child_row" slot-scope="props")
      | {{ props.row.desciprtion }}
      br(v-if="props.row.desciprtion")
      p.feed
        button.copy(v-clipboard:copy="props.row.feed" :title="props.row.feed") Copy RSS
        span(type="text" readonly="readonly") {{ props.row.feed }}
</template>

<style lang="sass">
$purple: #650451

.main
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
  .sp
    display: none
  &:disabled
    color: rgba(255,255,255,0.7)
    cursor: not-allowed
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
  td.title
    font-weight: bold
    font-size: 15px
  td.total
    text-align: right
    font-size: 18px
  tr
    &:first-child
      border-top: 1px solid #ccc
    &:not(.VueTables__child-row)
      border-top: 1px solid #ccc
    &.VueTables__child-row
      border-top: 1px dotted #eee
      background-image: url(/img/slant-bg.png)
      background-color: #e4e4e4
      background-size: 15%
      td
        padding: 20px
        line-height: 1.8em
      a
        color: #ccc
        transition-duration: 0.2s
        &:hover
          color: #000
          transition-duration: 0.2s

  button
    font-size: 10px
    padding: 5px 10px
    min-width: initial
.cover
  cursor: pointer
  transition-duration: 0.2s
  overflow: hidden
  &:before
    content: 'Info.'
    color: white
    font-size: 10px
    font-weight: bold
    background-color: rgba(0,0,0,0.6)
    display: flex
    justify-content: center
    align-items: center
    width: 100%
    height: 100%
    opacity: 0
    transition-duration: 0.2s
  &:hover
    &:before
      opacity: 1
      transition-duration: 0.2s
.table-responsive
  overflow: auto
  width: 100%
  margin-top: 15px
.VueTables
  .row
    padding-left: 20px
    padding-right: 20px
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
    color: $purple
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
  button
    display: inline-block
    margin: 0
    border-radius: 3px 0 0 3px
  span
    border: 0
    display: inline-block
    outline: 0
    background: none
    background-color: #efefef
    border-radius: 0 3px 3px 0
    display: inline-block
    padding: 0 10px 0 10px
    margin: 0
    font-size: 11px

button
  display: block
  border-radius: 3px
  background: $purple
  color: white
  font-size: 12px
  font-weight: bold
  padding: 10px 20px
  min-width: 100px
  outline: none
  border: 0
  cursor: pointer
  &:active
    background: lighten($purple, 10)

.copy
  margin-top: 7px

.small
  .main
    padding-top: 10px
    padding-bottom: 15px
  table
    margin-top: 15px
  button
    font-size: 10px
  .download
    top: 70px
    width: 100px
    .pc
      display: none
    .sp
      display: inline
  .VueTables
    .row
      padding-left: 15px
      padding-right: 15px
  .VueTables__columns-dropdown
    .dropdown-menu
      right: 15px
  .VueTables__search
    width: 100%
  .VueTables__search-field
    input
      width: calc(100% - 20px)
      padding: 9px
  .VueTables__columns-dropdown
    clear: left
  th,td
    &:nth-child(2)
      padding-left: 15px
  tr
    &.VueTables__child-row
      td
        padding: 15px
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
          averageDuration: 'averate'
        },
        perPage: 9999,
        headings: {
          cover: '',
          title: 'Title',
          twitter: 'Twitter',
          hashtag: 'Hashtag',
          total: 'Episodes',
          firstEpisodeDate: 'First Ep.',
          lastEpisodeDate: 'Last Ep.',
          averageDuration: 'Avarage time',
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
