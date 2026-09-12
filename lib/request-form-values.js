// 調べた結果を、送信フォームの初期値にする。
//
// /request/ は「URL から番組を調べる」ところと「フォームで送る」ところが
// 同じページにある。番組が分かっている人に、同じことを二度入力させない。
//
// 渡すのは、フォームに欄があるものだけ（feed と message）。X とハッシュタグは
// 調べていない（iTunes は返さない）ので触らない。

export default function requestFormValues({ channel = {}, source = {} } = {}) {
  const values = {}

  if(channel.feed) values.feed = channel.feed

  // すでに載っている番組から来た人の用は「登録」ではなく「修正」。
  // 同じ文面で送らせると、受け取った側が読み違える
  const registered = channel.matched && channel.matched.length ? channel.matched[0] : null

  // 番組名と、見ていたページ。フォームの本文に入れておくと、
  // フィードが分からないまま送られても、こちらで追える
  const message = [
    channel.title ? `番組名: ${channel.title}` : '',
    source.url ? `見ていたページ: ${source.url}` : '',
    channel.apple ? `Apple Podcasts: ${channel.apple}` : '',
    registered ? `登録済み: ${registered.key}` : ''
  ].filter(Boolean).join('\n')
  const ask = registered ? '修正したい点をご記入ください。' : '登録をお願いします。'
  if(message) values.message = `${message}\n\n${ask}`

  return values
}
