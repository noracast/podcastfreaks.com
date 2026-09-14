<template>
  <div class="root" :class="{ 'show-all-columns': showAllColumns }">
    <!-- 検索と操作ボタン。狭い画面では上下に分かれる（<style> の @media）。
         下へ送ると上へ抜けていき、上へ戻すとその分だけ下りてくる
         （<script> の onStickyScroll） -->
    <div ref="tools" class="tools">
      <input v-model="query" class="search" type="search" placeholder="Search">
      <div class="actions">
        <!-- 書き出す対象は「いま一覧に出ている番組」。検索と Hosting の
             絞り込みがそのまま選択になるので、行ごとのチェックは置かない。
             何件書き出すのかが分かるよう、数を添える -->
        <button ref="downloadBtn" class="download" :disabled="sortedChannels.length == 0" @click="downloadOpml">Download OPML ({{ sortedChannels.length }})</button>
        <!-- 画面が狭くて列を隠しているときだけ出す。出すと表は横スクロールになる。
             文言は「押したらどうなるか」。状態ではないので aria-pressed は付けない -->
        <button v-if="hasHiddenColumns" class="toggle-columns" @click="toggleAllColumns">{{ showAllColumns ? 'Compact' : 'All columns' }}</button>
      </div>
    </div>

    <!-- 横に流しているときの、見出しの行の写し。表の中の見出しは
         overflow を持つ枠の中にいるので、ページのスクロールでは貼り付かない。
         そこだけ表の外に出して、画面に貼り付ける。横に送った分は
         scrollLeft を合わせて追いかける（<script> の syncHeadClone）。

         **中身は下の見出しの行と同じものを書いている。片方だけ直さないこと。**
         コンポーネントに切り出さないのは、列の幅・余白・隠す列といった
         指定がこのファイルの scoped な <style> にあり、切り出すと
         どれも効かなくなるため -->
    <div v-if="tableOverflows" ref="headClone" class="head-clone" :style="{ height: theadHeight }">
      <table :style="{ width: `${cloneTableWidth}px` }">
        <thead>
          <tr>
            <th
              v-for="(col, i) in columns"
              :key="col.key"
              :class="[col.class, { sortable: col.sortable }]"
              :style="{ width: cloneWidths[i] != null ? `${cloneWidths[i]}px` : null }"
              :title="col.tooltip"
              @click="sortBy(col)"
            >
              <span v-if="col.filter" class="hosting-filter" :class="{ 'is-active': !!hostingFilter }">{{ col.label }}<select :value="hostingFilter" @change="filterByHosting($event.target.value)" @click.stop>
                <option value="">すべて</option>
                <option v-for="o in hostingOptions" :key="o.value" :value="o.value">{{ o.label }} ({{ o.count }})</option>
              </select></span>
              <template v-else>{{ col.label }}<span class="sort-icon">{{ sortIcon(col) }}</span></template>
            </th>
          </tr>
        </thead>
      </table>
    </div>

    <!-- 列を全部出すと画面に収まらないので、表ごと横スクロールさせる。
         ただし収まっている間は overflow を持たせない（見出しの貼り付きが
         効かなくなるため。<style> の .table-scroll） -->
    <div ref="tableScroll" class="table-scroll" :class="{ 'is-scrollable': tableOverflows }">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[col.class, { sortable: col.sortable }]"
              :title="col.tooltip"
              @click="sortBy(col)"
            >
              <!-- ラベルは "Hosting" のまま固定し、透明な select を重ねる。
                   select 自体に文字を出すと、絞り込み中に見出しの文言が変わってしまう -->
              <span v-if="col.filter" class="hosting-filter" :class="{ 'is-active': !!hostingFilter }">{{ col.label }}<select :value="hostingFilter" @change="filterByHosting($event.target.value)" @click.stop>
                <option value="">すべて</option>
                <option v-for="o in hostingOptions" :key="o.value" :value="o.value">{{ o.label }} ({{ o.count }})</option>
              </select></span>
              <template v-else>{{ col.label }}<span class="sort-icon">{{ sortIcon(col) }}</span></template>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in sortedChannels" :key="row.key">
            <!-- 子行の開け閉めは行のどこを押しても効く。
                 行の中のリンクや操作部品は、それぞれの働きを優先する -->
            <tr class="row" @click="onRowClick(row, $event)">
              <!-- アイコンの名前を出している間は、この列ごと前に出す。
                   名前は右へはみ出すので、そのままだと隣の列（日付）の
                   文字が上に描かれて重なる -->
              <td class="title" :class="{ 'has-revealed-link': revealedLink.startsWith(`${row.key}:`) }">
                <div class="title-cell">
                  <!-- カバー画像はもともと別の列だったが、見出しが2つに割れて
                       片方が空欄になり収まりが悪かったので、この列に入れた -->
                  <cover class="cover" :channel="row.key" />
                  <div class="clip">
                    <!-- .value をタイトルの文字幅に沿わせる。
                         省略は内側の .text が受け持つので、バッジは省略に巻き込まれない -->
                    <span class="value">
                      <!-- New! はタイトルの文字列の右上に出したいので、アイコン群まで
                           含む .value ではなく、タイトルだけをくるむ .headline を
                           基準にする -->
                      <span class="headline">
                        <span v-if="isRecentlyAdded(row.addedAt)" class="new" :title="addedTitle(row.addedAt)">New!</span>
                        <!-- 収まらないときは「…」で省略する。触れる（長押しする）と
                             流れて先まで読める（components/marquee-text.vue）。
                             title 属性はポインタのある環境の保険として残す -->
                        <marquee-text class="text" :title="row.title">{{ row.title }}</marquee-text>
                      </span>
                      <!-- タイトルの後ろに並べる外部リンク。
                           Apple 側と登録フィードURLが違う番組は自動で特定できないため、
                           Apple Podcasts のリンクを持たない番組がある
                           （data/apple-podcasts.json に手で足せる） -->
                      <!-- .link は3つに共通で付ける目印。スタイルを当てるのに
                           `>*` と書くと、Vue 3 の scoped 変換が属性セレクタを
                           別の位置に差し込んでしまう（下の .links を参照） -->
                      <!-- 指の環境では重ねられないので、アイコンを押すと名前を出す。
                           もう一度押すと閉じ、開くのは出ている名前を押したときだけ
                           （onLinkTap）。ポインタのある環境は今までどおり -->
                      <span class="links" :class="{ 'has-revealed': revealedLink.startsWith(`${row.key}:`) }">
                        <apple-podcasts-link v-if="row.applePodcasts" class="link" :class="{ 'is-revealed': revealedLink === `${row.key}:apple` }" :url="row.applePodcasts" @click="onLinkTap(`${row.key}:apple`, $event)" />
                        <x-link v-if="row.twitter" class="link" :class="{ 'is-revealed': revealedLink === `${row.key}:x` }" :account="row.twitter" @click="onLinkTap(`${row.key}:x`, $event)" />
                        <hashtag-link v-if="row.hashtag" class="link" :class="{ 'is-revealed': revealedLink === `${row.key}:hashtag` }" :hashtag="row.hashtag" @click="onLinkTap(`${row.key}:hashtag`, $event)" />
                      </span>
                    </span>
                  </div>
                </div>
              </td>
              <td class="file-server">
                <div class="clip">
                  <!-- 配信サービスは名前で、ただ置いてあるだけのホストはホスト名で出す。
                       長いホスト名は触れる（長押しする）と流れて先まで読める -->
                  <small :title="row.fileServer"><marquee-text>{{ hostingLabel(row.fileServer) }}</marquee-text></small>
                </div>
              </td>
              <td class="last">
                <a-blank v-if="row.lastEpisodeLink" :href="row.lastEpisodeLink">
                  <!-- .value を基準にして、バッジを日付の右上に置く -->
                  <span class="value"><span v-if="isIn(row.lastEpisodeDate, newThreshold1)" class="new" :title="newTitle1">New!</span>{{ formatDate(row.lastEpisodeDate) }}</span>
                </a-blank>
                <span v-else class="date">
                  <span class="value"><span v-if="isIn(row.lastEpisodeDate, newThreshold1)" class="new" :title="newTitle1">New!</span>{{ formatDate(row.lastEpisodeDate) }}</span>
                </span>
              </td>
              <td class="first">
                <a-blank v-if="row.firstEpisodeLink" :href="row.firstEpisodeLink">
                  <span class="value"><span v-if="isIn(row.firstEpisodeDate, newThreshold2)" class="new" :title="newTitle2">New!</span>{{ formatDate(row.firstEpisodeDate) }}</span>
                </a-blank>
                <span v-else class="date">
                  <span class="value"><span v-if="isIn(row.firstEpisodeDate, newThreshold2)" class="new" :title="newTitle2">New!</span>{{ formatDate(row.firstEpisodeDate) }}</span>
                </span>
              </td>
              <td class="total">{{ row.total }}</td>
              <td class="frequency"><frequency :interval="row.updateInterval" /></td>
              <td class="duration"><duration :duration="row.durationMedian" /></td>
            </tr>
            <tr v-if="openedKey === row.key" class="child-row">
              <td :colspan="columns.length">
                <div :ref="`wrap-${row.key}`" class="wrap">
                  <!-- 影はスクロールしない枠に重ねる。スクロールする側に置くと、
                       端に着いたときに位置が食い違う -->
                  <div class="column">
                    <div class="info" :class="{ 'is-expanded': infoExpanded }">
                      <!-- 番組の説明はフィードに書かれた HTML。体裁を保つために
                           v-html で出すが、中身は fetch-feeds.js の sanitizeDescription で
                           許可したタグと属性だけに濾してある -->
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <!-- 説明に裸で書かれた URL は押せないので、ここでリンクにする
                           （v-html に渡すのは sanitize 済みの HTML。lib/linkify.js） -->
                      <p v-if="row.desciprtion" class="description" v-html="linkify(row.desciprtion)" />
                      <p v-else class="description">No description</p>
                      <button-text v-if="row.link" :text="row.link" :button-text="'Open Web'" button-action="'open'" />
                      <button-text :text="row.feed" :button-text="'Copy RSS'" />
                    </div>
                    <!-- 狭い画面では説明をスクロールさせず、収まらない分は畳んでおく。
                         入れ子のスクロールがあると、その上で指を動かしたときに
                         ページ全体が動かせなくなる -->
                    <!-- 文字を包む span は、横スクロールしても画面の真ん中に
                         出すためのもの（下の .show-more を参照） -->
                    <button v-if="infoOverflows && !infoExpanded" class="show-more" @click="infoExpanded = true"><span>Show more</span></button>
                  </div>
                  <!-- エピソードは番組ごとの別ファイルにあり、行を開いた時点で読み込む -->
                  <div class="column">
                    <div class="episodes" @scroll="onEpisodesScroll(row.key, $event)">
                      <template v-if="episodes[row.key]">
                        <episode-item
                          v-for="(ep, i) in visibleEpisodes(row.key)"
                          :key="i"
                          :episode="ep"
                          :channel="{ key: row.key, title: row.title }"
                        />
                      </template>
                      <p v-else-if="episodesFailed[row.key]" class="episodes-status">エピソードを読み込めませんでした</p>
                      <p v-else class="episodes-status">Loading…</p>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <p v-if="!sortedChannels.length" class="no-result">該当する番組はありません</p>
    </div>
  </div>
</template>

<style scoped>

@keyframes child-row-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.download {
  /* 書き出す数を添えるぶん、文字が長い。折り返すと2行になって
     隣のボタンと高さが揃わなくなるので、幅は中身に合わせる
     （150px だと「Download OPML (234)」が入らなかった） */
  width: auto;
  min-width: 150px;
  white-space: nowrap;
  /* ヘッダーと同じ背景。普段はヘッダーと同じだけ透かし、ホバーで
     透けを止めて色をはっきりさせる */
  background-color: transparent;
  -webkit-backdrop-filter: blur(12px) saturate(190%);
  backdrop-filter: blur(12px) saturate(190%);
  /* 色は背景に直接置かず、重ねた1枚に描いてその不透明度で調整する。
     半透明の層を何枚も重ねると、掛け算で効いて後ろがほとんど残らない
     （最初そうなっていて、透けて見えなかった）。
     ぼかしすぎると色が平均化されて白に寄るので、ジャケットの形が
     うっすら分かるくらいに留める。彩度は上げて戻す（これが無いと灰色になる）。
     使う側は position を持っていること */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    pointer-events: none;
    /* 角丸のある要素に使うと、重ねた色が角からはみ出す */
    border-radius: inherit;
    background-color: var(--brand-base);
    background-image: var(--brand-texture);
    opacity: var(--brand-glass-opacity);
  }
  /* 重ねた色を自分の中に閉じ込める（囲いを作らないと背面へ抜けてしまう） */
  z-index: 0;
  &::before {
    transition: opacity 0.2s;
  }
  &:not([disabled]) {
    &:hover::before, &:active::before {
      opacity: 1;
    }
    &:active {
      filter: brightness(1.08);
    }
  }
}
/* 隠れている列を出すための切り替え。Download OPML の左に置く。
   普段は目立たせず、押した状態のときだけ色を付ける */
.toggle-columns {
  /* Download OPML と高さを揃える（実測 34px。padding 10px×2 ＋ 文字 14px） */
  height: 34px;
  padding: 0 12px;
  font-size: 12px;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  /* layouts/default.vue の非スコープな button に背景色と、ホバー・押下時の
     背景色（紫）の指定がある。あちらは :not([disabled]):hover まで書いてあって
     こちらより強いので、同じ状態を名指しで打ち消す。
     地は Duration / Frequency のバッジと同じ #ededed。白文字だと薄い地に
     乗って読みにくかったので、文字は濃いグレーにしている。
     濃くするのはホバーのときだけ。今どちらの状態かはラベルが示すので、
     色でも示すと押していないのに濃い、という見え方になる */
  &, &:active {
    background-color: #ededed;
    color: #999;
  }
  &:hover {
    background-color: #e2e2e2;
    color: #777;
  }
}

/* 新しいことを表す目印の吹き出し。日付の上、またはタイトルの上に浮かせる。
   
   以前は top: -40px / right: -30px だったが、行の高さが変わったことで
   上の行に食い込み、さらに右へはみ出して隣の列に重なっていた。
   自分の行の中に収まる位置に直し、指す対象の真上に置く */
.new {
  background: #f7ff00;
  font-weight: bold;
  font-size: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 50px;
  height: 20px;
  border-radius: 10px;
  color: #47525d;
  position: absolute;
  /* 行の区切り線ではなく、指し示す文字列のすぐ上に置く。
     吹き出し自体は文字に被せず、▼ の先だけが少し重なる。
     左右は文字列の右端を基準にして、少し右へずらす */
  top: -23px;
  right: -30px;
  &:after {
    content: '▼';
    font-size: 12px;
    line-height: 1em;
    position: absolute;
    display: block;
    color: #f7ff00;
    bottom: -7px;
    left: calc(50% - 8px);
    transform: rotate(19deg);
  }
}
.root {
  /* 貼り付く起点（--sticky-top）とすりガラスの質感（--glass-*）は
     assets/common.css の :root にまとめてある。Episodes の濃淡
     （pages/episodes.vue の .heatmap）と同じものを使う */
  /* 検索の帯の高さと、そのうち上へ隠れている分。どちらも JS が測って入れる
     （下へ送ると隠れ、上へ戻した分だけ出てくる。<script> の onStickyScroll） */
  --tools-height: 0px;
  --tools-hidden: 0px;
  /* 見出しの行の高さ。すりガラスをここまで伸ばす（.tools の ::before） */
  --thead-height: 0px;
  /* 表を横に送れる最大量。見出しの写しを同じだけ動かす（JS が測る） */
  --clone-pan: 0px;
  /* 表の横スクロールを、枠の外にいる写しから参照できるようにする */
  timeline-scope: --table-pan;
  /* 上の余白は .tools が持つ。貼り付いたときに、余白ごと1枚の帯として
     すりガラスで覆いたいため（ここに置くと、帯の上に透ける隙間が残る） */
  padding-bottom: 20px;
  -webkit-overflow-scrolling: touch;
  overflow-scrolling: touch;
  position: relative;
  & table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
  }
  /* th のクラスは列の定義（columns の class）がそのまま入る */
  & th {
    white-space: nowrap;
    /* Hosting の見出しに重ねる select の基準にする。
       ソートアイコンを右端へ重ねるときの基準でもある。
       他の見出しはセル全体がクリック領域なので、それに合わせる */
    position: relative;
    /* 伸び縮みするのは Channel と Hosting だけ。他の列は内容の幅で止める
       （下の width: 1%）。余った幅はこの2つに、この比で配られる。
       Hosting は中身（.clip）が絶対配置で幅を主張しないため、狭いときは
       .clip の min-width（60px）まで縮み、広いときはホスト名が読める幅まで伸びる */
    &.title {
      width: 80%;
    }
    /* 余りに応じて伸び縮みする。
       
       表のセルでは max-width が無視される（実測。min() / clamp() や px 指定も
       効かず、内容の幅まで縮んでしまった）。この表で列を伸縮させられるのは
       % 指定だけなので、頭打ちは画面幅ごとに比率を下げて作る（この下の @media） */
    &.file-server {
      width: 15%;
    }
  }
  /* 画面が広いとき、余った幅をこれらの列が吸って間延びする。
     
     table-layout: auto では width の指定は目安でしかなく、余った幅は指定値に
     比例して配られてしまう（width: 115px と書いても135pxになった）。min-width も
     同じように扱われる。伸びを確実に止められるのは width: 1%（できるだけ狭く）で、
     このとき列は内容の幅ちょうどに張り付く */
  & th.total, td.total, th.first, td.first, th.last, td.last, th.frequency, td.frequency, th.duration, td.duration {
    width: 1%;
    white-space: nowrap;
  }
  /* 「New!」の吹き出しは日付の右上へ30pxずらして浮かせてある。列を内容の幅まで
     詰めると隣の列へはみ出すので、そのぶんの余白を右に足す。
     
     吹き出しがあるのは td の側だけなので、th には足さない。th に足すと
     First episode の側だけ列が広くなり、2つの日付の列で幅が食い違う */
  & td.first, td.last {
    padding-right: 30px;
  }
  & th,td {
    text-align: left;
    vertical-align: top;
    padding: 10px;
    outline: 0;
    &:first-child {
      padding-left: 20px;
    }
  }
  /* 見出しの行は、ヘッダーと検索の帯の下に貼り付ける。
     どの列を見ているのかが、下まで送っても分かるようにする。
     貼り付く位置は検索の帯のすぐ下（帯とこの行は、間を空けずに動く）。

     **すりガラスはここには敷かない。** backdrop-filter はその要素の裏だけを
     ぼかすので、敷いた数だけ境目ができる（セルごとに敷けば桝目が、
     検索の帯と2枚に分ければその間に線が見えた）。1枚で覆うのは
     .tools の ::before で、この行のぶんまで下へ伸ばしてある。
     文字はその上に出したいので、検索の帯より前に置く */
  & thead {
    color: #ccc;
    font-size: 12px;
    position: sticky;
    top: calc(var(--sticky-top) + var(--tools-height) - var(--tools-hidden));
    /* header は 5、検索の帯（すりガラスの1枚）は 3 */
    z-index: 4;
    & th {
      font-weight: normal;
    }
  }
  /* 横スクロールにしているときは、この中が基準になるので貼り付けられない。
     貼り付く位置（ヘッダーと帯の高さ）が**表の中の位置**として効き、
     見出しの行が表の途中に浮いてしまう。
     代わりに上の .head-clone を出すので、こちらは場所を取るためだけに残す
     （列の幅はこの行が決めている。消すと写しと幅が合わなくなる） */
  .table-scroll.is-scrollable thead {
    position: static;
    visibility: hidden;
  }
  /* 表の外に出した、見出しの行の写し。貼り付く位置は表の中の見出しと同じ。
     すりガラスは検索の帯の1枚が下まで伸びているので、ここには敷かない */
  .head-clone {
    position: sticky;
    top: calc(var(--sticky-top) + var(--tools-height) - var(--tools-hidden));
    /* header は 5、検索の帯（すりガラス）は 3 */
    z-index: 4;
    /* 横に送った分を切る。scrollLeft を表と合わせて追いかける */
    overflow: hidden;
    /* 場所は取らない。下の表の（隠した）見出しの行にちょうど重なる */
    margin-bottom: calc(-1 * var(--thead-height));
    & table {
      /* 幅は測って入れる（<script> の syncHeadClone）。
         auto のままだと、写しの中身だけで列の幅が決まってずれる */
      table-layout: fixed;
      /* 横に送った量に直結させる。scroll イベントで追いかけると
         1フレーム遅れて、見出しだけ遅れて付いてくる。
         繋げないブラウザでは JS が同じ transform を当てる（onTableScroll） */
      animation: head-clone-pan linear both;
      animation-timeline: --table-pan;
    }
    /* 測って渡すのは外側の幅（余白を含む）。border-box にしておかないと、
       table-layout: fixed では余白の 20px が外に足されて1列ずつずれる */
    & th {
      box-sizing: border-box;
    }
  }
  & tbody {
    /* 行のどこを押しても子行が開くので、行全体を押せるものとして見せる。
       子行（.child-row）は別の tr なので、ここには当たらない */
    & tr.row {
      cursor: pointer;
      transition: background-color 0.15s;
    }
    & th,td {
      font-weight: 500;
      font-size: 13px;
      vertical-align: middle;
    }
    & td.title {
      font-weight: bold;
      font-size: 15px;
      /* 日付の列と同じ仕組みで、タイトルの文字列の右上に吹き出しを浮かせる。
         
         .clip の既定では中身が左右いっぱいに広がるため、そのままだと
         「文字列の右端」が取れない。.value を右に伸ばさず（right: auto）、
         列幅までに収まる範囲で文字幅に沿わせることで、短いタイトルでも
         バッジが文字のすぐ右上に付く。
         .value にはタイトルの後ろのアイコン群も入るため、バッジの基準は
         .value ではなくタイトルだけをくるむ .headline にしている */
      .title-cell {
        display: flex;
        align-items: center;
        >.cover {
          flex: none;
          /* 別々の列だったときの td の余白（右10px＋左10px）と同じ間隔にする */
          margin-right: 20px;
        }
        >.clip {
          flex: 1;
        }
        .clip {
          >.value {
            right: auto;
            max-width: 100%;
            overflow: visible;
            /* タイトルとアップルマークを横に並べる。
               幅が足りないときに縮むのはタイトル側だけにしたいので、
               .text に min-width: 0 を与えて flex の既定を外す */
            display: flex;
            align-items: center;
            /* New! の位置の基準。アイコン群を含まないタイトルだけの幅にしたいので、
               .value ではなくここを基準にする。省略は内側の .text が受け持ち、
               ここは overflow を切らないので上にはみ出すバッジが欠けない */
            .headline {
              position: relative;
              /* カバー画像やアイコンと揃える（assets/common.css の
                 --optical-shift を参照）。実測で 2.6px 沈んでいた。
                 New! の吹き出しもここが基準なので、一緒に動く */
              top: var(--optical-shift);
              /* 幅が足りないときに縮むのはタイトル側だけ。flex の既定を外す */
              min-width: 0;
              display: flex;
            }
            /* 省略と、触れたときに流すところは marquee-text が持つ。
               ここでは縮む余地だけ与える */
            .text {
              min-width: 0;
            }
            /* タイトルの後ろに並べる外部リンク。
               幅が足りないときに縮むのはタイトル側だけなので、ここは固定 */
            .links {
              flex: none;
              /* 名前を流れの中に出すと、その幅だけ番組名が縮む。
                 縮む側は番組名（marquee-text）が受け持つ */
              display: flex;
              align-items: center;
              margin-left: 16px;
              /* アイコンの間隔。>*:not(:first-child) と書くと、Vue 3 の
                 scoped 変換が属性セレクタを別の位置に差し込んでしまう */
              /* 指で押せる大きさを確保するため、アイコンの中心どうしを 24px
                 離す。アイコン自体は 14px なので、残りを間隔で持つ */
              gap: 10px;
              >.link {
                position: relative;
                /* 当たり判定だけを 24px へ広げる。padding で広げると
                   アイコンの並びと行の高さが変わるので、透明な板を重ねる。
                   ラベル（下の :deep(.label)）と重ならないよう、
                   重ねるのはアイコンの真上だけにする */
                &::after {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  width: 24px;
                  height: 24px;
                  transform: translate(-50%, -50%);
                }
              }
              /* ホバーしたアイコンの右横に、その名前を出す。
                 
                 アイコンだけでは何のリンクか分からず、リンク先を開くまで
                 確かめられなかった。行の高さと列の幅を変えたくないので、
                 絶対配置にして並びの計算から外す。
                 隣のアイコンに重なるため、行と同じ色の背景を敷いて隠す

                 .label は子コンポーネント（x-link など）の中にあるので
                 :deep() で届かせる。Vue 3 の scoped 変換に2つ癖があるので、
                 セレクタの書き方に決まりがある。

                 - scoped の属性は :deep() の手前にある要素に付くため、
                   **その要素を同じセレクタの中に書く**。:deep() だけを
                   入れ子の中に書くと `... [data-v-x] .label` と子孫側に
                   ずれて、どの要素にも当たらない
                 - `*` は属性そのものに置き換えられるが、`>*:hover` のように
                   疑似クラスが続くと `[data-v-x] > :hover` と結合子の位置まで
                   崩れる。`*` は使わず、クラス（.link）で指す */
              >.link :deep(.label) {
                position: absolute;
                left: 100%;
                top: 50%;
                margin-left: 4px;
                padding-right: 4px;
                /* 隣のアイコンを隠すための下敷き。ラベルが出るのは
                   そのアイコンに触れている間＝行に触れている間なので、
                   白ではなく行のホバー色に合わせる */
                background-color: #f8f5ff;
                /* 出ているときは読ませたいので、添え物の薄さにしない。
                   この文字自体にカーソルを合わせることは無いので、
                   最初から触れているときの濃さで出しておく */
                color: #444;
                font-size: 11px;
                font-weight: normal;
                /* 行間は文字の高さぴったりにする。既定（normal）だと
                   日本語フォントの大きな行送りのぶん箱が上下に広がり、
                   箱の中央で揃えてもアイコンに対して文字がずれて見える */
                line-height: 1;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                /* 少し右から滑り込ませる */
                transform: translate(-4px, -50%);
                transition: opacity 0.2s, transform 0.2s;
              }
              /* @ と # は字形が四角い枠いっぱいに広がらないぶん、
                 Podcast アイコンより間隔を詰めた方が一体に読める */
              >.x :deep(.label), >.hashtag :deep(.label) {
                margin-left: 1px;
              }
              /* 隣のアイコンは DOM の後ろにあるぶん手前に描かれるので、
                 ホバー中のものを前に出して、ラベルの背景で隠せるようにする。
                 指の環境で名前を出しているもの（.is-revealed）も同じ */
              >.link:hover, >.link.is-revealed {
                z-index: 1;
              }
              /* 指の環境で、1回目のタップで出した名前。
                 ホバーのときは絶対配置で隣に重ねるが、指のときは**流れの中に
                 置く**。重ねると、狭い画面では隣の列（日付）にはみ出して
                 文字が重なってしまう。流れの中なら、そのぶん番組名が縮む */
              &.has-revealed {
                /* 出しているアイコンは、ホバーのときと同じくはっきりさせる。
                   普段は 0.35 まで引いてあるので、名前まで薄くなってしまう */
                >.link.is-revealed {
                  opacity: 1;
                }
                >.link.is-revealed :deep(.label) {
                  position: static;
                  opacity: 1;
                  transform: none;
                  margin-left: 4px;
                  padding-right: 0;
                  background-color: transparent;
                  /* 開くのは文字を押したときだけ。アイコンは開け閉めに使う */
                  pointer-events: auto;
                }
                /* 出している間、他のアイコンは引っ込める。
                   場所も空けたいので display で消す */
                >.link:not(.is-revealed) {
                  display: none;
                }
              }
            }
          }
        }
      }
      & span {
        cursor: pointer;
        &:hover {
          color: #5e5e5e;
        }
      }
    }
    /* First episode は「いつ始まったか」で、Last episode ほど日常的には見ない。
       画面が狭くなると Hosting の次に隠れる列でもあるので、Hosting と同じ
       濃さまで引いて、Last episode との区別を付ける。
       a と span.date の両方に効かせる（リンクがある番組と無い番組がある） */
    & td.first {
      color: #ccc;
      & a, .date {
        color: #ccc;
      }
    }
    & td.file-server {
      & small {
        display: block;
        font-size: 10px;
        color: #ccc;
      }
    }
    /* 長いタイトルやホスト名で折り返して行の高さが変わらないよう、1行に省略する。
       
       中身をそのまま nowrap にすると、その幅が列幅の下限になってしまい
       テーブルが画面幅に収まらず横スクロールしてしまう。
       .clip で1階層くるみ、中身を絶対配置にすることで列幅の計算から外す。
       これで「画面幅に応じて伸縮する」と「1行に省略する」が両立する */
    .clip {
      position: relative;
      /* 絶対配置にした中身は高さを持たないので、ここで1行分を確保する */
      height: 1.4em;
      /* 幅を主張しなくなるため、狭くなりすぎない下限を決めておく */
      min-width: 60px;
      >* {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
      }
      /* a でくるまれている列は実際の文字が中の small にあるため、
         外側だけに指定すると「…」が出ずに切り落とされてしまう。
         中に marquee-text を置いた列（Hosting）は、そちらが省略を持つ */
      >*, small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    /* タイトルは可変幅の主役なので、優先的に幅を取る */
    & td.title {
      width: 40%;
    }
    /* アイコンの名前を出している間だけ、この列を前に出す。
       いつも前に出すと、New! の吹き出しなど他の重なりに影響する */
    & td.title.has-revealed-link {
      position: relative;
      z-index: 2;
    }
    & td.total {
      font-size: 18px;
    }
    & td.last, td.first {
      >a, >.date {
        /* /episodes ページの非スコープなスタイルに .date { position: absolute } があり、
           ここで打ち消さないと日付がページ上部へ飛ぶ */
        position: relative;
        display: flex;
        align-items: center;
      }
      /* 日付の文字列そのものを基準にして、その右上にバッジを置く */
      .value {
        position: relative;
      }
    }
    & tr {
      &:first-child {
        border-top: 1px solid #ccc;
      }
      &:not(.child-row) {
        border-top: 1px solid #ccc;
      }
      &.child-row {
        border-top: 1px solid #eee;
        /* 右下のプレーヤーを濃い色にしたので、こちらは薄いグレーにする。
           以前は両方 #222 で、重なったときに境目が分からなかった。
           紫みは入れない。行に触れたときの色（#f8f5ff）と同系統になり、
           開いた行にホバーしたとき差が分からなくなる。
           「開いた中身＝グレーの面」「触れている行＝紫」と役割を分ける */
        background-color: #f6f6f6;
        background-size: auto 21px;
        >td {
          line-height: 1.8em;
          padding: 0;
          /* colspan で全列にまたがるため、内容の幅が他の列の幅計算に影響し、
             子行を開くたびに列の位置がずれてしまう。
             幅の要求を出さないようにする（描画幅は colspan により全幅になる） */
          width: 0;
          >.wrap {
            display: flex;
            /* 高さが動くのに合わせて、中身も淡く出す */
            animation: child-row-in 0.22s ease-out;
            /* td の width: 0 だけでは足りない。中身（長いエピソード名など）の
               最小幅がセルの幅として要求され、開く行によってテーブルが広がって
               横スクロールが出たり出なかったりしていた。
               幅を要求せず、セルいっぱいに広げる */
            width: 0;
            min-width: 100%;
            /* 中身の量で高さが変わると、開くたびに一覧が大きく動くので固定する。
               エピソード6.5話ぶん（1話44px）。半端な数にしてあるのは、
               7話目が半分だけ見えていれば、まだ下に続くと分かるため。
               ちょうど割り切れる高さにすると、そこで終わりのように見える */
            height: 286px;
            >.column {
              position: relative;
              width: 50%;
              height: 100%;
              /* 中身の最小幅を外へ出さない */
              min-width: 0;
              /* エピソードが少ない番組でも左右の区切りが分かるようにする */
              &:last-child {
                border-left: 1px solid #e3e3e3;
              }
              >.info, >.episodes {
                height: 100%;
                overflow-y: auto;
              }
              >.info {
                padding: 20px;
                box-sizing: border-box;
              }
              >.episodes {
                /* /episodes から辿ってきた回を、しばらく光らせる。
                   クラスは JS で付け外しする（pages/index.vue の scrollToEpisode） */
                .episode.is-revealed {
                  background-color: #e7e0f7;
                }
                /* 読み込みが済むまでの控えめな案内。すぐ入れ替わるので目立たせない */
                .episodes-status {
                  padding: 20px;
                  color: #999;
                  font-size: 12px;
                }
              }
            }
          }
        }
        & p {
          max-width: calc(100vw - 30px);
          &:first-child {
            margin-top: 0;
          }
        }
      }
    }
  }
  /* 検索欄とボタンを1本の帯に並べる。ボタンは右端に寄せる */
  .tools {
    display: flex;
    align-items: center;
    gap: 10px;
    /* 上下の余白もこの箱で持つ（.root からここへ移した）。
       貼り付いたときに、余白まで含めて1枚の帯として覆うため */
    padding: 20px;
    margin-bottom: 0;
    /* 見出しの行と一緒に上へ貼り付ける。下へ送ると隠れ、上へ戻すと
       戻した分だけ下りてくる（--tools-hidden は <script> が入れる）。
       検索と Download OPML は、下まで送ったあとでも、少し戻すだけで
       手が届く */
    position: sticky;
    top: calc(var(--sticky-top) - var(--tools-hidden));
    /* header は 5、見出しの行は 4 */
    z-index: 3;
    /* すりガラスはこの1枚だけ。帯と見出しの行を続けて覆う
       （--thead-height は見出しの行の高さ。横スクロールに切り替わって
       いるときは行が一緒に流れていくので 0 が入る）。
       質感は Episodes の濃淡と共通（assets/common.css） */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      bottom: calc(-1 * var(--thead-height));
      z-index: -1;
      pointer-events: none;
      background-color: var(--glass-fill);
      -webkit-backdrop-filter: var(--glass-blur);
      backdrop-filter: var(--glass-blur);
      transition: var(--glass-transition);
    }
    /* 触れている間は塞ぐ（assets/common.css の --glass-fill-hover）。
       ポインタのある環境だけに当てるのはビルド時
       （postcss-hover-media-feature が @media (hover: hover) で囲む） */
    &:hover::before {
      background-color: var(--glass-fill-hover);
    }
  }
  .search {
    padding: 8px;
    outline: none;
    font-size: 13px;
    /* 枠の濃さは、リクエストフォームの入力欄と揃える */
    border: 1px solid #ccc;
    width: 300px;
    &:placeholder-shown {
      color: #ccc;
    }
    &::-webkit-input-placeholder {
      color: #ccc;
    }
    &::-moz-placeholder {
      color: #ccc;
    }
  }
  .actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    /* 右端に Download OPML、その左に All columns。
       狭い画面では並びが逆になる（下の @media） */
    flex-direction: row-reverse;
  }
  /* 列を全部出すと画面に収まらないので、表ごと横に流す。ただし
     overflow を持つ要素はその中がスクロールの基準になり、中の
     position: sticky は**ページのスクロールでは動かなくなる**（見出しが
     貼り付かない）。表が枠に収まっている間は持たせず、収まらないときだけ
     JS が is-scrollable を付ける（<script> の updateStickyMetrics）。
     収まらないのは「All columns」を押したときと、狭い画面
     （タイトルに 180px を確保しているので実測566pxから溢れる） */
  .table-scroll {
    width: 100%;
    &.is-scrollable {
      overflow: auto;
      /* 横に送った量を、見出しの写しへ渡す（.head-clone の animation） */
      scroll-timeline-name: --table-pan;
      scroll-timeline-axis: inline;
    }
  }
  .no-result {
    padding: 40px 20px;
    color: #999;
    font-size: 13px;
  }
  & th.sortable {
    cursor: pointer;
    &:hover {
      color: #7f00ff;
    }
  }
  /* Hosting の見出しは配信サービスで絞り込むプルダウンになっている。
     ラベルの上に透明な select を重ねることで、見出しの文言を変えずに
     ネイティブのプルダウンを使う */
  .hosting-filter {
    display: inline-block;
    cursor: pointer;
    &:hover {
      color: #7f00ff;
    }
    /* 絞り込み中であることが分かるようにする */
    &.is-active {
      color: #7f00ff;
      font-weight: bold;
    }
    /* th を基準に、セル全体を覆う */
    & select {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
  }
  /* ソートアイコンの span はソート中かどうかに関わらず描画されるが、
     ▼▲ が入るのはソート中だけ。幅を常に確保しておかないと、
     ソートするたびに見出しの位置がずれる */
  .sort-icon {
    display: inline-block;
    /* 字は見出しより小さく出す */
    font-size: 0.7em;
    /* 占有幅はラベルの位置合わせにも使う。字そのものは8.4pxしかないので、
       1.6em（19px）では見出しの右に10px近い余白が居座り、
       Frequency / Duration の列を押し広げていた。字＋6pxほどの間隔に詰める。
       この幅は見出しの文字を基準に決めたいので、上で縮めたぶんを割り戻す */
    width: calc(1.2em / 0.7);
    text-align: right;
  }
}
/* 画面が狭くなったら、右の列から順に隠す。
   境界は実測から決めた。233番組のタイトルのうち、Channel 列で省略される行数は
   全部出したままだと 1100px で11行、1040px で20行（うち半分以上省略が2行）と、
   1100px を下回ったあたりから急に増える。Hosting を隠すと 1100px で Channel が
   469px → 585px に戻り、1200px 相当の見え方になる。以下も同じ考え方で、
   「省略が増え始める手前」を境界にしてある。

   幅を測って動的に決めることもできるが、列を隠すと Channel が広がって条件が
   外れ、また出てくる、という往復になる。境界は固定にしている。

   .show-all-columns は「All columns」を押した状態。
   表は .table-scroll が overflow: auto なので、そのまま横スクロールになる */
/* 見出しの写しを、表を横に送った分だけ動かす。進み具合は表のスクロールが
   そのまま渡ってくる（--table-pan）ので、送った量 = --clone-pan の割合になる */
@keyframes head-clone-pan {
  to {
    transform: translateX(calc(-1 * var(--clone-pan)));
  }
}

/* 帯と見出しの行は続きの1枚なので、見出しの行に触れたときも塞ぐ。
   ここだけ @media (hover: hover) を自分で書いているのは、
   :has の中の :hover を postcss-hover-media-feature に渡すと
   ビルドが終わらなくなるため（すでに囲まれているものは触らない） */
@media (hover: hover) {
  .root:has(thead:hover) .tools::before {
    background-color: var(--glass-fill-hover);
  }
}

@media (max-width: 1100px) {
  .root:not(.show-all-columns) th.file-server,
  .root:not(.show-all-columns) td.file-server {
    display: none;
  }
  /* 全部出したときは画面に収まらない。この表は幅に応じて縮む作りなので、
     何もしないと Channel が潰れるだけで横スクロールにならない。
     1100px の見え方を保ったまま溢れさせて、.table-scroll に流させる */
  .root.show-all-columns table {
    min-width: 1100px;
  }
}
@media (max-width: 950px) {
  .root:not(.show-all-columns) th.first,
  .root:not(.show-all-columns) td.first {
    display: none;
  }
}
/* 列を隠す並び（1100px → 950px）の最後。
   ヘッダーの切り替え（900px）とは別の系列なので、揃えずに残してある。
   iPad の縦（834px）では Episodes まで出したい */
@media (max-width: 810px) {
  .root:not(.show-all-columns) th.total,
  .root:not(.show-all-columns) td.total {
    display: none;
  }
}

/* Hosting は % でしか伸縮させられないため、画面が広いほど際限なく広がる。
   ホスト名が読めれば十分で、それ以上はただの空白になるので、広い画面では
   比率を下げて200px前後で頭打ちにする */
@media (min-width: 1400px) {
  .root th.file-server {
    width: 13%;
  }
}
@media (min-width: 1800px) {
  .root th.file-server {
    width: 11%;
  }
}
@media (min-width: 2400px) {
  .root th.file-server {
    width: 8%;
  }
}
@media (max-width: 900px) {
  .root {
    /* 上の余白と、表との間は .tools が持つ（広い画面と同じ理由） */
    padding-bottom: 15px;
    & tbody {
      & th,td {
        font-size: 11px;
      }
      & td.total {
        font-size: 14px;
      }
      /* 画面が狭いと、他の列に押されてタイトルが数文字しか出ない
         （実測で文字に割り当てられる幅が10pxだった）。
         テーブルはもともと横スクロールするので、読める幅を先に確保する */
      & td.title .clip {
        min-width: 180px;
      }
      /* タイトルとアイコン群の間隔も、広い画面ほど要らない */
      & td.title .title-cell .links {
        margin-left: 8px;
      }
    }
    /* Download OPML と Show all columns。子行の中のボタンには届かない
       （scoped CSS はコンポーネントの中まで入らない）ので、
       それぞれのコンポーネントが自分で大きさを決めている */
    .tools button {
      font-size: 10px;
    }
    /* Download OPML と Show all columns を横に並べる。
       button は display: block なので、そのままだと縦に積まれる */
    .download, .toggle-columns {
      display: inline-block;
      vertical-align: top;
    }
    .download {
      height: 38px;
    }
    /* Download OPML と高さを合わせる */
    .toggle-columns {
      height: 38px;
    }
    /* 横に並べる幅が無いので上下に積む。順は DOM のまま（検索が上、ボタンが下）。
       まず絞り込んでから書き出す流れに合う */
    .tools {
      flex-direction: column;
      align-items: stretch;
      gap: 15px;
      /* 下は 30px（もとの margin-bottom 15px ＋ 表の margin-top 15px）。
         間を margin で空けると、貼り付いたときにそこだけ行が透ける */
      padding: 15px 15px 30px;
    }
    .search {
      width: auto;
      padding: 9px;
      font-size: 16px;
    }
    .actions {
      /* 広い画面と違い、Download OPML を左端に置く */
      flex-direction: row;
      margin-left: 0;
      margin-right: auto;
      /* ボタン同士の間も、この画面幅での余白（15px）に合わせる */
      gap: 15px;
    }
    & th,td {
      &:first-child {
        padding-left: 15px;
      }
    }
    /* 広い画面側の指定（tbody tr.child-row > td > .wrap）と同じ強さに
       しておく。弱いとメディアクエリの中でも上書きできない */
    & tbody tr {
      &.child-row {
        >td > .wrap {
          flex-direction: column;
          /* 子行の中身は、テーブルがどれだけ横に広がっていても画面の中に
             収める。横に送っても位置が変わらないので、開いた番組の説明や
             回の一覧を追いかけずに済む */
          position: sticky;
          left: 0;
          width: 100vw;
          min-width: 0;
          /* 縦に積むぶん高さは伸びるが、説明の長い番組だと一覧が
             大きく動いてしまう。上下それぞれ5話ぶんまでに収める */
          height: auto;
          >.column {
            width: auto;
            height: auto;
            &:last-child {
              border-left: 0;
              border-top: 1px solid #e3e3e3;
            }
            /* 説明は 5.5話ぶんまでで畳み、続きは Show more で広げる。
               height ではなく max-height にしてあるのは、短い説明の番組で
               余白だけが残らないようにするため。
               スクロールさせないのは、入れ子のスクロールがあると
               その上で指を動かしたときにページ全体が動かせなくなるから */
            >.info {
              height: auto;
              max-height: 242px;
              overflow: hidden;
              &.is-expanded {
                max-height: none;
              }
            }
            /* 回の一覧は数が多いので（1300話を超える番組がある）、
               広げるのではなくスクロールのままにする。
               3.5話ぶん。半端にして、まだ下に続くと見せる */
            >.episodes {
              height: 154px;
            }
            /* 説明の続きを出すボタン。
               畳んでいる間は説明の末尾に重ねる。下の文字がうっすら透けて
               ぼけることで、まだ続きがあると見て分かる */
            >.show-more {
              /* レイアウトのグローバルな button の指定を打ち消す */
              border: 0;
              border-radius: 0;
              min-width: 0;
              width: 100%;
              padding: 10px 0;
              color: #888;
              font-size: 12px;
              font-weight: bold;
              text-align: left;
              cursor: pointer;
              position: absolute;
              left: 0;
              right: 0;
              bottom: 0;
              /* 子行の背景と同じ色を薄く敷く */
              background-color: rgba(246, 246, 246, 0.72);
              -webkit-backdrop-filter: blur(3px);
              backdrop-filter: blur(3px);
              >span {
                display: block;
                text-align: center;
              }
            }
          }
        }
      }
    }
    .description {
      max-width: calc(100vw - 30px);
    }
  }
}

/* 触れたときの見た目は、ポインタのある環境だけにする。
   指で押すと離したあとも状態が残り、押しっぱなしのように見えるため
   （タップして子行を開いたあと、その行だけ色が付いたままになっていた）。
   幅ではなく入力の仕方で分ける。タッチできるノート PC もあるので */
@media (hover: hover) {
  /* 行に触れたときの色。ブランドの紫をごく薄く敷く */
  .root tbody tr.row:hover {
    background-color: #f8f5ff;
  }
  /* タイトルの後ろのアイコンに触れると、その右に名前を出す */
  .root tbody td.title .title-cell .clip>.value .links>.link:hover :deep(.label) {
    opacity: 1;
    transform: translate(0, -50%);
  }
}

</style>

<script>
import rss from '@/data/rss.json'
import build_info from '@/static/downloads/build_info.json'
import opml from '@/lib/opml'
import { RSS_DIR } from '@/scripts/constants'
import frequencyLabel from '@/lib/frequency-label'
import hostingLabel, { isHostingService } from '@/lib/hosting-label'
import { jst, jstDate } from '@/lib/jst'
import { compareBy, compareInterval } from '@/lib/compare'
import formatDate from '@/lib/format-date'
import linkify from '@/lib/linkify'
import { player, clearReveal } from '@/lib/player'

// 配信サービスでの絞り込み。1番組しか使っていないホストは自前配信とみなし、
// 選択肢が増えすぎないよう「その他」にまとめる（71ホスト中62が該当）
// 一度に描くエピソードの数。下まで見たらこの数ずつ足していく
const EPISODES_PER_CHUNK = 30

// 指の環境で、アイコンの名前を出しておく時間（ミリ秒）。
// 読んでから押し直すのに足りて、放っておけば戻る長さ
const LINK_LABEL_DURATION = 4000

// 辿り着いた回を光らせておく長さ（ミリ秒）
const REVEAL_HIGHLIGHT = 1800

// 子行を開け閉めするときの長さ
const CHILD_ROW_ANIM_MS = 220

// 狭い画面で隠している列を出したままにしているか（ブラウザごとに覚える）
const SHOW_ALL_COLUMNS_KEY = 'pf-show-all-columns'

// New! を付ける範囲（日）。しきい値と、アイコンに出す説明文の両方で使う
const NEW_WITHIN = {
  // 最新の回が出たばかりの番組
  lastEpisode: 3,
  // 始まったばかりの番組（1本目の回が新しい）
  firstEpisode: 30,
  // この一覧に載ったばかりの番組
  addedAt: 30
}

const HOSTING_MIN_COUNT = 2

const OTHER_HOSTING = '__other__'

export default {
  setup() {
    useHead({ title: 'Podcast Freaks - Japanese techie podcast archive' })
  },
  data: function() {
    return {
      rssDir: `@/${RSS_DIR}/`,

      // 行ごとに何度も作成しないように予め作る。
      // いまの時刻ではなくビルド時刻を基準にするのは、実行時のタイムゾーンで
      // 判定が変わると、UTC で事前レンダリングした結果と閲覧者のブラウザで
      // バッジの有無が食い違い、ハイドレーションが無駄にやり直されるため
      newThreshold1: jst(build_info.updated).subtract(NEW_WITHIN.lastEpisode, 'days').startOf('date'),
      newThreshold2: jst(build_info.updated).subtract(NEW_WITHIN.firstEpisode, 'days').startOf('date'),
      // サイトへの登録が新しいと見なす範囲
      addedThreshold: jst(build_info.updated).subtract(NEW_WITHIN.addedAt, 'days').startOf('date'),

      // New! が何を指しているのかは印を見ただけでは分からないので、
      // ホバーで条件を出す。日数はしきい値と同じ定数から作る
      newTitle1: `${NEW_WITHIN.lastEpisode}日以内に新しい回が公開された番組`,
      newTitle2: `${NEW_WITHIN.firstEpisode}日以内に1本目の回が公開された番組`,

      hostingFilter: '',
      // 表が枠に収まらず、横スクロールにしているか。
      // 収まっている間は overflow を持たせない（見出しが貼り付かなくなる）
      tableOverflows: false,
      // 見出しの行の写しに渡す寸法。表の側を測って入れる（syncHeadClone）
      cloneTableWidth: 0,
      cloneWidths: [],
      theadHeight: '0px',
      // 画面が狭いときに隠している列を、手動で出しているか。
      // 事前レンダリングした HTML と食い違わないよう、localStorage は
      // mounted で読む（data で読むとハイドレーションが壊れる）
      showAllColumns: false,
      // 隠れている列があるか。無いときは切り替えボタンを出さない
      hasHiddenColumns: false,
      // 列の定義。並び順は「番組 → どこで配信 → 最新回 → 初回 → 何話 →
      // 中身の傾向」。画面が狭いときは fileServer → firstEpisodeDate →
      // total の順に隠す（<style> の @media を参照）
      //
      // desc は「見出しを最初に押したときに降順から始める」列。
      // 日付や話数は、多い方・新しい方から見たいので降順から入る
      columns: [
        { key: 'title', label: 'Channel', class: 'title', sortable: true,
          tooltip: '行をクリックすると、番組の説明とエピソードが開きます' },
        // 配信サービスで絞り込めるよう、見出しをプルダウンにしている
        { key: 'fileServer', label: 'Hosting', class: 'file-server', filter: true,
          tooltip: '音声ファイルの配信元' },
        { key: 'lastEpisodeDate', label: 'Last episode', class: 'last', sortable: true, desc: true },
        { key: 'firstEpisodeDate', label: 'First episode', class: 'first', sortable: true },
        { key: 'total', label: 'Episodes', class: 'total', sortable: true, desc: true },
        // 取りうる値の一覧は About に1か所だけ置く。そこへの入口は
        // 各行のバッジ自体（components/duration.vue, frequency.vue）
        { key: 'updateInterval', label: 'Frequency', class: 'frequency', sortable: true,
          tooltip: '直近の更新間隔から求めたおおよその頻度' },
        { key: 'durationMedian', label: 'Duration', class: 'duration', sortable: true, desc: true,
          tooltip: '収録時間の中央値' },
      ],

      // 指の環境で、いま名前を出しているアイコン（`<番組のキー>:<種類>`）。
      // 1回目のタップで出し、2回目で開く
      revealedLink: '',

      // 検索欄の文字列
      query: '',
      // 並べ替えの状態。既定は最新回の新しい順
      sortKey: 'lastEpisodeDate',
      sortAscending: false,
      // 開いている子行の番組キー。一度に1つだけ開く
      openedKey: null,
      // 狭い画面のとき、番組の説明が収まりきらないか／広げているか。
      // 子行は一度に1つしか開かないので、開いている行のぶんだけ持てばよい
      infoOverflows: false,
      infoExpanded: false,
      channels: Object.values(build_info.channels),
      // 番組キー -> その番組の全エピソード。行を開いた時点で読み込む
      episodes: {},
      episodesFailed: {},
      // 番組キー -> いま描画している件数。1000話を超える番組があるため、
      // 開いた瞬間に全部は描かず、下まで見たら足していく
      episodesShown: {}
    }
  },
  computed: {
    // 検索と Hosting の絞り込みを両方かけた行
    filteredChannels: function() {
      const terms = String(this.query).toLowerCase().split(/\s+/).filter(t => t)
      const hosting = this.hostingFilter

      return this.channels.filter(row => {
        if(hosting) {
          const matched = hosting === OTHER_HOSTING
            ? this.minorHostings.includes(row.fileServer)
            : row.fileServer === hosting
          if(!matched) return false
        }
        // スペース区切りの語をすべて含む行だけを残す（AND 検索）。
        // 1つの文字列として部分一致させると、「anchor キマグレエフエム」の
        // ように配信元と番組名をまたいだ絞り込みができない
        return terms.every(term => this.searchableText(row).includes(term))
      })
    },

    // 右下のプレーヤーで番組名を押されたか
    revealRequest: function() {
      return player.reveal
    },

    // 並べ替えたあとの行。表に出すのはこれ
    sortedChannels: function() {
      const key = this.sortKey
      const ascending = this.sortAscending
      const rows = this.filteredChannels.slice()

      if(key === 'updateInterval') {
        rows.sort(compareInterval(ascending))
        return rows
      }

      rows.sort(compareBy(key, ascending))
      return rows
    },

    hostingCounts: function() {
      const counts = {}
      this.channels.forEach(c => {
        if(c.fileServer) counts[c.fileServer] = (counts[c.fileServer] || 0) + 1
      })
      return counts
    },
    // 1番組しか使っていないホスト（自前配信とみなすもの）
    minorHostings: function() {
      return Object.keys(this.hostingCounts).filter(h => this.hostingCounts[h] < HOSTING_MIN_COUNT)
    },
    // Hosting のプルダウンに出す選択肢。番組数の多い順に並べ、末尾に「その他」を置く
    hostingOptions: function() {
      const options = Object.keys(this.hostingCounts)
        .filter(h => this.hostingCounts[h] >= HOSTING_MIN_COUNT)
        .map(host => ({
          value: host,
          label: hostingLabel(host),
          count: this.hostingCounts[host],
          isService: isHostingService(host)
        }))
        // 名前の付いた配信サービスを上にまとめ、ただ置いてあるだけの
        // ホストはその下に置く。それぞれの中では番組数の多い順
        .sort((a, b) =>
          (b.isService - a.isService) || (b.count - a.count) || a.value.localeCompare(b.value))

      const otherCount = this.minorHostings.reduce((sum, h) => sum + this.hostingCounts[h], 0)
      if(otherCount) options.push({ value: OTHER_HOSTING, label: 'その他（自前配信など）', count: otherCount })

      return options
    }
  },
  watch: {
    // 右下のプレーヤーで番組名を押されたら、その回まで辿る。
    // 合図が来るたびに動かしたいので、値が変わったことが分かるよう
    // lib/player.js 側が毎回新しいオブジェクトを入れる
    revealRequest: function(reveal) {
      if(reveal) this.revealEpisode(reveal)
    },
    // 「All columns」で列が増えると、表が枠に収まらなくなることがある。
    // 描き直したあとに測り直す
    showAllColumns: function() {
      this.$nextTick(this.updateStickyMetrics)
    },
    // 絞り込みや並べ替えで中身が変わると、列の幅も変わる。
    // 表の幅は変わらないことがあるので ResizeObserver では拾えない
    sortedChannels: function() {
      this.$nextTick(this.syncHeadClone)
    },
    // 写しが出た直後は、まだ何も測っていない
    tableOverflows: function() {
      this.$nextTick(this.syncHeadClone)
    }
  },
  mounted: function(){
    // 別のページで鳴らし始めてからトップへ来たときのぶん。
    // watch は変化したときだけなので、最初の1回はここで拾う
    if(player.reveal) this.revealEpisode(player.reveal)

    // 隠している列があるかは CSS のメディアクエリと同じ境界で判定する。
    // 幅を測って動的に決めると、列を隠した分だけ Channel が広がって条件が
    // 外れ、また出てくる、という往復になるため、境界は固定にしている
    // 子行が縦に積まれる境界。説明を畳むかどうかの判定に使う
    // 重ねられる環境か。アイコンの名前は、重ねられるならホバーで出し、
    // そうでなければ1回目のタップで出す
    this.hoverMedia = window.matchMedia('(hover: hover)')

    this.narrowMedia = window.matchMedia('(max-width: 900px)')
    this.columnsMedia = window.matchMedia('(max-width: 1100px)')
    this.updateHasHiddenColumns()
    this.columnsMedia.addEventListener('change', this.updateHasHiddenColumns)

    // 上に貼り付いている検索の帯の、隠れている量（px）と、
    // 直前のスクロール位置。画面を描き直す必要が無いので data には置かない
    this.toolsHidden = 0
    this.lastScrollY = window.scrollY
    this.updateStickyMetrics()
    // 読み込み時点で下の方にいるなら（ブラウザが位置を戻した場合）、
    // 帯は隠れた状態から始める
    this.setToolsHidden(Infinity)
    window.addEventListener('scroll', this.onStickyScroll, { passive: true })
    // 写しを表の横スクロールに直結できるか（scroll-timeline）。
    // できるなら JS では追いかけない（遅れるうえ、指定が二重になる）
    this.panLinked = !!(window.CSS && CSS.supports('animation-timeline', 'scroll()'))
    if(!this.panLinked) this.$refs.tableScroll.addEventListener('scroll', this.onTableScroll, { passive: true })
    // 帯の高さ（狭い画面では上下に積まれる）と、表が枠に収まるかは
    // どちらも幅で変わる。読み終えてから測る
    if(window.ResizeObserver) {
      this.stickyObserver = new ResizeObserver(this.updateStickyMetrics)
      this.stickyObserver.observe(this.$refs.tools)
      this.stickyObserver.observe(this.$refs.tableScroll)
      const table = this.$refs.tableScroll.querySelector('table')
      if(table) this.stickyObserver.observe(table)
    }

    // 事前レンダリングした HTML と食い違わないよう、ここで読む
    try {
      this.showAllColumns = window.localStorage.getItem(SHOW_ALL_COLUMNS_KEY) === '1'
    } catch {
      // プライベートウィンドウなどで読めないことがある。既定のままでよい
    }
  },
  beforeUnmount: function(){
    clearTimeout(this.revealTimer)
    clearTimeout(this.linkRevealTimer)
    if(this.columnsMedia) this.columnsMedia.removeEventListener('change', this.updateHasHiddenColumns)
    window.removeEventListener('scroll', this.onStickyScroll)
    if(!this.panLinked && this.$refs.tableScroll) this.$refs.tableScroll.removeEventListener('scroll', this.onTableScroll)
    if(this.stickyObserver) this.stickyObserver.disconnect()
  },
  methods: {
    // テンプレートから呼ぶために methods に載せる。
    // どちらも this を見ない素の関数
    formatDate,
    hostingLabel,

    updateHasHiddenColumns: function(){
      this.hasHiddenColumns = this.columnsMedia.matches
    },
    // 検索の帯の高さと、表が枠に収まるかを測って CSS に渡す。
    // 幅が変わるたびに呼ばれる（ResizeObserver）
    updateStickyMetrics: function(){
      const tools = this.$refs.tools
      const wrap = this.$refs.tableScroll
      if(!tools || !wrap) return

      this.toolsHeight = tools.getBoundingClientRect().height
      this.$el.style.setProperty('--tools-height', `${this.toolsHeight}px`)
      // 高さが変わると、隠れていてよい量の上限も変わる
      this.setToolsHidden(this.toolsHidden)

      const table = wrap.querySelector('table')
      // 溢れているときは表の方が広いままなので、切り替えても行き来しない。
      // 端数で揺れないよう1px の余裕を見る
      if(table) this.tableOverflows = table.getBoundingClientRect().width > wrap.clientWidth + 1

      // すりガラス（検索の帯の1枚）を、見出しの行のぶんまで伸ばすための高さ。
      // 横に流しているときも、写しがそこに出るので同じだけ伸ばす
      const head = wrap.querySelector('thead')
      const headHeight = head ? head.getBoundingClientRect().height : 0
      this.theadHeight = `${headHeight}px`
      this.$el.style.setProperty('--thead-height', `${headHeight}px`)

      this.syncHeadClone()
    },
    // 見出しの行の写しを、表の側に合わせる。
    // 列の幅は表（本文も含めた中身）が決めているので、測って渡すしかない
    syncHeadClone: function(){
      if(!this.tableOverflows) return
      const wrap = this.$refs.tableScroll
      const table = wrap && wrap.querySelector('table')
      if(!table) return
      this.cloneTableWidth = table.getBoundingClientRect().width
      // 隠している列（display: none）は 0 で返る。写しの側も同じ指定で
      // 隠れるので、番号がずれることはない
      this.cloneWidths = [...wrap.querySelectorAll('thead th')].map(th => th.getBoundingClientRect().width)
      // 送れる最大量。写しはこの幅を端から端まで動く（<style> の @keyframes）
      this.$el.style.setProperty('--clone-pan', `${Math.max(0, this.cloneTableWidth - wrap.clientWidth)}px`)
      if(!this.panLinked) this.$nextTick(this.onTableScroll)
    },
    // スクロールに直結させられないブラウザのときだけ使う。
    // scroll イベントは送られたあとに届くので、見出しが1フレーム遅れる
    onTableScroll: function(){
      const wrap = this.$refs.tableScroll
      const clone = this.$refs.headClone
      const table = clone && clone.querySelector('table')
      if(wrap && table) table.style.transform = `translateX(${-wrap.scrollLeft}px)`
    },
    // 帯のうち上へ隠す量。0（全部見えている）から帯の高さ（全部隠れている）まで。
    // ページの頭の近くでは、スクロールした量より多く隠さない
    // （頭では普通に流れていくように見せるため）
    setToolsHidden: function(value){
      const max = Math.min(this.toolsHeight || 0, Math.max(0, window.scrollY))
      this.toolsHidden = Math.min(Math.max(value, 0), max)
      this.$el.style.setProperty('--tools-hidden', `${this.toolsHidden}px`)
    },
    // 動かした分だけ隠し、戻した分だけ出す（1:1）。
    // 「少し戻したのに何も出てこない」「勢いよく戻すと一気に出る」といった
    // ずれが起きないよう、速さや向きでの切り替えはしない
    onStickyScroll: function(){
      const y = Math.max(0, window.scrollY)
      const moved = y - this.lastScrollY
      this.lastScrollY = y
      this.setToolsHidden(this.toolsHidden + moved)
    },
    // 出した状態はブラウザごとに覚える。狭い画面で毎回押し直すのは煩わしい
    toggleAllColumns: function(){
      this.showAllColumns = !this.showAllColumns
      try {
        window.localStorage.setItem(SHOW_ALL_COLUMNS_KEY, this.showAllColumns ? '1' : '0')
      } catch {
        // 書けなくても、そのセッションでは効いているのでこのままでよい
      }
    },
    // 列見出しに「?」を添えて、About の凡例へ送る。
    // 見出しはセル全体が並べ替えのクリック領域なので、「?」を押したときは
    // そこで止める（リンク自身のハンドラは同じ要素にあるので働く）
    // エピソードは番組ごとのファイルに分けてある。
    //
    // 以前は build_info.json に全番組の直近5話を入れてページのバンドルに
    // 同梱していたが、全体3.07MBのうち2.73MB（9割）をこれが占めていた。
    // 全話を扱うようになったので、開いた番組のぶんだけ読みに行く
    loadEpisodes: function(key) {
      if(this.episodes[key]) return
      // 番組キーは後から生えるので、Vue 2 では値を差し込むだけでは
      // 画面が追従しない（$set が要る）。オブジェクトごと差し替えれば
      // その必要が無く、Vue 3 でもそのまま動く
      this.episodesFailed = { ...this.episodesFailed, [key]: false }
      // $fetch は Nuxt が持っている取得関数。JSON はそのまま返る
      $fetch(`/downloads/episodes/${encodeURIComponent(key)}.json`)
        .then(episodes => {
          this.episodes = { ...this.episodes, [key]: episodes }
          this.episodesShown = { ...this.episodesShown, [key]: EPISODES_PER_CHUNK }
        })
        .catch(() => { this.episodesFailed = { ...this.episodesFailed, [key]: true } })
    },
    visibleEpisodes: function(key) {
      const all = this.episodes[key] || []
      return all.slice(0, this.episodesShown[key] || EPISODES_PER_CHUNK)
    },
    // 下まで見たら続きを描く。1000話を超える番組があるため、
    // 開いた瞬間に全部描くと固まってしまう
    onEpisodesScroll: function(key, event) {
      const el = event.target
      if(el.scrollTop + el.clientHeight < el.scrollHeight - 200) return
      const all = this.episodes[key] || []
      const shown = this.episodesShown[key] || EPISODES_PER_CHUNK
      if(shown >= all.length) return
      this.episodesShown = { ...this.episodesShown, [key]: shown + EPISODES_PER_CHUNK }
    },

    // 子行の開け閉め。高さを 0 と実際の高さのあいだで動かす。
    //
    // 中身によって高さが変わる（狭い画面では番組情報の量で決まる）ため、
    // CSS だけでは書けない。開いたあとに測った高さへ動かし、
    // 終わったら指定を外して元の指定（auto や5話ぶん）へ戻す
    // 行のどこを押しても子行を開け閉めする。
    // ただし行の中のリンクや操作部品は、それぞれの働きを優先する
    // （Apple Podcasts / X / ハッシュタグ、エピソードへのリンク、
    //   Hosting の絞り込み、OPML のチェックボックス）
    // タイトルの後ろのアイコン（Apple・X・ハッシュタグ）を押したとき。
    //
    // 重ねられる環境ではホバーで名前が出るので、何もしない。指の環境では
    // アイコンだけを見て何のリンクか分からないので、1回目のタップで名前を
    // 出し、2回目で開く。しばらく置くと元に戻す
    onLinkTap: function(id, event){
      if(this.hoverMedia && this.hoverMedia.matches) return

      // まだ出ていなければ、どこを押しても名前を出すだけ。
      // ここで飛ぶと、何のリンクか分からないまま開くことになる
      if(this.revealedLink !== id) {
        event.preventDefault()
        this.revealedLink = id
        clearTimeout(this.linkRevealTimer)
        this.linkRevealTimer = setTimeout(this.hideLinkLabel, LINK_LABEL_DURATION)
        return
      }

      // 出ているときは、アイコンを押したら閉じる。
      // 文字（.label）の側を押したときだけ開く。判定はアイコン（svg）で
      // 見る。文字は行の中に流し込んだ素の span で、当たり判定が
      // 端末によって取りにくいため
      const target = event && event.target
      if(target && target.closest && target.closest('svg')) {
        event.preventDefault()
        this.hideLinkLabel()
        return
      }
      this.hideLinkLabel()
    },
    hideLinkLabel: function(){
      clearTimeout(this.linkRevealTimer)
      this.linkRevealTimer = null
      this.revealedLink = ''
    },
    onRowClick: function(row, event){
      const target = event && event.target
      if(!target || !target.closest) return
      // アイコンを押したぶんは、そのクリックがここまで上がってくる。
      // ここで消すと、出したばかりの名前がすぐ引っ込む
      if(target.closest('a, input, select, button, label')) return
      // 名前を出したまま別のところを押したら、戻しておく
      if(this.revealedLink) this.hideLinkLabel()
      this.toggleChildRow(row.key)
    },
    // 開いている子行の .wrap。ref は v-for の中なので配列で返る
    childWrap: function(key) {
      const found = this.$refs['wrap-' + key]
      return Array.isArray(found) ? found[0] : found
    },
    // 説明が決めた高さに収まるかを測る。収まらなければ Show more を出す。
    // 子行は開くたびに作り直されるので、開いたあとに測る
    measureInfo: function(key) {
      const wrap = this.childWrap(key)
      const info = wrap && wrap.querySelector('.info')
      // 高さを決めているのは狭い画面のときだけ。広い画面では出さない
      this.infoOverflows = !!info && this.narrowMedia?.matches && info.scrollHeight > info.clientHeight + 1
    },
    toggleChildRow: function(key){
      // 説明の畳み具合は行に持ち越さない。閉じれば元に戻り、開き直すと
      // また Show more から始まる。
      // ここで戻すのは、描き直しの前に畳んだ状態にしておくため。
      // measureInfo の中で戻すと、まだ広がったままの高さを測ってしまい、
      // 広げたまま閉じた行を開き直したときに Show more が出なくなる
      this.infoExpanded = false
      // 開いている場合は、畳んでから行を消す
      if(this.openedKey === key) {
        const wrap = this.childWrap(key)
        if(wrap) this.collapseChildRow(wrap, () => { this.openedKey = null })
        else this.openedKey = null
        return
      }

      this.loadEpisodes(key)
      this.openedKey = key
      this.$nextTick(() => {
        this.expandChildRow(this.childWrap(key))
        this.measureInfo(key)
      })
    },
    // 見出しを押したときの並べ替え。同じ列をもう一度押すと向きが変わる
    sortBy: function(col){
      if(!col.sortable) return
      if(this.sortKey === col.key) {
        this.sortAscending = !this.sortAscending
      }
      else {
        this.sortKey = col.key
        // 列によって、最初に見たい向きが違う。日付や話数は多い方・
        // 新しい方から入る
        this.sortAscending = !col.desc
      }
    },
    // 見出しに出す並べ替えの印。ソート中の列にだけ入る
    sortIcon: function(col){
      if(this.sortKey !== col.key) return ''
      return this.sortAscending ? '▲' : '▼'
    },
    expandChildRow: function(wrap) {
      if(!wrap) return
      const height = wrap.getBoundingClientRect().height
      wrap.style.overflow = 'hidden'
      wrap.style.height = '0px'
      // 0 を一度反映させてから動かす
      wrap.getBoundingClientRect()
      wrap.style.transition = `height ${CHILD_ROW_ANIM_MS}ms ease-out`
      wrap.style.height = `${height}px`
      this.afterHeightAnimation(wrap, () => {
        wrap.style.transition = ''
        wrap.style.height = ''
        wrap.style.overflow = ''
      })
    },
    collapseChildRow: function(wrap, done) {
      wrap.style.overflow = 'hidden'
      wrap.style.height = `${wrap.getBoundingClientRect().height}px`
      wrap.getBoundingClientRect()
      wrap.style.transition = `height ${CHILD_ROW_ANIM_MS}ms ease-in`
      wrap.style.height = '0px'
      this.afterHeightAnimation(wrap, done)
    },
    // transitionend は中の要素からも上がってくるので、高さの分だけ拾う。
    // 何かの拍子に来なかったときのために時間でも打ち切る
    afterHeightAnimation: function(wrap, done) {
      let finished = false
      const finish = () => {
        if(finished) return
        finished = true
        wrap.removeEventListener('transitionend', onEnd)
        done()
      }
      const onEnd = (e) => {
        if(e.target !== wrap || e.propertyName !== 'height') return
        finish()
      }
      wrap.addEventListener('transitionend', onEnd)
      setTimeout(finish, CHILD_ROW_ANIM_MS + 50)
    },
    filterByHosting: function(value) {
      this.hostingFilter = value
    },
    // 検索対象にする文字列。画面に出ている値で絞り込めるよう、
    // 日付は表示と同じ YYYY.MM.DD の形にしてから含める
    searchableText: function(row) {
      if(!this._searchableCache) this._searchableCache = {}
      if(this._searchableCache[row.key] == null) {
        this._searchableCache[row.key] = [
          row.key,
          row.title,
          row.hashtag,
          row.twitter,
          row.fileServer,
          hostingLabel(row.fileServer),
          row.durationMedian,
          frequencyLabel(row.updateInterval),
          row.total,
          formatDate(row.firstEpisodeDate),
          formatDate(row.lastEpisodeDate)
        ].filter(v => v != null && v !== '').join(' ').toLowerCase()
      }
      return this._searchableCache[row.key]
    },
    linkify,
    isIn: function(date, threshold){
      return jstDate(date, 'YYYY.MM.DD').isAfter(threshold)
    },
    // サイトへの登録が最近かどうか。added-at.json の日付は YYYY-MM-DD なので、
    // 表示用の YYYY.MM.DD を前提にした isIn とは分けている
    isRecentlyAdded: function(date){
      if(!date) return false
      return jstDate(date, 'YYYY-MM-DD').isAfter(this.addedThreshold)
    },
    addedTitle: function(date){
      return `${NEW_WITHIN.addedAt}日以内にこの一覧に加わった番組（${date} に登録）`
    },
    downloadOpml: function(){
      const header = {
        "title": "podcast-freaks channel list",
        "dateCreated": new Date(),
        "ownerName": "podcast-freaks"
      }
      // 表に出ている順そのまま。絞り込みと並べ替えの結果が、
      // そのまま書き出す中身になる
      const outlines = this.sortedChannels.map((row)=>{
        return {
          text: "txt",
          title: row.key,
          type: "rss",
          "xmlUrl": rss[row.key].feed
        }
      })
      // file-saver を使っていたが、CommonJS のまま配られていて事前レンダリング
      // （Node 側）で読めなかった。やっていることは数行なので自前で書く
      const blob = new Blob([opml(header, outlines)], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'podcast-freaks.opml'
      a.click()
      URL.revokeObjectURL(url)
    },
    loadRecentEpisodes: async function(rss) {
      const xml = await readFile(rss).catch(() => { return })
      if(!xml){
        error('readFile', dist_rss)
        return // catch内では、fetchFeedを抜けられないのでここでreturn
      }
      return xml
    },
    // 右下のプレーヤーで番組名を押されたとき、その回まで辿れるようにする。
    //
    // 絞り込みで行が消えていることがあるので先に外し、子行を開き、
    // その回が描かれるところまで件数を伸ばしてからスクロールする。
    // 目印（紫）は episode-item が player を見て自分で付ける
    revealEpisode: async function(reveal) {
      clearReveal()
      const key = reveal.key
      if(!this.channels.some(c => c.key === key)) return

      // 検索や Hosting の絞り込みで隠れていたら外す
      if(!this.sortedChannels.some(c => c.key === key)) {
        this.query = ''
        this.hostingFilter = ''
        await this.$nextTick()
      }

      if(this.openedKey !== key) {
        this.toggleChildRow(key)
        await this.$nextTick()
      }
      this.scrollToRow(key)

      // エピソードの読み込みを待つ。開いた直後は取得中のことがある
      const episodes = await this.waitForEpisodes(key)
      const index = episodes.findIndex(ep => ep.url === reveal.url)

      // 30話ずつしか描いていないので、そこまで伸ばす
      if(index >= 0 && (this.episodesShown[key] || EPISODES_PER_CHUNK) <= index) {
        this.episodesShown = { ...this.episodesShown, [key]: index + EPISODES_PER_CHUNK }
      }
      await this.$nextTick()

      // もう一度合わせる。/episodes など別のページから来たときは、
      // 上の scrollToRow のあとにルーターがページの先頭へ戻してしまい、
      // 番組が画面の外に残っていた（行は開いているのに表の先頭が見えている）。
      // ここまで来ればルーターの処理は終わっているので、こちらが最後に決める
      this.scrollToRow(key)
      if(index < 0) return
      this.scrollToEpisode(key, index)
    },
    // 読み込み中なら待つ。失敗したときや、待っている間に別の行が
    // 開かれたときは諦める
    waitForEpisodes: function(key) {
      return new Promise(resolve => {
        const check = () => {
          if(this.episodes[key]) return resolve(this.episodes[key])
          if(this.episodesFailed[key] || this.openedKey !== key) return resolve([])
          setTimeout(check, 100)
        }
        check()
      })
    },
    scrollToRow: function(key) {
      const wrap = this.childWrap(key)
      const row = wrap && wrap.closest('tr')
      const target = row && row.previousElementSibling
      if(!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    scrollToEpisode: function(key, index) {
      const wrap = this.childWrap(key)
      const list = wrap && wrap.querySelector('.episodes')
      const item = list && list.children[index]
      if(!item) return
      // ページごと動かすと行の位置まで変わってしまうので、
      // エピソードの列の中だけをスクロールする
      list.scrollTop = item.offsetTop - (list.clientHeight - item.offsetHeight) / 2

      // 辿り着いた回を少しのあいだ光らせる。鳴らしていない回には
      // 「いま鳴っている」の印が付かないので、これが無いとどれを
      // 指したのか分からない
      item.classList.add('is-revealed')
      clearTimeout(this.revealTimer)
      this.revealTimer = setTimeout(() => item.classList.remove('is-revealed'), REVEAL_HIGHLIGHT)
    }
  }
}
</script>
