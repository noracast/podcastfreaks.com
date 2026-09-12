<template>
  <div class="root">
    <h2>番組の登録リクエスト</h2>
    <!-- 文の途中に改行を入れると出力に半角空白が入るので、段落は1行で書く -->
    <p>登録してほしい番組の URL か番組名を入れると、配信元の RSS フィードを探して、登録済みかどうかまで調べます。URL は Spotify・Apple Podcasts・YouTube・番組サイト・RSS フィードのどれでも構いません。分かるものを、スペース区切りでいくつでも入れられます。</p>

    <!-- ブックマークレットは、ページの一番下だと気づかれない。
         説明のすぐ下、入れる欄の手前に、畳んだまま小さく置く -->
    <request-bookmarklet />

    <!-- 欄は1つ。何を入れられるかはリード文に書いてあるので、
         ラベルも補足も置かない（同じことを二度読ませない） -->
    <form class="search" @submit.prevent="lookup">
      <input id="query" v-model="query" type="text" aria-label="番組の URL か番組名" placeholder="https://noracast.jp/feed.xml noracast">

      <button type="submit" :disabled="loading || !query.trim()">{{ loading ? 'Searching…' : 'Search' }}</button>
    </form>

    <p v-if="error" class="error">{{ error }}</p>

    <template v-if="searched && !loading">
      <h3>{{ candidates.length ? 'Results' : 'Not found' }}</h3>

      <!-- 登録済みは「もう載っている」ことが分かれば足りるので、ジャケットだけ
           並べる。名前まで読ませると、本題（未登録）に辿り着くのが遅くなる。
           押すと、その番組の送り先が下に出る（開くのは1つまで） -->
      <section v-if="registeredChannels.length" class="group">
        <h4 class="group-title">登録済み<span>{{ registeredChannels.length }}件</span></h4>
        <!-- 1件しか無いときは、下の枠にジャケットが出ている。同じ絵を2つ出さない -->
        <ul v-if="registeredChannels.length > 1" class="covers">
          <li v-for="channel in registeredChannels" :key="channel.feed">
            <button
              type="button"
              class="cover-button"
              :class="{ 'is-open': registeredKey(channel) === openRegisteredKey }"
              :title="registeredTitle(channel)"
              :aria-expanded="String(registeredKey(channel) === openRegisteredKey)"
              @click="toggleRegistered(channel)"
            >
              <!-- 用意してあるカバーは -60 と -120 の2枚だけなので、
                   どちらを使うかを image-size で指定する（components/cover.vue） -->
              <cover v-if="hasCover(channel)" :channel="registeredKey(channel)" :size="36" :image-size="60" radius="4px" />
              <span v-else class="no-cover">{{ registeredTitle(channel).slice(0, 1) }}</span>
            </button>
          </li>
        </ul>

        <!-- 登録済みでも用がある人はいる（フィードの URL が変わった、
             ハッシュタグが違う）。行き止まりにせず、送り先を出す。
             形は未登録の行と揃える（座布団の上に、送り先の枠） -->
        <ul v-if="openRegisteredChannel" class="candidates">
          <li>
            <div class="row">
              <div v-if="hasCover(openRegisteredChannel)" class="art">
                <cover :channel="registeredKey(openRegisteredChannel)" :size="40" :image-size="60" radius="3px" />
              </div>
              <span v-else class="no-cover">{{ registeredTitle(openRegisteredChannel).slice(0, 1) }}</span>
              <div class="head">
                <!-- 番組ごとの URL がまだ無いので、名前を出すだけにしている。
                     番組の個別ページ（/channels/<key>/ のようなもの）ができたら、
                     ここからその番組のページへのリンクにする -->
                <p class="title">{{ registeredTitle(openRegisteredChannel) }}</p>
                <p class="meta">
                  <!-- 当て方が番組名やドメインのときだけ添える（外すこともある判断材料） -->
                  <span v-if="matchNote(openRegisteredChannel.matched[0])" class="key">{{ matchNote(openRegisteredChannel.matched[0]) }}</span>{{ channelMeta(openRegisteredChannel) }}
                </p>
              </div>
              <!-- ジャケットをもう一度押しても閉じられるが、こちらにも出口を置く。
                   1件しか無いときは並びが無く、閉じると開き直せないので出さない -->
              <button v-if="registeredChannels.length > 1" type="button" class="toggle close" aria-label="閉じる" @click="openRegisteredKey = ''">×</button>
            </div>

            <div class="next">
              <div class="choice">
                <div class="actions">
                  <button type="button" class="send gray" @click="openForm(openRegisteredChannel)">修正依頼を送る</button>
                </div>
                <p class="hint">フィードの URL が変わった、ハッシュタグが違うなどのご連絡はこちらから。</p>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <section v-if="unregisteredChannels.length" class="group">
        <!-- iTunes の検索は10件で打ち切っている。まだ先があるときは + を付けて、
             語を足して絞り込んでもらう -->
        <h4 class="group-title">未登録<span>{{ unregisteredChannels.length }}件{{ truncated ? '+' : '' }}</span></h4>
        <ul class="candidates">
          <li v-for="channel in unregisteredChannels" :key="channel.feed">
            <div class="row">
              <!-- 本当にこの番組かを確かめたいときのために、ジャケットと
                   番組名まわりを Apple Podcasts へのリンクにする。
                   ボタンは対象にしないので、リンクは2つに分けている。
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
                <img class="cover" :src="channel.artwork" :alt="channel.title" width="40" height="40">
              </component>
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
              <!-- 送り先は行ごとに違うだけで中身は同じ。10件並ぶと同じ枠が
                   10回出るので、押されるまで畳んでおく（1件のときは開いた状態で出す） -->
              <button type="button" class="toggle" :aria-expanded="String(isOpen(channel))" @click="toggleRow(channel)">リクエスト</button>
            </div>

            <!-- 送り先は2つあって、どちらか一方でよい -->
            <div v-if="isOpen(channel)" class="next">
              <p class="next-title">どちらか一方</p>
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
          </li>
        </ul>
      </section>

      <!-- 見つからなかったときも、同じ座布団で出す。結果の形が変わると、
           何が起きたのかを読み直すことになる。
           送れるのは番組の URL があるときだけ。名前だけのリクエストは、
           受け取った側が番組を特定するところから始めることになり、
           フィードに辿り着けないことも多い -->
      <ul v-if="!candidates.length" class="candidates">
        <li class="is-unknown">
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

      <p v-if="truncated" class="note">目当ての番組が出ていない場合は、語を足すか正式な番組名で探し直すと絞り込めます。</p>

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
  </div>
</template>

<style scoped>
.root {
  padding: 20px;
  max-width: 600px;
}
form.search {
  margin-top: 20px;
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
/* 未登録・登録済みの区切り */
.group {
  margin-top: 25px;
}
.group-title {
  font-size: 13px;
  /* 見出しと中身の間隔。ジャケットの並びと座布団の並びで同じにする */
  margin: 0 0 16px;
  /* 件数は添え物。太さと色を落として続ける */
  & span {
    margin-left: 8px;
    font-weight: normal;
    color: #aaa;
  }
}
/* ジャケットの並びのすぐ下に開いた枠が来るときだけ、間を空ける */
.covers + .candidates {
  margin-top: 12px;
}
/* 見つからなかったときは、見出し（Not found）の直後に座布団が来る */
h3 + .candidates {
  margin-top: 15px;
}
/* 登録済みのジャケットの並び。「もう載っている」ことが分かればよいので、
   名前は出さず、押したときだけ下に出す */
.covers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cover-button {
  display: block;
  padding: 0;
  min-width: 0;
  border: 0;
  border-radius: 4px;
  /* レイアウトの button は紫の塊なので、ここで解く */
  background-color: transparent;
  cursor: pointer;
  &:hover {
    background-color: transparent;
    opacity: 0.8;
  }
  /* どれを開いているかを分かるようにする。ジャケットの外側に出すので、
     border ではなく outline（大きさが変わらない） */
  &.is-open {
    outline: 2px solid #7f00ff;
    outline-offset: 2px;
  }
}
/* カバー画像を取れていない番組。頭文字だけの升目にする */
.no-cover {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: #ddd;
  color: #666;
  font-size: 15px;
  font-weight: bold;
}
/* 座布団の中（開いた枠）では、未登録の行のジャケットと同じ大きさにする */
.candidates .no-cover {
  width: 40px;
  height: 40px;
  border-radius: 3px;
  font-size: 16px;
}
.candidates {
  list-style: none;
  /* ul の既定の余白を消して、見出しからの間隔をジャケットの並びと揃える */
  margin: 0;
  padding: 0;
  /* 1件ずつ座布団を敷いて、どこまでが1番組かを分かるようにする */
  & li {
    padding: 12px 15px;
    background-color: #f7f7f7;
    border-radius: 6px;
    &:not(:first-child) {
      margin-top: 8px;
    }
  }
  /* 番組の行。ジャケット・番組名・ボタンを1行に収める */
  & .row {
    display: flex;
    align-items: center;
    gap: 12px;
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
    width: 40px;
    height: 40px;
    border-radius: 3px;
  }
  /* 番組名と、その下のキーや話数までをひとまとまりのリンクにする。
     見出しとして読めるままにしたいので、線も色の変化も付けない。
     余った幅もここで受ける（書かないとボタンが番組名に寄る） */
  & .head {
    flex: 1;
    min-width: 0;
    display: block;
    color: inherit;
    border-bottom: 0;
    &:hover {
      color: inherit;
    }
  }
  & p {
    margin: 0;
  }
  & .title {
    font-weight: bold;
    font-size: 15px;
  }
  & .meta {
    font-size: 12px;
    color: #666;
    margin-top: 3px;
  }
  /* どのキーで載っているか。作者や話数と続けて読ませると境目が
     分からないので、ここで間を空ける */
  & .key {
    margin-right: 8px;
  }
  /* 送り先を開くボタン。押せることは分かるが、
     中の「送る」ボタンより弱く見せる */
  & .toggle {
    flex: none;
    min-width: 0;
    padding: 6px 12px;
    border: 0;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
    color: #444;
    background-color: #e4e4e4;
    cursor: pointer;
    &:hover {
      background-color: #d6d6d6;
    }
    /* 開いている間は押し込んだ見え方にする */
    &[aria-expanded="true"] {
      color: #666;
      background-color: #d6d6d6;
    }
    /* 閉じるだけのものは、枠に溶かしておく。線も細く */
    &.close {
      font-size: 20px;
      font-weight: normal;
      color: #999;
      background-color: transparent;
      &:hover {
        color: #444;
        background-color: transparent;
      }
    }
  }
  /* 見つからなかったものは、ジャケットも話数も無い。入れてもらった URL を
     控えめに出すだけなので、そこだけ折り返しを許す */
  & li.is-unknown {
    padding: 15px;
    & .meta {
      word-break: break-all;
    }
  }
  & .unregistered {
    font-size: 13px;
    /* 入れてもらったものと、そこから先の話とを読み分けられるよう一段空ける */
    margin-top: 20px;
  }
  /* 送ったあとに何が起きるかの補足。ボタンより弱く */
  & .hint {
    font-size: 12px;
    color: #888;
    margin-top: 8px;
  }
}
/* 見つからなかったときの印。文字だけだと本文に紛れるので、小さく囲って先頭に置く */
.badge {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
  /* 見つからなかった印。押す先はあるが、番組が分かっているわけではない */
  color: #fff;
  background-color: #999;
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
  margin-top: 12px;
  padding: 15px;
  background-color: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 6px;
  /* 座布団の中（未登録の行）では最初の要素が詰まって見えるので、
     見出しの既定の余白だけ消しておく */
  & p:first-child {
    margin-top: 0;
  }
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
  /* 送り先が1つだけのとき（登録済み）は、枠の余白だけで足りる */
  &:first-child {
    margin-top: 0;
  }
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
import matchRegistered, { matchByHost, normalizeTitle, searchRegistered } from '@/lib/registered-match.js'
import feedTitle from '@/lib/feed-title.js'
import parseQuery from '@/lib/parse-query.js'
import Cover from '@/components/cover.vue'
// レイアウトが既に読んでいるので、ここで読んでも増えない
import build_info from '@/static/downloads/build_info.json'
import registerRequestIssueUrl from '@/lib/register-request-issue.js'
import requestFormValues from '@/lib/request-form-values.js'
import { jst } from '@/lib/jst'
import RequestForm from '@/components/request-form.vue'
import RequestBookmarklet from '@/components/request-bookmarklet.vue'

// 登録中の番組。判定に要るキー・フィード・番組名だけを持つ軽いファイルで、
// fetch-feeds が data/rss.json から作る（issue #229）
const REGISTERED_JSON = '/registered.json'

// 未登録として並べる数。これ以上あるときは件数に + を付けて、
// 語を足して絞り込んでもらう（登録済みのほうは全部出す。ジャケットだけなので）
const SEARCH_LIMIT = 10

export default {
  components: { RequestForm, RequestBookmarklet, Cover },
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
      // iTunes の検索結果を打ち切ったか（未登録の件数に + を付ける）
      truncated: false,
      registered: null,
      registeredAvailable: true,
      // 送信フォームは、必要になったときだけ開く
      formOpen: false,
      formValues: {},
      // 送り先を開いている行（未登録）。キーはフィードの URL
      openRows: {},
      // ジャケットを押して開いている番組（登録済み）。1つだけ持つ
      openRegisteredKey: ''
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
    unregisteredChannels: function() {
      return this.candidates.filter(channel => !channel.matched.length)
    },
    // 同じ番組に当たった候補が複数出ることがある（iTunes に同名の別番組があり、
    // そちらも番組名で当たる。rebuild で2件出ていた）。ここで並べるのは
    // **登録済みの番組**なので、キーで1つにまとめる
    registeredChannels: function() {
      const seen = new Set()
      return this.candidates.filter(channel => {
        const key = this.registeredKey(channel)
        if(!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    // ジャケットを押して開いている番組。開くのは1つまで
    openRegisteredChannel: function() {
      if(!this.openRegisteredKey) return null
      return this.registeredChannels.find(channel => this.registeredKey(channel) === this.openRegisteredKey) || null
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
      this.truncated = false

      try {
        const registered = await this.loadRegistered()
        const channels = await this.findChannels(registered)
        const candidates = channels.map(channel => ({
          ...channel,
          // 登録中の一覧から作った候補は、どれに当たったかを持っている
          matched: channel.matched || matchRegistered(registered, channel)
        }))
        // 登録済みの番組は、iTunes の結果を待たずに必ず出す。iTunes の検索に
        // 出てこない番組（Apple に載っていない、名前が違う）でも、
        // 「もう載っている」ことだけは一覧から答えられる（nora → noracast）
        const found = searchRegistered(registered, this.name).filter(
          entry => !candidates.some(channel => channel.matched.some(match => match.key === entry.key))
        )
        this.candidates = [...candidates, ...found.map(entry => this.fromRegistered(entry))]
        // 迷いようが無いものは、畳まずに出す。ブックマークレットや URL から
        // 来た場合はたいてい1件で、そこでクリックを1回増やしたくない
        this.openRows = this.unregisteredChannels.length === 1
          ? { [this.unregisteredChannels[0].feed]: true }
          : {}
        this.openRegisteredKey = this.registeredChannels.length === 1
          ? this.registeredKey(this.registeredChannels[0])
          : ''
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
        // 出す数より1件多く取る。返ってきたらまだ先がある（表示には使わない）
        const channels = toChannels(await this.fetchJson(searchUrl(term, SEARCH_LIMIT + 1)))
        if(!channels.length) continue
        this.truncated = channels.length > SEARCH_LIMIT
        return channels.slice(0, SEARCH_LIMIT)
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
    isOpen: function(channel) {
      return !!this.openRows[channel.feed]
    },
    // 出すのは登録してある側の番組名。iTunes 側の名前を出すと、同名の別番組に
    // 当たったときにその名前が出てしまう
    registeredTitle: function(channel) {
      return (channel.matched.length && channel.matched[0].title) || channel.title || ''
    },
    // 登録済みの番組を指すキー。ジャケットの画像もこれで引く
    registeredKey: function(channel) {
      return channel.matched.length ? channel.matched[0].key : ''
    },
    // カバー画像はビルド時に取ったもの（static/downloads/cover）を使う。
    // 取れていない番組もあるので、そのときは頭文字で代わりの升目を出す
    hasCover: function(channel) {
      const entry = build_info.channels[this.registeredKey(channel)]
      return !!(entry && entry.cover)
    },
    toggleRegistered: function(channel) {
      const key = this.registeredKey(channel)
      this.openRegisteredKey = this.openRegisteredKey === key ? '' : key
    },
    toggleRow: function(channel) {
      this.openRows = { ...this.openRows, [channel.feed]: !this.openRows[channel.feed] }
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
