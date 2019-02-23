<template lang="pug">
div
  h2 Channels
  //- h5 {{ channels.length }}
  v-client-table(:columns="columns" :data="data" :options="options")
    template(slot="cover" slot-scope="props")
      nuxt-link(:to="'/channels/'+props.row.key")
        cover(:channel="props.row.key")
    template(slot="title" slot-scope="props")
      a(target="_blank" :href="props.row.link") {{ props.row.title }}
      br
      button.copy(type="button" v-clipboard:copy="props.row.feed" :title="props.row.feed") Copy RSS
    a(slot="twitter" slot-scope="props" target="_blank" :href="twitterLink(props.row.twitter)") {{props.row.twitter}}
    a(slot="hashtag" slot-scope="props" target="_blank" :href="hashtagLink(props.row.hashtag)") {{props.row.hashtag}}
    template(slot="firstDate" slot-scope="props") {{ props.row.firstDate | formatDate }}
    template(slot="lastDate" slot-scope="props") {{ props.row.lastDate | formatDate }}

</template>

<style lang="sass">
th
  white-space: nowrap
th,td
  text-align: left
  vertical-align: top
  padding: 10px

thead
  color: #ddd
  font-size: 12px
tbody
  th,td
    border-top: 1px solid #ddd
    font-weight: 500
    font-size: 15px
    vertical-align: middle

  th
    font-weight: bold
  td.cover
    padding-right: 10px
.table-responsive
  overflow: auto
  width: 100%
.copy
  font-size: 8px
  display: inline-block
  width: 80px

.VueTables__search-field
  margin-bottom: 20px
  input
    padding: 7px
    outline: none
    font-size: 13px
    border-radius: 4px
    border: 1px solid #ccc
    width: 300px
    &:placeholder-shown
      color: #ccc
    &::-webkit-input-placeholder
      color: #ccc
    &::-moz-placeholder
      color: #ccc

.VueTables__limit
  display: none
.glyphicon-chevron-down
  &:before
    content: "↓"
    margin-left: 10px
.glyphicon-chevron-up
  &:before
    content: "↑"
    margin-left: 10px
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
        'twitter',
        'hashtag',
        'total',
        'firstDate',
        'lastDate',
        'fileServer'
      ],
      options: {
        perPage: 9999,
        headings: {
          cover: '',
          title: 'Title',
          twitter: 'Twitter',
          hashtag: 'Hashtag',
          total: 'Total episodes',
          firstDate: 'First episode',
          lastDate: 'Last episode',
          fileServer: 'File server of sound files'
        },
        sortable: [
          'title',
          'twitter',
          'hashtag',
          'total',
          'firstDate',
          'lastDate',
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
