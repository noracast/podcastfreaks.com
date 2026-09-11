<template>
  <div class="root" :class="{ 'show-all-columns': showAllColumns }">
    <!-- 検索と操作ボタン。狭い画面では上下に分かれる（<style> の @media） -->
    <div class="tools">
      <input v-model="query" class="search" type="search" placeholder="Search">
      <div class="actions">
        <button ref="downloadBtn" class="download" :disabled="markedRows.length == 0" @click="downloadOpml">Download OPML</button>
        <!-- 画面が狭くて列を隠しているときだけ出す。出すと表は横スクロールになる。
             文言は「押したらどうなるか」。状態ではないので aria-pressed は付けない -->
        <button v-if="hasHiddenColumns" class="toggle-columns" @click="toggleAllColumns">{{ showAllColumns ? 'Compact' : 'All columns' }}</button>
      </div>
    </div>

    <!-- 列を全部出すと画面に収まらないので、表ごと横スクロールさせる -->
    <div class="table-scroll">
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
              <!-- 全選択。押すたびに全部入る／全部外れる -->
              <input v-if="col.key === 'download'" type="checkbox" checked class="check-all" @change="toggleAllCheckbox">
              <!-- ラベルは "Hosting" のまま固定し、透明な select を重ねる。
                   select 自体に文字を出すと、絞り込み中に見出しの文言が変わってしまう -->
              <span v-else-if="col.filter" class="hosting-filter" :class="{ 'is-active': !!hostingFilter }">{{ col.label }}<select :value="hostingFilter" @change="filterByHosting($event.target.value)" @click.stop>
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
              <td class="title">
                <div class="title-cell">
                  <!-- カバー画像はもともと別の列だったが、見出しが2つに割れて
                       片方が空欄になり収まりが悪かったので、この列に入れた -->
                  <cover class="cover" :channel="row.key" />
                  <div class="clip">
                    <!-- .value をタイトルの文字幅に沿わせ、その右上にバッジを置く。
                         省略は内側の .text が受け持つので、バッジは省略に巻き込まれない -->
                    <span class="value">
                      <!-- 省略された場合に全体を確認できるよう title 属性を付ける -->
                      <span v-if="isRecentlyAdded(row.addedAt)" class="new" :title="`${row.addedAt} に登録`">New!</span>
                      <span class="text" :title="row.title">{{ row.title }}</span>
                      <!-- タイトルの後ろに並べる外部リンク。
                           Apple 側と登録フィードURLが違う番組は自動で特定できないため、
                           Apple Podcasts のリンクを持たない番組がある
                           （data/apple-podcasts.json に手で足せる） -->
                      <span class="links">
                        <apple-podcasts-link v-if="row.applePodcasts" :url="row.applePodcasts" />
                        <x-link v-if="row.twitter" :account="row.twitter" />
                        <hashtag-link v-if="row.hashtag" :hashtag="row.hashtag" />
                      </span>
                    </span>
                  </div>
                </div>
              </td>
              <td class="file-server">
                <div class="clip">
                  <!-- 配信サービスは名前で、ただ置いてあるだけのホストはホスト名で出す。
                       実際のホスト名はツールチップで確認できる -->
                  <small :title="row.fileServer">{{ hostingLabel(row.fileServer) }}</small>
                </div>
              </td>
              <td class="last">
                <a-blank v-if="row.lastEpisodeLink" :href="row.lastEpisodeLink">
                  <!-- .value を基準にして、バッジを日付の右上に置く -->
                  <span class="value"><span v-if="isIn(row.lastEpisodeDate, newThreshold1)" class="new">New!</span>{{ formatDate(row.lastEpisodeDate) }}</span>
                </a-blank>
                <span v-else class="date">
                  <span class="value"><span v-if="isIn(row.lastEpisodeDate, newThreshold1)" class="new">New!</span>{{ formatDate(row.lastEpisodeDate) }}</span>
                </span>
              </td>
              <td class="first">
                <a-blank v-if="row.firstEpisodeLink" :href="row.firstEpisodeLink">
                  <span class="value"><span v-if="isIn(row.firstEpisodeDate, newThreshold2)" class="new">New!</span>{{ formatDate(row.firstEpisodeDate) }}</span>
                </a-blank>
                <span v-else class="date">
                  <span class="value"><span v-if="isIn(row.firstEpisodeDate, newThreshold2)" class="new">New!</span>{{ formatDate(row.firstEpisodeDate) }}</span>
                </span>
              </td>
              <td class="total">{{ row.total }}</td>
              <td class="frequency"><frequency :interval="row.updateInterval" /></td>
              <td class="duration"><duration :duration="row.durationMedian" /></td>
              <td class="check"><input v-model="markedRows" type="checkbox" :value="row.key"></td>
            </tr>
            <tr v-if="openedKey === row.key" class="child-row">
              <td :colspan="columns.length">
                <div :ref="`wrap-${row.key}`" class="wrap">
                  <!-- 影はスクロールしない枠に重ねる。スクロールする側に置くと、
                       端に着いたときに位置が食い違う -->
                  <div class="column">
                    <div class="info" @scroll="onColumnScroll">
                      <!-- 番組の説明はフィードに書かれた HTML。体裁を保つために
                           v-html で出すが、中身は fetch-feeds.js の sanitizeDescription で
                           許可したタグと属性だけに濾してある -->
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <p v-if="row.desciprtion" class="description" v-html="row.desciprtion" />
                      <p v-else class="description">No description</p>
                      <button-text v-if="row.link" :text="row.link" :button-text="'Open Web'" button-action="'open'" />
                      <button-text :text="row.feed" :button-text="'Copy RSS'" />
                    </div>
                    <!-- 上下にまだ続きがあることを示す影 -->
                    <div class="scroll-fade top" />
                    <div class="scroll-fade bottom" />
                  </div>
                  <!-- エピソードは番組ごとの別ファイルにあり、行を開いた時点で読み込む -->
                  <div class="column">
                    <div class="episodes" @scroll="onEpisodesScroll(row.key, $event)">
                      <template v-if="episodes[row.key]">
                        <episode-player
                          v-for="(ep, i) in visibleEpisodes(row.key)"
                          :key="i"
                          :episode="ep"
                          @play="playEpisode"
                        />
                      </template>
                      <p v-else-if="episodesFailed[row.key]" class="episodes-status">エピソードを読み込めませんでした</p>
                      <p v-else class="episodes-status">Loading…</p>
                    </div>
                    <div class="scroll-fade top" />
                    <div class="scroll-fade bottom" />
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
  width: 150px;
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
  padding-top: 20px;
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
  /* チェックボックスは中身が小さいので、内容の幅に張り付かせる。
     width: 1% は「できるだけ狭く」の意味になり、中身より狭くはならない */
  & th.check, td.check {
    width: 1%;
    white-space: nowrap;
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
  & thead {
    color: #ccc;
    font-size: 12px;
    & th {
      font-weight: normal;
    }
  }
  & tbody {
    /* 行のどこを押しても子行が開くので、行全体を押せるものとして見せる。
       子行（.child-row）は別の tr なので、ここには当たらない */
    & tr.row {
      cursor: pointer;
      transition: background-color 0.15s;
      &:hover {
        /* 行に触れたときの色。ブランドの紫をごく薄く敷く */
        background-color: #f8f5ff;
      }
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
         省略は内側の .text が受け持ち、.value は overflow を切らないので
         上にはみ出すバッジが欠けない */
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
            .text {
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            /* タイトルの後ろに並べる外部リンク。
               幅が足りないときに縮むのはタイトル側だけなので、ここは固定 */
            .links {
              flex: none;
              display: flex;
              align-items: center;
              margin-left: 16px;
              /* アイコンの間隔。>*:not(:first-child) と書くと、Vue 3 の
                 scoped 変換が属性セレクタを別の位置に差し込んでしまう */
              gap: 6px;
              >* {
                position: relative;
              }
              /* ホバーしたアイコンの右横に、その名前を出す。
                 
                 アイコンだけでは何のリンクか分からず、リンク先を開くまで
                 確かめられなかった。行の高さと列の幅を変えたくないので、
                 絶対配置にして並びの計算から外す。
                 隣のアイコンに重なるため、行と同じ色の背景を敷いて隠す */
              :deep(.label) {
                position: absolute;
                left: 100%;
                top: 50%;
                margin-left: 4px;
                padding-right: 4px;
                /* 隣のアイコンを隠すための下敷き。ラベルが出るのは
                   そのアイコンに触れている間＝行に触れている間なので、
                   白ではなく行のホバー色に合わせる */
                background-color: #f8f5ff;
                color: #888;
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
                 ホバー中のものを前に出して、ラベルの背景で隠せるようにする */
              >*:hover {
                z-index: 1;
                :deep(.label) {
                  opacity: 1;
                  transform: translate(0, -50%);
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
         外側だけに指定すると「…」が出ずに切り落とされてしまう */
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
    & td.total {
      font-size: 18px;
    }
    & td.last, td.first {
      >a, >.date {
        /* /new ページの非スコープなスタイルに .date { position: absolute } があり、
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
        background-color: #222;
        background-size: auto 21px;
        color: white !important;
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
            /* 中身の量で高さが変わると、開くたびに一覧が大きく動く。
               エピソード5話ぶんに固定し、はみ出す分は各列でスクロールさせる */
            /* 子行の高さ。エピソード5話ぶん（1話60px＋区切り線1px） */
            height: 305px;
            >.column {
              position: relative;
              width: 50%;
              height: 100%;
              /* 中身の最小幅を外へ出さない */
              min-width: 0;
              /* エピソードが少ない番組でも左右の区切りが分かるようにする */
              &:last-child {
                border-left: 1px solid #333;
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
                /* 読み込みが済むまでの控えめな案内。すぐ入れ替わるので目立たせない */
                .episodes-status {
                  padding: 20px;
                  color: #999;
                  font-size: 12px;
                }
              }
              /* まだ続きがある側の端をうっすら暗くして、スクロールできることを示す。
                 中身の上に重ねる（背景に敷くと再生ボタンの色に隠れてしまう） */
              >.scroll-fade {
                position: absolute;
                left: 0;
                right: 0;
                height: 28px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
                &.top {
                  top: 0;
                  background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0));
                }
                &.bottom {
                  bottom: 0;
                  background: linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.55));
                }
              }
              >.can-scroll-up ~ .scroll-fade.top, >.can-scroll-down ~ .scroll-fade.bottom {
                opacity: 1;
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
    & button {
      font-size: 10px;
      padding: 5px 10px;
      min-width: initial;
    }
  }
  /* 検索欄とボタンを1本の帯に並べる。ボタンは右端に寄せる */
  .tools {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    margin-bottom: 20px;
  }
  .search {
    padding: 8px;
    outline: none;
    font-size: 13px;
    border: 1px solid #ddd;
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
  /* 列を全部出すと画面に収まらないので、表ごと横に流す */
  .table-scroll {
    overflow: auto;
    width: 100%;
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
    padding-top: 15px;
    padding-bottom: 15px;
    & table {
      margin-top: 15px;
    }
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
    & button {
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
    /* 横に並べる幅が無いので、ボタンを上、検索を下に積む */
    .tools {
      flex-direction: column-reverse;
      align-items: stretch;
      gap: 15px;
      padding: 0 15px;
      margin-bottom: 15px;
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
          /* 縦に積むぶん高さは伸びるが、説明の長い番組だと一覧が
             大きく動いてしまう。上下それぞれ5話ぶんまでに収める */
          height: auto;
          >.column {
            width: auto;
            height: auto;
            /* 縦に積むと上下の関係で続きがあることは分かるので、影は出さない */
            >.scroll-fade {
              display: none;
            }
            &:last-child {
              border-left: 0;
              border-top: 1px solid #333;
            }
            /* 番組情報はそのまま伸ばす。狭い画面で入れ子のスクロールが
               増えると、ページ全体のスクロールと取り合いになって扱いづらい */
            >.info {
              height: auto;
              max-height: none;
              overflow-y: visible;
            }
            >.episodes {
              height: 305px;
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
</style>

<script>
import rss from '@/data/rss.json'
import build_info from '@/static/downloads/build_info.json'
import opml from 'opml-generator'
import { RSS_DIR } from '@/scripts/constants'
import frequencyLabel from '@/lib/frequency-label'
import hostingLabel, { isHostingService } from '@/lib/hosting-label'
import { jst, jstDate } from '@/lib/jst'
import { compareBy, compareInterval } from '@/lib/compare'
import formatDate from '@/lib/format-date'

// 配信サービスでの絞り込み。1番組しか使っていないホストは自前配信とみなし、
// 選択肢が増えすぎないよう「その他」にまとめる（71ホスト中62が該当）
// 一度に描くエピソードの数。下まで見たらこの数ずつ足していく
const EPISODES_PER_CHUNK = 30

// 子行を開け閉めするときの長さ
const CHILD_ROW_ANIM_MS = 220

// 狭い画面で隠している列を出したままにしているか（ブラウザごとに覚える）
const SHOW_ALL_COLUMNS_KEY = 'pf-show-all-columns'

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
      // moment() ではなくビルド時刻を基準にするのは、実行時のタイムゾーンで
      // 判定が変わると、UTC で事前レンダリングした結果と閲覧者のブラウザで
      // バッジの有無が食い違い、ハイドレーションが無駄にやり直されるため
      newThreshold1: jst(build_info.updated).subtract(3, 'days').startOf('date'),
      newThreshold2: jst(build_info.updated).subtract(30, 'days').startOf('date'),
      // サイトへの登録が新しいと見なす範囲
      addedThreshold: jst(build_info.updated).subtract(30, 'days').startOf('date'),

      allMarked: false,
      hostingFilter: '',
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
        // 幅を止めるために名前を付ける。OPML のボタン（button.download）と
        // 紛れないよう、別の名前にしている
        { key: 'download', label: '', class: 'check',
          tooltip: 'ダウンロードするためにチェックしてください' }
      ],
      markedRows: [],

      // 検索欄の文字列
      query: '',
      // 並べ替えの状態。既定は最新回の新しい順
      sortKey: 'lastEpisodeDate',
      sortAscending: false,
      // 開いている子行の番組キー。一度に1つだけ開く
      openedKey: null,
      currentPlayer: null,
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
  mounted: function(){
    this.toggleAllCheckbox()
    window.addEventListener('resize', this.refreshScrollFades)

    // 隠している列があるかは CSS のメディアクエリと同じ境界で判定する。
    // 幅を測って動的に決めると、列を隠した分だけ Channel が広がって条件が
    // 外れ、また出てくる、という往復になるため、境界は固定にしている
    this.columnsMedia = window.matchMedia('(max-width: 1100px)')
    this.updateHasHiddenColumns()
    this.columnsMedia.addEventListener('change', this.updateHasHiddenColumns)

    // 事前レンダリングした HTML と食い違わないよう、ここで読む
    try {
      this.showAllColumns = window.localStorage.getItem(SHOW_ALL_COLUMNS_KEY) === '1'
    } catch {
      // プライベートウィンドウなどで読めないことがある。既定のままでよい
    }
  },
  beforeUnmount: function(){
    window.removeEventListener('resize', this.refreshScrollFades)
    if(this.columnsMedia) this.columnsMedia.removeEventListener('change', this.updateHasHiddenColumns)
  },
  methods: {
    // テンプレートから呼ぶために methods に載せる。
    // どちらも this を見ない素の関数
    formatDate,
    hostingLabel,

    updateHasHiddenColumns: function(){
      this.hasHiddenColumns = this.columnsMedia.matches
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
          this.$nextTick(this.refreshScrollFades)
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
      this.onColumnScroll(event)
      const el = event.target
      if(el.scrollTop + el.clientHeight < el.scrollHeight - 200) return
      const all = this.episodes[key] || []
      const shown = this.episodesShown[key] || EPISODES_PER_CHUNK
      if(shown >= all.length) return
      this.episodesShown = { ...this.episodesShown, [key]: shown + EPISODES_PER_CHUNK }
      this.$nextTick(this.refreshScrollFades)
    },

    // まだ下に続きがある列にだけ影を出す。
    // 子行は開くたびに作り直されるので、Vue の状態には持たずクラスで付ける
    onColumnScroll: function(event) {
      this.markScrollFade(event.target)
    },
    markScrollFade: function(el) {
      el.classList.toggle('can-scroll-up', el.scrollTop > 1)
      el.classList.toggle('can-scroll-down', el.scrollTop + el.clientHeight < el.scrollHeight - 1)
    },
    refreshScrollFades: function() {
      document.querySelectorAll('.child-row .info, .child-row .episodes')
        .forEach(this.markScrollFade)
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
    onRowClick: function(row, event){
      const target = event && event.target
      if(!target || !target.closest) return
      if(target.closest('a, input, select, button, label')) return
      this.toggleChildRow(row.key)
    },
    // 開いている子行の .wrap。ref は v-for の中なので配列で返る
    childWrap: function(key) {
      const found = this.$refs['wrap-' + key]
      return Array.isArray(found) ? found[0] : found
    },
    toggleChildRow: function(key){
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
        this.refreshScrollFades()
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
    toggleAllCheckbox: function() {
      this.markedRows = this.allMarked ? [] : Object.keys(rss)
      this.allMarked = !this.allMarked
    },
    isIn: function(date, threshold){
      return jstDate(date, 'YYYY.MM.DD').isAfter(threshold)
    },
    // サイトへの登録が最近かどうか。added-at.json の日付は YYYY-MM-DD なので、
    // 表示用の YYYY.MM.DD を前提にした isIn とは分けている
    isRecentlyAdded: function(date){
      if(!date) return false
      return jstDate(date, 'YYYY-MM-DD').isAfter(this.addedThreshold)
    },
    downloadOpml: function(){
      const header = {
        "title": "podcast-freaks channel list",
        "dateCreated": new Date(),
        "ownerName": "podcast-freaks"
      }
      const outlines = this.markedRows.map((channelName)=>{
        const channel = rss[channelName]
        return {
          text: "txt",
          title: channelName,
          type: "rss",
          "xmlUrl": channel.feed
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
    playEpisode: function(player) {
      // 一時停止から再開したときは自分自身が渡ってくる。
      // そこで止めてしまうと、押した直後に停止してしまう
      if(this.currentPlayer && this.currentPlayer !== player) {
        this.currentPlayer.stop()
      }
      this.currentPlayer = player
    }
  }
}
</script>
