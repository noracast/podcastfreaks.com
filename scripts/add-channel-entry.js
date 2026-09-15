"use strict";

// data/rss.json に番組を1つ足す（issue #231）。
//
// JSON.parse して stringify し直すと、ファイル全体の見た目が変わって
// 差分が読めなくなる（234件が全部並び替わったように見える）。**足す1件ぶんの
// 行だけを挿し込む**形にして、他の行は1バイトも動かさない。
//
// 並びはキーの順。素の比較（数字 → 大文字 → 小文字）で、いまのファイルに
// 揃えてある。1箇所だけ逆転している既存の並び（yurufuwaan と webtidbitfm）は
// そのままにする。直すのはこの処理の仕事ではない。

// 「  "key": {」の行。キーは \" を含みうるので、素朴な [^"]* では足りない
const KEY_LINE = /^ {2}"((?:[^"\\]|\\.)*)"\s*:\s*\{$/

// JSON の文字列として書く。日本語はそのまま（ファイルが読めるように）
const str = (value) => value == null || value === '' ? 'null' : JSON.stringify(String(value))

export function entryBlock({ key, feed, twitter, hashtag }) {
  return [
    `  ${JSON.stringify(key)}: {`,
    `    "feed": ${JSON.stringify(feed)},`,
    `    "twitter": ${str(twitter)},`,
    `    "hashtag": ${str(hashtag)}`,
    '  }'
  ].join('\n')
}

// text は data/rss.json の中身そのまま。足したあとの中身を返す。
// 足せないときは理由を投げる（呼ぶ側が issue にコメントする）
export default function addChannelEntry(text, entry) {
  const { key, feed } = entry
  if (!key) throw new Error('キーがありません')
  if (!feed) throw new Error('フィードの URL がありません')

  const lines = String(text).split('\n')
  const keyLines = []
  lines.forEach((line, index) => {
    const matched = KEY_LINE.exec(line)
    if (matched) keyLines.push({ key: JSON.parse(`"${matched[1]}"`), index })
  })

  if (keyLines.some(k => k.key === key)) throw new Error(`キー "${key}" はすでに使われています`)
  // 同じフィードが別のキーで入っていないか。素朴に文字列で見る
  // （細かい突き合わせは scripts/check-register-request.js でやっている）
  if (text.includes(`"feed": ${JSON.stringify(feed)}`)) throw new Error(`このフィードはすでに登録されています: ${feed}`)

  const block = entryBlock(entry)
  const next = keyLines.find(k => k.key > key)

  if (next) {
    // 手前に挿し込む。自分のうしろにはカンマが要る
    lines.splice(next.index, 0, ...(block + ',').split('\n'))
  } else {
    // 一番うしろ。直前の項目の閉じ括弧にカンマを足してから続ける
    const last = keyLines[keyLines.length - 1]
    if (!last) throw new Error('data/rss.json の形が読めません')
    // 最後の項目の終わりは「  }」の行。そのあとにファイル全体の「}」が来る
    let closing = lines.length - 1
    while (closing >= 0 && lines[closing].trim() !== '}') closing--
    const lastEntryEnd = closing - 1
    if (lines[lastEntryEnd] !== '  }') throw new Error('data/rss.json の形が読めません')
    lines[lastEntryEnd] = '  },'
    lines.splice(lastEntryEnd + 1, 0, ...block.split('\n'))
  }

  return lines.join('\n')
}
