<template>
  <div class="root">
    <h2>番組の登録リクエスト</h2>
    <!-- 文の途中に改行を入れると出力に半角空白が入るので、段落は1行で書く -->
    <p>登録してほしい番組の URL か番組名を入れると、配信元の RSS フィードを探して、登録済みかどうかまで調べます。URL は Spotify・Apple Podcasts・YouTube・番組サイト・RSS フィードのどれでも構いません。分かるものを、スペース区切りでいくつでも入れられます。</p>

    <!-- 欄は1つ。何を入れられるかはリード文に書いてあるので、
         ラベルも補足も置かない（同じことを二度読ませない） -->
    <form class="search" @submit.prevent="lookup">
      <input id="query" v-model="query" type="text" aria-label="番組の URL か番組名" placeholder="https://open.spotify.com/show/... fukabori.fm">

      <button type="submit" :disabled="loading || !query.trim()">{{ loading ? 'Searching…' : 'Search' }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="searched && !loading">
      <h3>{{ candidates.length ? 'Results' : 'Not found' }}</h3>

      <ul class="candidates">
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
                <code>{{ channel.matched[0].key }}</code>{{ matchNote(channel.matched[0]) }} として登録されています。
              </p>
              <!-- 登録済みでも用がある人はいる（フィードの URL が変わった、
                   ハッシュタグが違う）。行き止まりにせず、未登録のときと
                   同じ形で送り先を出す。こちらは送り先がフォームだけ -->
              <div class="next">
                <p class="next-title">次のアクション</p>
                <div class="choice">
                  <div class="actions">
                    <button type="button" class="send gray" @click="openForm(channel)">修正依頼を送る</button>
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
                    <button type="button" class="send gray" @click="openForm(channel)">フォームから送る</button>
                  </div>
                  <p class="hint">GitHub のアカウントをお持ちでない場合はこちら。</p>
                </div>
              </div>
            </template>
          </div>
        </li>
        <!-- 見つからなかったときも、同じ座布団で出す。結果の形が変わると、
             何が起きたのかを読み直すことになる。
             送れるのは番組の URL があるときだけ。名前だけのリクエストは、
             受け取った側が番組を特定するところから始めることになり、
             フィードに辿り着けないことも多い -->
        <li v-if="!candidates.length" class="is-unknown">
          <div class="detail">
            <p class="title">{{ unknownChannel.title || '番組が見つかりませんでした' }}</p>
            <p v-if="url" class="meta">{{ url }}</p>
            <p class="unregistered">
              <span class="badge unknown">見つかりません</span>Apple Podcasts に載っていない番組や、名前が違う番組は見つかりません。
            </p>
            <div class="next">
              <p class="next-title">次のアクション<span v-if="canSendUnknown">どちらか一方</span></p>
              <template v-if="canSendUnknown">
                <div class="choice">
                  <div class="actions">
                    <a-blank class="send" :href="issueUrl(unknownChannel)">Githubでリクエスト</a-blank>
                  </div>
                  <p class="hint">GitHub のissue作成画面に遷移します。番組名と見ていたページは入れてあります。RSS フィードの URL が分かれば書き足してください。</p>
                </div>
                <div class="choice">
                  <div class="actions">
                    <button type="button" class="send gray" @click="openForm(unknownChannel)">フォームから送る</button>
                  </div>
                  <p class="hint">GitHub のアカウントをお持ちでない場合はこちら。</p>
                </div>
              </template>
              <div v-else class="choice">
                <div class="actions">
                  <button type="button" class="send gray" @click="openForm(unknownChannel)">フォームから送る</button>
                </div>
                <p class="hint">上の欄に番組の URL（Spotify・Apple Podcasts・番組サイト・RSS フィードなど）を足すと、そこから配信元をこちらで追えます。URL が分からない場合も、こちらからお知らせいただけます。</p>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <!-- iTunes の検索は緩く、関係のない番組が並ぶことがある。
           目当てが無いときも、ここで行き止まりにしない -->
      <p v-if="candidates.length && canSendUnknown" class="note">目当ての番組が出ていませんか。番組名を変えて探し直すか、<a-blank :href="issueUrl(unknownChannel)">番組の URL を添えて登録をリクエスト</a-blank>できます。</p>

      <!-- 送ったあとの話。登録されるとは限らないことは、先に伝えておく -->
      <p v-if="sendable || canSendUnknown" class="note">いただいたリクエストは、フィードの中身（音声を持っているか、配信者が掲載を止めていないか）を確認したうえで登録します。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。</p>

      <p v-if="!registeredAvailable" class="note">※ 登録済みかどうかの判定ができませんでした（一覧の取得に失敗しています）。すでに載っている番組かもしれません。</p>
    </template>

    <!-- 調べるまでもない用（ハッシュタグの誤り、掲載を止めたい、Apple の
         リンクが出ない）の逃げ道。フォームは開くまで出さない -->
    <p v-if="!formOpen" class="other">番組の URL が分からないときや、登録済みの番組についてのご連絡は、<button type="button" class="as-link" @click="openForm()">フォームから直接お送りいただけます</button>。</p>

    <section v-if="formOpen" id="form" ref="formSection" class="form-section">
      <h3>フォームから送る</h3>
      <!-- 調べずに開いた人は、上の注意書きを見ていない -->
      <p v-if="!searched" class="note">いただいたリクエストは、フィードの中身（音声を持っているか、配信者が掲載を止めていないか）を確認したうえで登録します。このサイトの意図に沿わないなどの理由で、登録しかねる場合もありますので予めご了承ください。</p>
      <request-form :values="formValues" />
    </section>

    <request-bookmarklet />
  </div>
</template>

<style scoped>
.root {
  padding: 20px;
  max-width: 600px;
}
form.search {
  margin-top: 30px;
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
    /* 余った幅をここで受ける。書かないと中身の幅のまま縮み、
       「次のアクション」の枠だけ座布団の右端に届かない */
    flex: 1;
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
  /* 見つからなかったものは、ジャケットも話数も無い。入れてもらった URL を
     控えめに出すだけなので、そこだけ折り返しを許す */
  & li.is-unknown .meta {
    word-break: break-all;
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
  /* 見つからなかった印。押す先はあるが、番組が分かっているわけではない */
  &.unknown {
    color: #fff;
    background-color: #999;
  }
}
.actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  /* 送るボタン。GitHub へ飛ぶものはリンク、フォームを開くものは button だが、
     選ぶものとしては同じなので見え方を揃える。
     レイアウトの button は min-width を持っているので、ここで解く。
     文言は短くしてある（長いと狭い画面で2行になり、実機で押しづらかった） */
  & .send {
    display: inline-block;
    min-width: 0;
    border-radius: 3px;
    color: #fff;
    background-color: #7f00ff;
    font-size: 13px;
    font-weight: bold;
    padding: 8px 16px;
    border: 0;
    border-bottom: 0;
    cursor: pointer;
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
/* 調べるまでもない用の逃げ道。ここが本線ではないので、文中に小さく置く */
.other {
  margin-top: 40px;
  font-size: 13px;
  color: #666;
}
/* 文中でフォームを開くもの。見た目はリンクに寄せる
   （レイアウトの button は紫の塊なので、ここで全部解く） */
.as-link {
  display: inline;
  padding: 0;
  min-width: 0;
  border: 0;
  border-bottom: 1px dotted #444;
  border-radius: 0;
  background-color: transparent;
  color: inherit;
  font-size: inherit;
  font-weight: normal;
  cursor: pointer;
  &:hover {
    background-color: transparent;
    color: #7f00ff;
  }
}
/* 調べるところと送るところを、薄い線で区切る */
.form-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #e8e8e8;
  /* ヘッダーが上に貼り付いたままなので、飛び先が潜らないよう逃がす */
  scroll-margin-top: 100px;
  & h3 {
    margin-top: 0;
  }
}
code {
  background-color: #f4f4f4;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
a:not(.send) {
  padding-bottom: 0.2em;
  border-bottom: 1px dotted #444;
}
/* 狭い画面ではヘッダーが 70px になる */
@media (max-width: 900px) {
  .form-section {
    scroll-margin-top: 90px;
  }
}
</style>

<script>
import searchTerms, { appleIdFromUrl, cleanTitle, hostLabel, looksLikeFeed, pathLabel, startsWithHostLabel } from '@/lib/podcast-source.js'
import toChannels, { lookupUrl, searchUrl, episodeSearchUrl, collectionIds } from '@/lib/itunes.js'
import oembedUrl from '@/lib/spotify.js'
import matchRegistered, { matchByHost, normalizeTitle } from '@/lib/registered-match.js'
import feedTitle from '@/lib/feed-title.js'
import parseQuery from '@/lib/parse-query.js'
import registerRequestIssueUrl from '@/lib/register-request-issue.js'
import requestFormValues from '@/lib/request-form-values.js'
import { jst } from '@/lib/jst'
import RequestForm from '@/components/request-form.vue'
import RequestBookmarklet from '@/components/request-bookmarklet.vue'

// 登録中の番組。判定に要るキー・フィード・番組名だけを持つ軽いファイルで、
// fetch-feeds が data/rss.json から作る（issue #229）
const REGISTERED_JSON = '/registered.json'

export default {
  components: { RequestForm, RequestBookmarklet },
  setup() {
    useHead({
      title: 'Register request | Podcast Freaks - Japanese techie podcast archive'
    })
  },
  data: function() {
    return {
      // 入れてもらった1行。URL と番組名は lib/parse-query.js で分ける
      query: '',
      loading: false,
      searched: false,
      error: '',
      candidates: [],
      registered: null,
      registeredAvailable: true,
      // 送信フォームは、必要になったときだけ開く
      formOpen: false,
      formValues: {}
    }
  },
  mounted: function() {
    // クエリを読むのは描き終えてから。事前レンダリングした HTML には
    // クエリの中身が入っていないので、setup で読んで初期値にすると
    // 出力された HTML と食い違う。
    //
    // 読む先は window.location ではなくルーター。ハイドレーションの間、
    // location は一度クエリの無い状態（事前レンダリングした '/request/'）に
    // なっていて、そこを読むと毎回空が返る。ルーターは最初から
    // 開かれた URL を持っている
    const query = this.$route.query
    // ブックマークレット（#230）は、見ていたページの URL とタイトルを
    // 分けて渡してくる。欄は1つなので、並べて入れる。
    // Spotify のように番組名が URL から取れないサービスでは、
    // タイトルが唯一の手がかりになる
    this.query = [query.url, query.title].filter(Boolean).join(' ')

    // フォームに用がある人は、調べるところを飛ばして来る（About からのリンク、
    // /add から回していた頃のクエリ付きリンク）。その場合は開いた状態で出す
    const values = {
      feed: query.feed || '',
      twitter: query.twitter || '',
      hashtag: query.hashtag || '',
      message: query.message || ''
    }
    const wantsForm = this.$route.hash === '#form' || query.form !== undefined
    if(wantsForm || Object.values(values).some(Boolean)) {
      this.formValues = values
      this.formOpen = true
      // #form で来たときの飛び先は、描いたあとにしか無い
      if(wantsForm) this.$nextTick(this.scrollToForm)
    }

    if(this.query.trim()) this.lookup()
  },
  computed: {
    // 入れてもらった1行を、URL と番組名に分けたもの
    parsed: function() {
      return parseQuery(this.query)
    },
    urls: function() {
      return this.parsed.urls
    },
    // 表示や送り先に添えるのは、最初に書かれた URL。
    // 探すときは urls を順に試す（findChannels）
    url: function() {
      return this.urls[0] || ''
    },
    name: function() {
      return this.parsed.name
    },
    // 1件でも「まだ登録されていない番組」があるか。
    // 出ているのが登録済みのものだけなら、送り先の案内は要らない
    sendable: function() {
      return this.candidates.some(channel => !channel.matched.length)
    },
    // 番組名だけのリクエストは受け取らない。番組の URL があれば、そこから
    // 配信元のフィードを追えるが、名前だけだと特定から始めることになる
    canSendUnknown: function() {
      return this.urls.length > 0
    },
    // 見つからなかったときに送るもの。分かっているのは、入れてもらった
    // 番組名と見ていたページだけ。フィードは GitHub の画面で書き足してもらう
    unknownChannel: function() {
      // 明らかにフィードの形の URL を入れてもらっているなら、それを
      // フィードとして渡す。受け取った側が探し直さずに済む
      return { title: cleanTitle(this.name), feed: this.urls.find(looksLikeFeed) || '', apple: '', genres: [] }
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
        const channels = await this.findChannels(registered)
        this.candidates = channels.map(channel => ({
          ...channel,
          // 登録中の一覧から作った候補は、どれに当たったかを持っている
          matched: channel.matched || matchRegistered(registered, channel)
        }))
      } catch {
        this.error = '番組を探せませんでした。しばらくしてからもう一度お試しください。'
      } finally {
        this.loading = false
        this.searched = true
      }
    },
    // Apple のリンクなら id から一発で引ける。それ以外は、URL と番組名から
    // 作った検索語を、結果が出るまで順に試す。
    //
    // 順番は「確かなものから」。iTunes を通さない登録済み一覧との
    // 突き合わせが前後にあるのは、**iTunes には URL で引く方法が無い**ため。
    // フィードの URL をそのまま入れられたときは、こちらでしか辿れない
    findChannels: async function(registered) {
      // 入れられたものが、そのまま登録中のフィードだった場合
      for(const url of this.urls) {
        const sameFeed = matchRegistered(registered, { feed: url })
        if(sameFeed.length) return sameFeed.map(entry => this.fromRegistered(entry))
      }

      // Apple のリンクは id から一発で引ける
      for(const url of this.urls) {
        const appleId = appleIdFromUrl(url)
        if(!appleId) continue
        const channels = toChannels(await this.fetchJson(lookupUrl(appleId)))
        if(channels.length) return channels
      }

      for(const term of searchTerms({ title: this.name })) {
        const channels = toChannels(await this.fetchJson(searchUrl(term)))
        if(channels.length) return channels
      }

      // ここから先は URL を1つずつ。入れてもらった順に試す
      for(const url of this.urls) {
        const viaHost = await this.findViaHost(url)
        if(viaHost.length) return viaHost
      }

      for(const url of this.urls) {
        const viaPath = await this.findViaPath(url)
        if(viaPath.length) return viaPath
      }

      for(const url of this.urls) {
        const viaSpotify = await this.findViaSpotify(url)
        if(viaSpotify.length) return viaSpotify
      }

      for(const url of this.urls) {
        const viaFeed = await this.findViaFeed(url)
        if(viaFeed.length) return viaFeed
      }

      // 番組サイトを入れられた場合。フィードの URL とは一致しないが、
      // 同じホストで配信している番組が登録されていれば、それが答え
      for(const url of this.urls) {
        const sameSite = matchByHost(registered, url)
        if(sameSite.length) return sameSite.map(entry => this.fromRegistered(entry))
      }

      return []
    },
    // 登録中の一覧から候補を作る。ジャケットや話数は持っていないが、
    // 「もう載っているか」に答えるにはこれで足りる
    fromRegistered: function(entry) {
      return { title: entry.title || '', feed: entry.feed, apple: '', artwork: '', genres: [], matched: [entry] }
    },
    // 番組サイトのホスト名で引く。タイトルが回の名前だけ、といった場合の最後の手がかり。
    //
    // iTunes の検索は説明文や作者欄にも当たるので、ここは**番組名がその語で
    // 始まるものだけ**を残す。example.com のようなありふれた語で、無関係な番組が
    // 並ぶのを防ぐため（絞る前は5件、「含む」で見たときも4件並んだ）
    findViaHost: async function(url) {
      const label = hostLabel(url)
      if(!label || label.length < 2) return []
      const channels = toChannels(await this.fetchJson(searchUrl(label)))
      return channels.filter(channel => startsWithHostLabel(channel.title, label))
    },
    // フィードの URL を入れられたとき。パスの末尾が番組名になっている形
    // （rss.art19.com/fukabori）を拾う。ホスト名は配信基盤のものなので使えない。
    // findViaHost と同じく、番組名がその語で始まるものだけを残す
    findViaPath: async function(url) {
      const label = pathLabel(url)
      if(!label || label.length < 2) return []
      // パスの語はハイフンやアンダースコアで繋がっている（the-daily）。
      // 番組名の側は空白なので、区切りを空白に直してから引く
      // （突き合わせる normalizeTitle は空白を落とす）
      const term = label.replace(/[-_]+/g, ' ').trim()
      const channels = toChannels(await this.fetchJson(searchUrl(term)))
      return channels.filter(channel => startsWithHostLabel(channel.title, term))
    },
    // Spotify の URL しか無いとき（ブックマークレットを通さず貼られた場合など）。
    // 番組名は URL からもページからも取れないが、oEmbed が最新エピソード名を
    // 返すので、それをエピソードとして検索して番組へ辿る（lib/spotify.js）
    findViaSpotify: async function(url) {
      const oembed = oembedUrl(url)
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
    // 最後の手がかり。入れられたものがフィードそのものなら、読めば番組名が
    // 分かる。ホスト名にもパスにも名前が出ない形（anchor.fm/s/<hex>/podcast/rss）は
    // これでしか辿れない。
    //
    // **フィードの約3割はブラウザから読めない**（CORS。issue #228）。
    // 読めなくても送る導線は出すので、ここで止めない
    findViaFeed: async function(url) {
      const title = await this.fetchFeedTitle(url)
      if(!title) return []

      // 名前が分かったので iTunes を引き直す。ジャケットや話数が付く
      const channels = toChannels(await this.fetchJson(searchUrl(title)))
      const same = channels.filter(channel => normalizeTitle(channel.title) === normalizeTitle(title))
      if(same.length) return same

      // Apple に載っていない番組。フィードから分かったぶんだけで出す
      return [{ title, feed: url, apple: '', artwork: '', genres: [] }]
    },
    // フィードを読んで番組名を取る。番組のページ（HTML）を読んでしまった
    // 場合は、lib/feed-title.js が空を返す
    fetchFeedTitle: async function(url) {
      if(!url) return ''
      try {
        return feedTitle(await $fetch(url, { responseType: 'text' }))
      } catch {
        // 読めないフィードは珍しくない（CORS）。手がかりが1つ減るだけ
        return ''
      }
    },
    // どこで当たったかの添え書き。フィードの URL が一致したときは、
    // 言うまでもないので何も出さない
    matchNote: function(matched) {
      if(matched.matchedBy === 'title') return '（番組名が一致）'
      if(matched.matchedBy === 'host') return '（同じドメインで配信）'
      return ''
    },
    channelMeta: function(channel) {
      return [
        channel.artist,
        channel.trackCount ? `${channel.trackCount}話` : '',
        channel.releaseDate ? `最新 ${jst(channel.releaseDate).format('YYYY.MM.DD')}` : ''
      ].filter(Boolean).join(' / ')
    },
    issueUrl: function(channel) {
      return registerRequestIssueUrl({
        channel,
        source: { url: this.urls.join(' '), title: this.name }
      })
    },
    // 送信フォームを開く。調べた結果があれば初期値に入れて、
    // 同じことを二度入力させない（lib/request-form-values.js）
    openForm: function(channel) {
      this.formValues = channel
        ? requestFormValues({ channel, source: { url: this.urls.join(' '), title: this.name } })
        : {}
      this.formOpen = true
      this.$nextTick(this.scrollToForm)
    },
    scrollToForm: function() {
      if(this.$refs.formSection) this.$refs.formSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}
</script>
