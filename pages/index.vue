<template lang="pug">
div.main
  v-client-table(:columns="columns" :data="data" :options="options")
    template(slot="cover" slot-scope="props")
      cover(:channel="props.row.key")
    template(slot="title" slot-scope="props")
      a(target="_blank" :href="props.row.link") {{ props.row.title }}
      br
      button.copy(type="button" v-clipboard:copy="props.row.feed" :title="props.row.feed") Copy RSS
    a(slot="twitter" slot-scope="props" target="_blank" :href="twitterLink(props.row.twitter)") {{props.row.twitter}}
    a(slot="hashtag" slot-scope="props" target="_blank" :href="hashtagLink(props.row.hashtag)") {{props.row.hashtag}}
    template(slot="firstEpisodeDate" slot-scope="props")
      a(v-if="props.row.firstEpisodeLink" :href="props.row.firstEpisodeLink" target="_blank") {{ props.row.firstEpisodeDate | formatDate }}
      template(v-else="props.row.firstEpisodeLink") {{ props.row.firstEpisodeDate | formatDate }}
    template(slot="lastEpisodeDate" slot-scope="props")
      a(v-if="props.row.lastEpisodeLink" :href="props.row.lastEpisodeLink" target="_blank") {{ props.row.lastEpisodeDate | formatDate }}
      template(v-else="props.row.lastEpisodeLink") {{ props.row.lastEpisodeDate | formatDate }}

</template>

<style lang="sass">
$purple: #650451

.main
  padding-top: 20px
  padding-bottom: 20px
  -webkit-overflow-scrolling: touch
  overflow-scrolling: touch
table
  border-collapse: collapse
  border-spacing: 0
th
  white-space: nowrap
th,td
  text-align: left
  vertical-align: top
  padding: 10px
  &:first-child
    padding-left: 20px
thead
  color: #ddd
  font-size: 12px
tbody
  th,td
    font-weight: 500
    font-size: 13px
    vertical-align: middle
  th
    font-weight: bold
  td.title
    font-weight: bold
    font-size: 15px
  td.total
    text-align: right
    font-size: 15px
  tr:nth-child(odd)
    background: #fbf7fd
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
  width: calc(100% - 120px)
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
    content: "▼"
    margin-left: 10px
    font-size: 0.7em
.glyphicon-chevron-up
  &:before
    content: "▲"
    margin-left: 10px
    font-size: 0.7em
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
  .VueTables
    .row
      padding-left: 15px
      padding-right: 15px
  .VueTables__search-field
    input
      width: calc(100% - 20px)
      padding: 9px
  th,td
    &:first-child
      padding-left: 15px
</style>

<script>
import axios from 'axios'
import moment from 'moment'
import xml2js from '~/lib/xml2js-promise'
import rss from '~/data/rss.json'
import build_info from '~/static/downloads/build_info.json'

export default {
  components: {
    'allpodcasts': require('~/components/allpodcasts.vue').default,
    'cover': require('~/components/cover.vue').default,
    'podcast': require('~/components/podcast.vue').default
  },
  data: function() {
    return {
      columns: [
        'cover',
        'title',
        'total',
        'firstEpisodeDate',
        'lastEpisodeDate',
        'averageDuration',
        'twitter',
        'hashtag',
        'fileServer'
      ],
      options: {
        columnsDropdown: true,
        columnsDisplay: {
          firstEpisodeDate: 'not_mobile',
          twitter: 'not_mobile',
          hashtag: 'not_mobile',
          fileServer: 'not_mobile'
        },
        columnsClasses: {
          cover: 'artwork',
          title: 'title',
          twitter: 'twitter',
          hashtag: 'hashtag',
          total: 'total',
          firstEpisodeDate: 'since',
          lastEpisodeDate: 'last',
          averageDuration: 'averate',
          fileServer: 'fileserver'
        },
        perPage: 9999,
        headings: {
          cover: 'Artwork',
          title: 'Title',
          twitter: 'Twitter',
          hashtag: 'Hashtag',
          total: 'Episodes',
          firstEpisodeDate: 'First Ep.',
          lastEpisodeDate: 'Last Ep.',
          averageDuration: 'Avarage time',
          fileServer: 'File server of sound files'
        },
        sortable: [
          'title',
          'twitter',
          'hashtag',
          'total',
          'firstEpisodeDate',
          'lastEpisodeDate',
          'averageDuration',
          'fileServer'
        ],
        texts: {
          filter: '',
          filterPlaceholder: 'Search'
        }
      },
      data: Object.values(build_info.channels)
    }
  },
  methods: {
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
    }
  }
}
</script>
