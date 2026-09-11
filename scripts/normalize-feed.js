"use strict";

// xml2js（explicitArray: false）でパースした結果を RSS 2.0 の channel の形に揃える。
//
// fetch-feeds.js より下流は rss.channel / channel.item の形を前提にしているため、
// Atom の差異はここで吸収する。対応していない形式なら null を返す。
//
// 揃える先の形:
//   { title, link, description, image: { url }, 'itunes:image',
//     'itunes:block', 'podcast:block', item: [...] }
//   item: { title, link, pubDate, enclosure: { $: { url } }, 'itunes:duration' }

const asArray = (value) => value == null ? [] : (Array.isArray(value) ? value : [value])

// <title type="text">foo</title> のように属性が付くと
// xml2js は { _: 'foo', $: {...} } を返すため、テキストだけを取り出す
const text = (value) => {
  if (typeof value === 'string') return value
  if (value && typeof value._ === 'string') return value._
  return null
}

// Atom の <link> は rel 違いで複数並ぶ。rel を省略すると本文へのリンクを探す
const findLink = (node, rel) => asArray(node && node.link)
  .map(link => (link && link.$) ? link.$ : link)
  .find(link => link && link.href && (rel ? link.rel === rel : (!link.rel || link.rel === 'alternate')))

export default function normalizeFeed(json) {
  if (json && json.rss && json.rss.channel) return json.rss.channel
  if (json && json.feed) return fromAtom(json.feed)
  return null
}

function fromAtom(feed) {
  const alternate = findLink(feed)

  return {
    title: text(feed.title),
    link: alternate ? alternate.href : null,
    description: text(feed.subtitle) || text(feed.summary),
    // カバー画像は itunes:image が最優先。無ければ Atom の logo / icon を使う
    'itunes:image': feed['itunes:image'],
    // 掲載拒否の指定。fetch-feeds が見るので、Atom でも落とさずに渡す
    'itunes:block': feed['itunes:block'],
    'podcast:block': feed['podcast:block'],
    image: { url: text(feed.logo) || text(feed.icon) || null },
    item: asArray(feed.entry).map(fromAtomEntry)
  }
}

function fromAtomEntry(entry) {
  const alternate = findLink(entry)
  const enclosure = findLink(entry, 'enclosure')

  return {
    title: text(entry.title),
    link: alternate ? alternate.href : null,
    // Atom の日付は RFC3339（ISO 8601）。parse-pub-date.js が両方を受け付ける
    pubDate: text(entry.published) || text(entry.updated) || null,
    enclosure: enclosure ? { $: { url: enclosure.href } } : undefined,
    'itunes:duration': entry['itunes:duration']
  }
}
