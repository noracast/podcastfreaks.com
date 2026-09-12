<template>
  <div class="root">
    <h2>番組の登録リクエスト</h2>
    <!-- 文の途中に改行を入れると出力に半角空白が入るので、段落は1行で書く -->
    <p>登録してほしい番組の URL を入れると、配信元の RSS フィードを探して、登録済みかどうかまで調べます。Spotify・Apple Podcasts・YouTube・番組サイト、どのページの URL でも構いません。</p>

    <form @submit.prevent="lookup">
      <label for="url">番組の URL</label>
      <small>番組のページなら、どのサービスのものでも構いません</small>
      <br>
      <input id="url" v-model="url" type="url" placeholder="https://open.spotify.com/show/...">

      <label for="name">番組名</label>
      <small>URL から見つからないときの手がかりにします。分かる範囲で構いません</small>
      <br>
      <input id="name" v-model="name" type="text" placeholder="fukabori.fm">

      <button type="submit" :disabled="loading || (!url && !name)">{{ loading ? '探しています…' : '探す' }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="searched && !loading">
      <h3>{{ candidates.length ? '見つかった番組' : '見つかりませんでした' }}</h3>

      <ul v-if="candidates.length" class="candidates">
        <li v-for="channel in candidates" :key="channel.feed">
          <img v-if="channel.artwork" class="cover" :src="channel.artwork" :alt="channel.title" width="80" height="80">
          <div class="detail">
            <p class="title">{{ channel.title }}</p>
            <p class="meta">{{ channelMeta(channel) }}</p>
            <p class="feed">{{ channel.feed }}</p>
            <!-- 登録済みかどうかは static/registered.json と突き合わせている。
                 フィード URL と番組名のどちらかが当たれば「登録済みの可能性」
                 として出す。完全一致だけでは取りこぼすため。

                 送り先をトップにしているのは、番組ごとの URL がまだ無いため。
                 番組の個別ページ（/channels/<key>/ のようなもの）ができたら、
                 matched[0].key からその URL へ変える -->
            <p v-if="channel.matched.length" class="registered">
              この番組は登録済みのようです（<code>{{ channel.matched[0].key }}</code>{{ channel.matched[0].matchedBy === 'title' ? ' / 番組名が一致' : '' }}）。<nuxt-link to="/">一覧</nuxt-link>でご確認ください。フィードの URL が変わったなどのご連絡は<nuxt-link to="/request/">リクエストフォーム</nuxt-link>からお願いします。
            </p>
            <div v-else class="actions">
              <a-blank class="send" :href="issueUrl(channel)">GitHub で登録をリクエストする</a-blank>
              <a-blank v-if="channel.apple" class="apple" :href="channel.apple">Apple Podcasts で見る</a-blank>
            </div>
          </div>
        </li>
      </ul>

      <p v-else class="note">Apple Podcasts に登録されている番組なら、番組名で見つかります。番組名を変えて試すか、<nuxt-link to="/request/">リクエストフォーム</nuxt-link>から RSS フィードの URL を直接お知らせください。</p>

      <!-- 送り先の案内は、まだ登録されていない番組があるときだけ出す -->
      <p v-if="sendable" class="note">GitHub のアカウントをお持ちでない場合は、<nuxt-link to="/request/">リクエストフォーム</nuxt-link>からお送りください。<br>いただいたリクエストは、フィードの中身（音声を持っているか、配信者が掲載を止めていないか）を確認したうえで登録します。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。</p>

      <p v-if="!registeredAvailable" class="note">※ 登録済みかどうかの判定ができませんでした（一覧の取得に失敗しています）。すでに載っている番組かもしれません。</p>
    </template>

    <h3>Bookmarklet</h3>
    <p>ブックマークバーに入れておくと、番組のページを見ているときに押すだけで、その URL とタイトルをこのページへ渡せます。</p>
    <!-- href は javascript: のまま。押しても何も起きないよう既定の動作は止める
         （このページで押すと、このページ自身を調べに行ってしまう）。
         代わりにコードをコピーして、ドラッグできない環境の逃げ道にする -->
    <p class="bookmarklet-box">
      <a class="bookmarklet" :href="bookmarklet" @click.prevent="copyBookmarklet">Podcast Freaks に登録</a>
      <span v-if="copied" class="copied">コピーしました</span>
    </p>
    <ol class="note">
      <li>上のボタンを<strong>ブックマークバーへドラッグ</strong>する（名前は好きに変えて構いません）</li>
      <li>ブックマークバーが出ていなければ、Chrome・Safari とも <code>⌘ + Shift + B</code> で出せます</li>
      <li>ドラッグできない場合（iOS など）は、上のボタンを押すとコードをコピーします。適当なページをブックマークに追加して開き直し、その URL の欄にコピーしたものを貼り替えてください</li>
    </ol>
  </div>
</template>

<style scoped>
.root {
  padding: 20px;
  max-width: 600px;
}
form {
  margin-top: 40px;
  & label {
    display: block;
    font-weight: bold;
    font-size: 16px;
    &:not(:nth-of-type(1)) {
      margin-top: 20px;
    }
  }
  & input {
    font-size: 16px;
    padding: 10px;
    max-width: 600px;
    width: calc(100% - 20px);
    outline: none;
    border: 1px solid #ccc;
    margin-top: 5px;
    &::placeholder {
      color: #ccc;
    }
  }
  & button {
    margin-top: 20px;
  }
}
.error {
  color: #c00;
}
.candidates {
  list-style: none;
  padding: 0;
  & li {
    display: flex;
    gap: 15px;
    padding: 15px 0;
    &:not(:first-child) {
      border-top: 1px solid #e8e8e8;
    }
  }
  & .cover {
    width: 80px;
    height: 80px;
    flex-shrink: 0;
    border-radius: 3px;
  }
  & .detail {
    min-width: 0;
  }
  & p {
    margin: 0;
  }
  & .title {
    font-weight: bold;
    font-size: 16px;
  }
  & .meta {
    font-size: 13px;
    color: #666;
    margin-top: 3px;
  }
  /* フィードの URL は長い。折り返して、行がはみ出さないようにする */
  & .feed {
    font-size: 12px;
    color: #888;
    margin-top: 3px;
    word-break: break-all;
  }
  & .registered {
    font-size: 13px;
    margin-top: 10px;
  }
}
.actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  /* 送るリンクだけボタンに見せる。ここは実際には別サイトへ飛ぶので、
     form の button とは別に用意する */
  & .send {
    border-radius: 3px;
    color: #fff;
    background-color: #7f00ff;
    font-size: 13px;
    font-weight: bold;
    padding: 8px 16px;
    border-bottom: 0;
    &:hover {
      color: #fff;
      background-color: #9933ff;
    }
  }
  & .apple {
    font-size: 13px;
  }
}
.note {
  font-size: 13px;
  color: #666;
}
/* ブックマークバーへ引っ張るもの。掴めることが分かるよう、
   リンクではなくボタンの見え方にして、カーソルも掴む形にする */
.bookmarklet {
  display: inline-block;
  border-radius: 3px;
  color: #fff;
  background-color: #7f00ff;
  font-size: 13px;
  font-weight: bold;
  padding: 8px 16px;
  cursor: grab;
  &:hover {
    color: #fff;
    background-color: #9933ff;
  }
  &:active {
    cursor: grabbing;
  }
}
.copied {
  margin-left: 10px;
  font-size: 13px;
  color: #7f00ff;
}
/* 作り方。番号を振って、上のボタンからの続きとして読ませる */
ol.note {
  padding-left: 1.5em;
  & li:not(:first-child) {
    margin-top: 5px;
  }
}
code {
  background-color: #f4f4f4;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
a:not(.send, .bookmarklet) {
  padding-bottom: 0.2em;
  border-bottom: 1px dotted #444;
}
</style>

<script>
import searchTerms, { appleIdFromUrl } from '@/lib/podcast-source.js'
import toChannels, { lookupUrl, searchUrl } from '@/lib/itunes.js'
import matchRegistered from '@/lib/registered-match.js'
import registerRequestIssueUrl from '@/lib/register-request-issue.js'
import { jst } from '@/lib/jst'

// 登録中の番組。判定に要るキー・フィード・番組名だけを持つ軽いファイルで、
// fetch-feeds が data/rss.json から作る（issue #229）
const REGISTERED_JSON = '/registered.json'

export default {
  setup() {
    useHead({
      title: '番組の登録リクエスト | Podcast Freaks - Japanese techie podcast archive',
      // サイレントリリースの間は検索に載せない（issue #228）。
      // このサイトにサイトマップは無いので、これで足りる
      meta: [{ name: 'robots', content: 'noindex' }]
    })
  },
  data: function() {
    return {
      url: '',
      name: '',
      loading: false,
      searched: false,
      error: '',
      candidates: [],
      registered: null,
      registeredAvailable: true,
      // ブックマークレットが開く先。手元で試すときはそのまま手元を指す。
      // 事前レンダリングの時点では分からないので、本番の URL を初期値にする
      origin: 'https://podcastfreaks.com',
      copied: false
    }
  },
  mounted: function() {
    // クエリを読むのは描き終えてから。事前レンダリングした HTML には
    // クエリの中身が入っていないので、setup で読んで初期値にすると
    // 出力された HTML と食い違う。
    //
    // 読む先は window.location ではなくルーター。ハイドレーションの間、
    // location は一度クエリの無い状態（事前レンダリングした '/add/'）に
    // なっていて、そこを読むと毎回空が返る。ルーターは最初から
    // 開かれた URL を持っている
    this.origin = window.location.origin
    const query = this.$route.query
    this.url = query.url || ''
    // ブックマークレット（#230）は、見ていたページのタイトルを渡してくる。
    // Spotify のように番組名が URL から取れないサービスでは、これが
    // 唯一の手がかりになる
    this.name = query.title || ''
    if(this.url || this.name) this.lookup()
  },
  computed: {
    // 1件でも「まだ登録されていない番組」があるか。
    // 出ているのが登録済みのものだけなら、送り先の案内は要らない
    sendable: function() {
      return this.candidates.some(channel => !channel.matched.length)
    },
    // 見ているページの URL とタイトルを付けて、このページを新しいタブで開く。
    // ブックマークの URL 欄に入るものなので、1行に収める
    bookmarklet: function() {
      return `javascript:(()=>{open('${this.origin}/add/?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'_blank')})()`
    }
  },
  methods: {
    // iTunes の API は Content-Type が text/javascript で返るため、
    // 明示しないと $fetch が文字列のまま渡してくる
    fetchJson: function(url) {
      return $fetch(url, { responseType: 'json' })
    },
    loadRegistered: async function() {
      if(this.registered) return this.registered
      try {
        this.registered = await this.fetchJson(REGISTERED_JSON)
        this.registeredAvailable = true
      } catch {
        // 判定ができないだけで、リクエストは送れる。止めない
        this.registered = {}
        this.registeredAvailable = false
      }
      return this.registered
    },
    lookup: async function() {
      if(this.loading) return
      this.loading = true
      this.error = ''
      this.candidates = []

      try {
        const registered = await this.loadRegistered()
        const channels = await this.findChannels()
        this.candidates = channels.map(channel => ({
          ...channel,
          matched: matchRegistered(registered, channel)
        }))
      } catch {
        this.error = '番組を探せませんでした。しばらくしてからもう一度お試しください。'
      } finally {
        this.loading = false
        this.searched = true
      }
    },
    // Apple のリンクなら id から一発で引ける。それ以外は、URL と番組名から
    // 作った検索語を、結果が出るまで順に試す
    findChannels: async function() {
      const appleId = appleIdFromUrl(this.url)
      if(appleId) {
        const channels = toChannels(await this.fetchJson(lookupUrl(appleId)))
        if(channels.length) return channels
      }

      for(const term of searchTerms({ url: this.url, title: this.name })) {
        const channels = toChannels(await this.fetchJson(searchUrl(term)))
        if(channels.length) return channels
      }
      return []
    },
    channelMeta: function(channel) {
      return [
        channel.artist,
        channel.trackCount ? `${channel.trackCount}話` : '',
        channel.releaseDate ? `最新 ${jst(channel.releaseDate).format('YYYY.MM.DD')}` : ''
      ].filter(Boolean).join(' / ')
    },
    // ブックマークバーが無い環境のため。コピーできない場合は何も言わない
    // （押しても動かないことは、隣の説明で伝えてある）
    copyBookmarklet: function() {
      if(!navigator.clipboard) return
      navigator.clipboard.writeText(this.bookmarklet).then(() => {
        this.copied = true
      }).catch(() => {})
    },
    issueUrl: function(channel) {
      return registerRequestIssueUrl({
        channel,
        source: { url: this.url, title: this.name }
      })
    }
  }
}
</script>
