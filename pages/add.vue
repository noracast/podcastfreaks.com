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

      <button type="submit" :disabled="loading || (!url && !name)">{{ loading ? 'Searching…' : 'Search' }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="searched && !loading">
      <h3>{{ candidates.length ? 'Results' : 'Not found' }}</h3>

      <ul v-if="candidates.length" class="candidates">
        <!-- まだ登録されていないものが本題なので、そちらを先に並べる -->
        <li v-for="channel in candidates" :key="channel.feed" :class="{ 'is-registered': channel.matched.length }">
          <!-- 本当にこの番組かを確かめたいときのために、ジャケットと
               番組名まわりを Apple Podcasts へのリンクにする。
               状態やボタンは対象にしないので、リンクは2つに分けている。
               Apple に無い番組（iTunes 以外から見つけた場合）は素の要素で出す。

               ここは a-blank ではなく素の a。component の :is に
               コンポーネント名を文字列で渡しても解決されず、
               <a-blank> という不明な要素のまま出てリンクにならない -->
          <component
            :is="channel.apple ? 'a' : 'div'"
            v-if="channel.artwork"
            class="art"
            :href="channel.apple || undefined"
            :target="channel.apple ? '_blank' : undefined"
            :rel="channel.apple ? 'noopener' : undefined"
            :title="channel.apple ? 'Apple Podcasts で開く' : undefined"
          >
            <img class="cover" :src="channel.artwork" :alt="channel.title" width="80" height="80">
          </component>
          <div class="detail">
            <component
              :is="channel.apple ? 'a' : 'div'"
              class="head"
              :href="channel.apple || undefined"
              :target="channel.apple ? '_blank' : undefined"
              :rel="channel.apple ? 'noopener' : undefined"
              :title="channel.apple ? 'Apple Podcasts で開く' : undefined"
            >
              <p class="title">{{ channel.title }}</p>
              <p class="meta">{{ channelMeta(channel) }}</p>
            </component>
            <!-- 登録済みかどうかは static/registered.json と突き合わせている。
                 フィード URL と番組名のどちらかが当たれば「登録済みの可能性」
                 として出す。完全一致だけでは取りこぼすため。

                 番組ごとの URL がまだ無いので、ここからはどこへも送っていない。
                 番組の個別ページ（/channels/<key>/ のようなもの）ができたら、
                 matched[0].key からその番組のページへのリンクを足す -->
            <template v-if="channel.matched.length">
              <p class="registered">
                <span class="badge">登録済み</span>
                <code>{{ channel.matched[0].key }}</code>{{ channel.matched[0].matchedBy === 'title' ? '（番組名が一致）' : '' }} として登録されています。
              </p>
              <!-- 登録済みでも用がある人はいる（フィードの URL が変わった、
                   ハッシュタグが違う）。行き止まりにせず、未登録のときと
                   同じ形で送り先を出す。こちらは送り先がフォームだけ -->
              <div class="next">
                <p class="next-title">次のアクション</p>
                <div class="choice">
                  <div class="actions">
                    <nuxt-link class="send gray" :to="requestLink(channel)">修正依頼を送る</nuxt-link>
                  </div>
                  <p class="hint">フィードの URL が変わった、ハッシュタグが違うなどのご連絡はこちらから。</p>
                </div>
              </div>
            </template>
            <template v-else>
              <p class="unregistered"><span class="badge new">未登録</span>この番組はまだ登録されていません。</p>
              <!-- 送り先は2つあって、どちらか一方でよい。
                   枠で囲って「ここから選ぶ」ことが分かるようにする -->
              <div class="next">
                <p class="next-title">次のアクション<span>どちらか一方</span></p>
                <div class="choice">
                  <div class="actions">
                    <a-blank class="send" :href="issueUrl(channel)">Githubでリクエスト</a-blank>
                  </div>
                  <p class="hint">GitHub のissue作成画面に遷移します。そのままCreateで構いません。</p>
                </div>
                <div class="choice">
                  <div class="actions">
                    <nuxt-link class="send gray" :to="requestLink(channel)">フォームから送る</nuxt-link>
                  </div>
                  <p class="hint">GitHub のアカウントをお持ちでない場合はこちら。</p>
                </div>
              </div>
            </template>
          </div>
        </li>
      </ul>

      <!-- iTunes の検索は緩く、関係のない番組が並ぶことがある。
           目当てが無いときも、ここで行き止まりにしない -->
      <p v-if="candidates.length && canSendUnknown" class="note">目当ての番組が出ていませんか。番組名を変えて探し直すか、<a-blank :href="issueUrl(unknownChannel)">番組の URL を添えて登録をリクエスト</a-blank>できます。</p>

      <!-- 見つからなくても、ここで終わらせない。ただし送れるのは
           番組の URL があるときだけ。
           名前だけのリクエストは、受け取った側が番組を特定するところから
           始めることになり、フィードに辿り着けないことも多い。
           URL さえあれば、そこから配信元を追える -->
      <template v-else-if="!candidates.length">
        <p>Apple Podcasts に載っていない番組や、名前が違う番組は見つかりません。番組名を変えて探し直すか、番組のページの URL を添えて送ってください。</p>
        <template v-if="canSendUnknown">
          <div class="next">
            <p class="next-title">次のアクション<span>どちらか一方</span></p>
            <div class="choice">
              <div class="actions">
                <a-blank class="send" :href="issueUrl(unknownChannel)">Githubでリクエスト</a-blank>
              </div>
              <p class="hint">GitHub のissue作成画面に遷移します。番組名と見ていたページは入れてあります。RSS フィードの URL が分かれば書き足してください。</p>
            </div>
            <div class="choice">
              <div class="actions">
                <nuxt-link class="send gray" :to="requestLink(unknownChannel)">フォームから送る</nuxt-link>
              </div>
              <p class="hint">GitHub のアカウントをお持ちでない場合はこちら。</p>
            </div>
          </div>
        </template>
        <template v-else>
          <p class="hint">上の「番組の URL」に、Spotify・Apple Podcasts・番組サイトなど番組のページの URL を入れてください。そこから配信元をこちらで追えます。</p>
          <div class="actions">
            <nuxt-link class="send gray" :to="requestLink(unknownChannel)">フォームから送る</nuxt-link>
          </div>
          <p class="hint">URL が分からない場合も、こちらからお知らせいただけます。</p>
        </template>
      </template>

      <!-- 送ったあとの話。登録されるとは限らないことは、先に伝えておく -->
      <p v-if="sendable || canSendUnknown" class="note">いただいたリクエストは、フィードの中身（音声を持っているか、配信者が掲載を止めていないか）を確認したうえで登録します。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。</p>

      <p v-if="!registeredAvailable" class="note">※ 登録済みかどうかの判定ができませんでした（一覧の取得に失敗しています）。すでに載っている番組かもしれません。</p>
    </template>

    <!-- 結果の下に続けて置くと読み飛ばされるので、枠で囲んで切り離す -->
    <section class="bookmarklet-section">
      <h3>Bookmarklet</h3>
      <p>番組のページを見ているときに押すだけで、その URL とタイトルをこのページへ渡せるブックマークレットです。</p>
      <!-- href は javascript: のまま。押しても何も起きないよう既定の動作は止める
           （このページで押すと、このページ自身を調べに行ってしまう）。
           代わりにコードをコピーして、ドラッグできない環境の逃げ道にする -->
      <p class="bookmarklet-box">
        <!-- ここに出している文字が、そのままブックマークの名前になる
             （ドラッグしたリンクの表示テキストが使われる。title 属性は効かない）。
             長ければ、ブックマークバーへ入れたあとに名前を変えられる -->
        <a class="bookmarklet" :href="bookmarklet" @click.prevent="copyBookmarklet">→ Podcast Freaks</a>
        <span v-if="copied" class="copied">コピーしました</span>
      </p>
      <h4>使い方</h4>
      <ol class="note">
        <li>上のボタンを<strong>ブックマークバーへドラッグ</strong>する（名前は好きに変えて構いません）</li>
        <li>ブックマークバーが出ていなければ、Chrome・Safari とも <code>⌘ + Shift + B</code> で出せます</li>
        <li>ドラッグできない場合（iOS など）は、上のボタンを押すとコードをコピーします。適当なページをブックマークに追加して開き直し、その URL の欄にコピーしたものを貼り替えてください</li>
      </ol>
    </section>
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
  /* 1件ずつ座布団を敷いて、どこまでが1番組かを分かるようにする */
  & li {
    display: flex;
    gap: 15px;
    padding: 15px;
    background-color: #f7f7f7;
    border-radius: 6px;
    &:not(:first-child) {
      margin-top: 10px;
    }
  }
  /* 座布団の上では、キーの印が背景に埋もれる。ここだけ白で抜く */
  & code {
    background-color: #fff;
  }
  & .art {
    flex-shrink: 0;
    line-height: 0;
    border-bottom: 0;
  }
  & .cover {
    width: 80px;
    height: 80px;
    border-radius: 3px;
  }
  /* 番組名と、その下の話数や日付までをひとまとまりのリンクにする。
     見出しとして読めるままにしたいので、線も色の変化も付けない */
  & .head {
    display: block;
    color: inherit;
    border-bottom: 0;
    &:hover {
      color: inherit;
    }
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
  & .registered, & .unregistered {
    font-size: 13px;
    /* 番組の情報と、状態から先の話とを読み分けられるよう、ここで一段空ける */
    margin-top: 20px;
  }
  /* 登録済みのものは、すでに用が済んでいる。一段引いた見え方にする */
  & li.is-registered {
    color: #666;
    & .title {
      color: #444;
    }
  }
  /* 送ったあとに何が起きるかの補足。ボタンより弱く */
  & .hint {
    font-size: 12px;
    color: #888;
    margin-top: 8px;
  }

}
/* 状態の印。文字だけだと本文に紛れるので、小さく囲って先頭に置く */
.badge {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  color: #666;
  background-color: #e8e8e8;
  &.new {
    color: #fff;
    background-color: #7f00ff;
  }
}
.actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  /* 送るリンクだけボタンに見せる。ここは実際には別サイトへ飛ぶので、
     form の button とは別に用意する。
     文言は短くしてある（長いと狭い画面で2行になり、実機で押しづらかった） */
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
  /* GitHub を使わない人の行き先。押せることは同じだが、
     こちらが本命ではないので色を落とす */
  & .send.gray {
    color: #444;
    background-color: #e0e0e0;
    &:hover {
      color: #444;
      background-color: #d0d0d0;
    }
  }
}
.note {
  font-size: 13px;
  color: #666;
}
.hint {
  font-size: 12px;
  color: #888;
  margin-top: 8px;
}
/* 送り先が2つあることを、枠で囲って示す。
   座布団（薄いグレー）の上に置くので、こちらは白で抜いて浮かせる */
.next {
  margin-top: 14px;
  padding: 15px;
  background-color: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 6px;
}
.next-title {
  font-size: 11px;
  font-weight: bold;
  color: #666;
  letter-spacing: 0.05em;
  /* 「どちらか一方」は添え物。太さと色を落として続ける */
  & span {
    margin-left: 8px;
    font-weight: normal;
    color: #aaa;
  }
}
/* 2つ目からは、細い線で区切る。or を挟むより、選ぶものが
   並んでいることが伝わる */
.choice {
  margin-top: 12px;
  &:not(:first-of-type) {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #eee;
  }
}
/* 枠で囲って、結果とは別のものだと分かるようにする */
.bookmarklet-section {
  margin-top: 40px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 6px;
  /* 枠の上端と見出しの間が空きすぎるので、見出しの既定の余白は消す */
  & h3:first-child {
    margin-top: 0;
  }
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
import searchTerms, { appleIdFromUrl, cleanTitle, hostLabel, startsWithHostLabel } from '@/lib/podcast-source.js'
import toChannels, { lookupUrl, searchUrl, episodeSearchUrl, collectionIds } from '@/lib/itunes.js'
import oembedUrl from '@/lib/spotify.js'
import matchRegistered from '@/lib/registered-match.js'
import registerRequestIssueUrl from '@/lib/register-request-issue.js'
import requestFormLink from '@/lib/request-form-link.js'
import { jst } from '@/lib/jst'

// 登録中の番組。判定に要るキー・フィード・番組名だけを持つ軽いファイルで、
// fetch-feeds が data/rss.json から作る（issue #229）
const REGISTERED_JSON = '/registered.json'

export default {
  setup() {
    useHead({
      title: 'Add | Podcast Freaks - Japanese techie podcast archive',
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
    // 番組名だけのリクエストは受け取らない。番組の URL があれば、そこから
    // 配信元のフィードを追えるが、名前だけだと特定から始めることになる
    canSendUnknown: function() {
      return !!this.url.trim()
    },
    // 見つからなかったときに送るもの。分かっているのは、入れてもらった
    // 番組名と見ていたページだけ。フィードは GitHub の画面で書き足してもらう
    unknownChannel: function() {
      return { title: cleanTitle(this.name), feed: '', apple: '', genres: [] }
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

      const viaHost = await this.findViaHost()
      if(viaHost.length) return viaHost

      return await this.findViaSpotify()
    },
    // 番組サイトのホスト名で引く。タイトルが回の名前だけ、といった場合の最後の手がかり。
    //
    // iTunes の検索は説明文や作者欄にも当たるので、ここは**番組名がその語で
    // 始まるものだけ**を残す。example.com のようなありふれた語で、無関係な番組が
    // 並ぶのを防ぐため（絞る前は5件、「含む」で見たときも4件並んだ）
    findViaHost: async function() {
      const label = hostLabel(this.url)
      if(!label || label.length < 2) return []
      const channels = toChannels(await this.fetchJson(searchUrl(label)))
      return channels.filter(channel => startsWithHostLabel(channel.title, label))
    },
    // Spotify の URL しか無いとき（ブックマークレットを通さず貼られた場合など）。
    // 番組名は URL からもページからも取れないが、oEmbed が最新エピソード名を
    // 返すので、それをエピソードとして検索して番組へ辿る（lib/spotify.js）
    findViaSpotify: async function() {
      const oembed = oembedUrl(this.url)
      if(!oembed) return []
      try {
        const { title } = await this.fetchJson(oembed)
        if(!title) return []
        const ids = collectionIds(await this.fetchJson(episodeSearchUrl(title)))
        if(!ids.length) return []
        return toChannels(await this.fetchJson(lookupUrl(ids)))
      } catch {
        // ここが駄目でも「見つからないまま送る」導線は出す。止めない
        return []
      }
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
    },
    // GitHub を使わない人の行き先。調べた結果をクエリで渡し、
    // フォーム側（pages/request.vue）で初期値に入れる
    requestLink: function(channel) {
      return requestFormLink({
        channel,
        source: { url: this.url, title: this.name }
      })
    }
  }
}
</script>
