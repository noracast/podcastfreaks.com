<template>
  <div class="root">
    <h2>About</h2>
    <!-- 文の途中に改行を入れると出力に半角空白が入るので、段落は1行で書く -->
    <p>このサイトは、近頃流行りの日本語テック系ポッドキャストのアクティビティをまとめたサイトです。中の人は<a-blank href="https://noracast.jp">noracast</a-blank>というポッドキャスト好きの３人組がポッドキャストについて話す番組をやっているので、よかったら聞いてみください。<br>リストへの追加・修正または削除のご希望がある場合は、<nuxt-link to="/request/">リクエストページ</nuxt-link>から教えてください。</p>
    <h3>ざっくりとした仕組みの解説</h3>
    <p>手動で登録しているのは、フィードURLと、公式X、公式ハッシュタグの３つで、残りの情報は取得したデータを元に作っています。フィードや画像の取得はビルド時に行っています。毎日00:00:00(UTC+0900)に、NetlifyのWebhookをIFTTTから叩いてビルドしています。<br><br><a-blank class="noborder" href="https://app.netlify.com/projects/podcast-freaks/deploys"><img class="badge" src="https://api.netlify.com/api/v1/badges/8fefaabc-7813-412d-a1ee-901215b39f14/deploy-status" alt="Netlify Status"></a-blank></p>
    <h3>フィードの取得状況</h3>
    <p>毎日のビルドで見つかった問題は<nuxt-link to="/errors/">Errors ページ</nuxt-link>に出しています。取得できなかった番組のほか、収録時間やカバー画像を読み取れなかった番組も挙げています。<br>ご自身の番組が挙がっていましたら、フィードをご確認いただけると助かります。原因が分からない場合はリクエストページからお知らせください。</p>
    <h3>Duration と Frequency の見方</h3>
    <p>一覧の Duration と Frequency は、番組ごとに求めた値をおおまかな段階に丸めて出しています。取りうる値は次のとおりです。</p>
    <h4 id="duration">Duration</h4>
    <p class="note">各エピソードの収録時間（RSSの itunes:duration）の中央値です。短いものほど濃い青にしています。</p>
    <ul class="legend">
      <li>
        <duration :linked="false" duration="00:10:00" />
        <span>15分00秒まで</span>
      </li>
      <li>
        <duration :linked="false" duration="00:25:00" />
        <span>15分を超えて30分まで</span>
      </li>
      <li>
        <duration :linked="false" duration="00:40:00" />
        <span>30分を超えて45分まで</span>
      </li>
      <li>
        <duration :linked="false" duration="00:50:00" />
        <span>45分を超えて1時間未満</span>
      </li>
      <li>
        <duration :linked="false" duration="01:10:00" />
        <span>1時間から1時間29分まで</span>
      </li>
      <li>
        <duration :linked="false" duration="01:45:00" />
        <span>1時間30分から1時間59分まで</span>
      </li>
      <li>
        <duration :linked="false" duration="02:30:00" />
        <span>2時間以上</span>
      </li>
      <li>
        <duration :linked="false" />
        <span>収録時間を読み取れなかった番組</span>
      </li>
    </ul>
    <h4 id="frequency">Frequency</h4>
    <p class="note">直近の更新日の間隔の中央値です。更新が多いものほど鮮やかな緑にしています。</p>
    <ul class="legend">
      <li>
        <frequency :linked="false" :interval="1" />
        <span>2日未満</span>
      </li>
      <li>
        <frequency :linked="false" :interval="3" />
        <span>2日から4日</span>
      </li>
      <li>
        <frequency :linked="false" :interval="7" />
        <span>5日から9日</span>
      </li>
      <li>
        <frequency :linked="false" :interval="14" />
        <span>10日から17日</span>
      </li>
      <li>
        <frequency :linked="false" :interval="30" />
        <span>18日から44日</span>
      </li>
      <li>
        <frequency :linked="false" :interval="60" />
        <span>45日から119日</span>
      </li>
      <li>
        <frequency :linked="false" :interval="200" />
        <span>120日以上</span>
      </li>
      <li>
        <frequency :linked="false" />
        <span>更新した日が1日分しかなく、間隔を求められなかった番組</span>
      </li>
    </ul>
    <h3>Apple Podcasts のリンクについて</h3>
    <p>一覧に出るApple Podcastsへのリンクは、iTunesの検索APIで<strong>フィードURLが一致した番組にだけ</strong>自動で付けています。Apple側に登録されているフィードURLがこのサイトのものと違う場合（配信元を移行した、FeedBurnerを経由しているなど）は自動では特定できず、リンクが出ません。番組名が近いというだけで採用すると別の番組にリンクしてしまうため、確実でないものは出さない方針です。<br>リンクが出ていない番組がありましたら、そのApple PodcastsのURLを<nuxt-link to="/request/">リクエストページ</nuxt-link>からお知らせください。Githubアカウントをお持ちの方は<a-blank href="https://github.com/noracast/podcastfreaks.com/blob/main/data/apple-podcasts.json">こちらのファイル</a-blank>へPRを送っていただけると確実です。</p>
    <h3>X アカウントについて</h3>
    <p>MCの方個人のXアカウントですと、番組以外の情報が混ざってしまいやすいので、番組公式のものに限っています。<br></p>
    <h3>OPMLダウンロード</h3>
    <p>トップページから、書き出したい番組の一番右にあるチェックボックスにチェックをして、「Download OPML」ボタンを押すとOPMLファイルがダウンロードできます。<br>MacとiOSをご使用の場合は、MacからAirDropで送るとiOS側でPodcastアプリを選択し、簡単に登録することができます。</p>
    <h3>音声の再生について</h3>
    <p>このサイトで再生する音声は、預かったり中継したりせず、各番組の配信サーバーにあるファイルをブラウザから直接再生しています。配信元のログにはお聴きの方のアクセスがそのまま残るので、ここでの再生は各番組の統計に計上されます。フィードに書かれたURLは計測用のものも含めて一切書き換えていません。ファイルの保存機能は用意していません。<br>フィードに掲載拒否（itunes:block / podcast:block）が指定されている番組は、一覧に出していません。掲載を止めたい場合は、フィードでの指定のほか、<nuxt-link to="/request/">リクエストページ</nuxt-link>からもお知らせいただけます。</p>
    <h3>Contribution</h3>
    <p>このプロジェクトのソースは下記にて公開しています。Bug Report や Pull Request などありましたらこちらでも受け付けます。<br><a-blank href="https://github.com/noracast/podcastfreaks.com">https://github.com/noracast/podcastfreaks.com</a-blank></p>
  </div>
</template>

<style scoped>
.root {
  padding: 20px;
  max-width: 600px;
  /* ヘッダーは position: sticky で上に貼り付いたままなので、アンカーで飛ぶと
     見出しがその下に潜ってしまう。ヘッダーの高さ（80px）に余白を足して逃がす。
     Nuxt の scrollBehavior はこの値を読んで飛び先をずらしてくれる */
  & h3, h4 {
    scroll-margin-top: 100px;
  }
  & a:not(.noborder) {
    border-bottom: 1px dotted #999;
    padding-bottom: 0.2em;
  }
  .badge {
    margin-right: 10px;
  }
  & h4 {
    font-size: 14px;
    margin: 25px 0 3px;
  }
  .note {
    color: #666;
    font-size: 13px;
    margin: 0 0 12px;
  }
  /* 一覧に出ているバッジそのものを並べる。凡例と実物がずれないようにするため、
     色や文言をここで書き写さず、duration / frequency の各コンポーネントに描かせる */
  .legend {
    list-style: none;
    padding: 0;
    margin: 0;
    & li {
      display: flex;
      align-items: center;
      padding: 3px 0;
      font-size: 13px;
      /* バッジ（duration / frequency のルート要素）は自分で margin-right を
         持っているので、説明との間隔はここで決め直す。
         要素を書かずに >* や >:first-child とすると、Vue 3 の scoped 変換が
         属性セレクタを別の位置に差し込んで別物のセレクタになる */
      >.badge {
        flex: none;
        margin-right: 12px;
      }
    }
  }
}
/* 狭い画面ではヘッダーが 70px になる */
@media (max-width: 900px) {
  .root {
    & h3, h4 {
      scroll-margin-top: 90px;
    }
  }
}
</style>

<script>
import Duration from '@/components/duration.vue'
import Frequency from '@/components/frequency.vue'

export default {
  setup() {
    useHead({ title: 'About | Podcast Freaks - Japanese techie podcast archive' })
  },
  components: { Duration, Frequency }
}
</script>
