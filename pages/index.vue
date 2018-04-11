<template>
  <div>
    <ul>
      <li v-for="item in data">
        <a v-bind:href="item.link">
          {{item.title}}
        </a>
      </li>
    </ul>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  asyncData ({params}, callback) {
    axios.get(`http://feeds.rebuild.fm/rebuildfm`)
      .then((res) => {
        var parseString = require('xml2js').parseString
        var xml = res.data
        parseString(xml, (message, xmlres) => {
          callback(null, {data: xmlres.rss.channel[0].item})
        })
      })
      .catch((e) => {
        callback({ statusCode: 404, message: 'ページが見つかりません' })
      })
  }
}
</script>

<style>
</style>