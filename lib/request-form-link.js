// /request/ のフォームへ、調べた結果を持って行くリンクを作る。
//
// /add で番組が分かっていても、GitHub のアカウントが無い人はフォームへ回る。
// そこで同じことをもう一度入力させない。フォーム側（pages/request.vue）は
// クエリを読んで初期値に入れる。
//
// 渡すのは、フォームに欄があるものだけ（feed と message）。X とハッシュタグは
// /add では調べていない（iTunes は返さない）ので触らない。

export default function requestFormLink({ channel = {}, source = {} } = {}) {
  const params = new URLSearchParams()

  if(channel.feed) params.set('feed', channel.feed)

  // 番組名と、見ていたページ。フォームの本文に入れておくと、
  // フィードが分からないまま送られても、こちらで追える
  const message = [
    channel.title ? `番組名: ${channel.title}` : '',
    source.url ? `見ていたページ: ${source.url}` : '',
    channel.apple ? `Apple Podcasts: ${channel.apple}` : ''
  ].filter(Boolean).join('\n')
  if(message) params.set('message', `${message}\n\n登録をお願いします。`)

  const query = params.toString()
  return query ? `/request/?${query}` : '/request/'
}
