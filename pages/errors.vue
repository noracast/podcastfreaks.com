<template lang="pug">
.root
  p.lead
    | 直近のビルドで見つかった問題です。
    | フィードを直せる方に見ていただけるよう、検知したものはすべて出しています。

  section
    h2 取得できなかった番組
    p.count {{ errors.length }}件
    p.empty(v-if="errors.length === 0") ありません
    ul.list(v-else)
      li(v-for="item in errors" :key="item.rss")
        .key {{ item.key }}
        .message {{ item.message }}
        a.feed(v-if="item.feed" :href="item.feed" target="_blank" rel="noopener") {{ item.feed }}

  //- ビルドは通るが、直せるなら直したいもの。
  //- 音声を持たないフィード、収録時間の書式、カバー画像、壊れた XML など
  section(v-for="group in warningGroups" :key="group.label")
    h2 {{ group.title }}
    p.count {{ group.items.length }}件
    ul.list
      li(v-for="item in group.items" :key="item.rss + item.message")
        .key {{ item.key }}
        .message {{ item.message }}
        a.feed(v-if="item.feed" :href="item.feed" target="_blank" rel="noopener") {{ item.feed }}

  p.empty(v-if="errors.length === 0 && warningGroups.length === 0") 問題は見つかりませんでした。

  details.raw
    summary 生データ
    pre(v-highlightjs)
      code.javascript(v-html="raw")
</template>

<style lang="sass" scoped>
.root
  padding: 20px
  max-width: 700px
  .lead
    color: #666
    font-size: 13px
    line-height: 1.7
    margin-bottom: 30px
  section
    margin-bottom: 40px
  h2
    font-size: 16px
    margin-bottom: 3px
  .count
    color: #999
    font-size: 12px
    margin-bottom: 10px
  .empty
    color: #999
    font-size: 13px
  .list
    list-style: none
    padding: 0
    li
      padding: 10px 0
      border-top: 1px solid #eee
      &:last-child
        border-bottom: 1px solid #eee
    .key
      font-weight: bold
      font-size: 14px
    .message
      font-size: 13px
      color: #444
      margin-top: 2px
    .feed
      font-size: 12px
      color: #999
      word-break: break-all
  .raw
    margin-top: 40px
    summary
      color: #999
      font-size: 12px
      cursor: pointer
</style>

<script>
import build_info from '@/static/downloads/build_info.json'
import rss from '@/data/rss.json'

// 警告の種類ごとの見出し。ここに無い label は「そのほか」にまとめる
const WARNING_TITLES = {
  podcastCheck: '音声を持たない番組',
  durationCheck: '収録時間を読み取れない番組',
  coverImage: 'カバー画像を取得できない番組',
  xmlFix: 'XML が壊れている番組',
  validate: 'data/rss.json の問題'
}

// 'static/downloads/rss/backspace.rss' -> 'backspace'
const keyOf = (path) => String(path || '').replace(/^.*\//, '').replace(/\.rss$/, '')

const decorate = (item, message) => {
  const key = keyOf(item.rss)
  return {
    rss: item.rss,
    key,
    message,
    feed: rss[key] ? rss[key].feed : null
  }
}

export default {
  data() {
    // まだ warnings を持たない build_info.json でも表示が壊れないようにする
    const warnings = build_info.warnings || []

    const groups = []
    Object.keys(WARNING_TITLES).forEach(label => {
      const items = warnings.filter(w => w.label === label)
      if(items.length) groups.push({ label, title: WARNING_TITLES[label], items: items.map(w => decorate(w, w.message)) })
    })
    const others = warnings.filter(w => !WARNING_TITLES[w.label])
    if(others.length) groups.push({ label: 'other', title: 'そのほか', items: others.map(w => decorate(w, `${w.label} | ${w.message}`)) })

    return {
      errors: build_info.errors.map(e => decorate(e, (e.error && e.error.message) || e.label)),
      warningGroups: groups,
      raw: { errors: build_info.errors, warnings }
    }
  },
  head() {
    return {
      title: 'Errors | Podcast Freaks - Japanese techie podcast archive'
    }
  }
}
</script>
