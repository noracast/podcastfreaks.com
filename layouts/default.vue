<template>
  <!-- 狭い画面の切り替えは CSS のメディアクエリで行う。
       以前は Responsive コンポーネントで要素幅を測っていたが、幅が分かるまで
       中身を visibility: hidden で隠す作りのため、事前レンダリング済みの HTML が
       JS を読み終えるまで表示されず、最初の表示が白いままだった。
       対象はページ全幅の要素なので、要素幅で測る必要はない -->
  <div class="wrapper">
    <header>
      <div class="brand">
        <!-- タイトルとリード文をまとめて1つのリンクにする。
             どちらもトップへ戻る同じリンクなので、範囲を分けると紛らわしい -->
        <nuxt-link to="/">
          <h1>Podcast Freaks</h1>
          <p class="lead">テック系ポッドキャストまとめ</p>
        </nuxt-link>
      </div>
      <!-- リンクの間に改行を入れると、出力に半角空白が入って間隔が変わる -->
      <nav>
        <nuxt-link to="/about/">About</nuxt-link><nuxt-link to="/episodes/">Episodes</nuxt-link><nuxt-link to="/request/">Request</nuxt-link>
      </nav>
      <div class="stats channels">
        <span>{{ channelCount }}</span>
        <span>channels</span>
      </div>
      <div class="stats episodes">
        <span>{{ episodeCount }}</span>
        <span>episodes</span>
      </div>
      <div class="stats update">
        <span>{{ updatedDate }}</span>
        <span>{{ updatedTime }} updated</span>
      </div>
      <!-- アクセス解析から外れているときだけ出る印。
           除外は localStorage に持つのでブラウザごと。他の人には出ない -->
      <div class="ga-optout" title="このブラウザはアクセス解析の対象外です。戻すには ?ga-optout=0 を付けて開いてください">計測オフ</div>
    </header>
    <!-- プレーヤーが出ている間は、その高さぶん下に余白を作る。
         無いと一覧の最後の行や子行の下端がプレーヤーに隠れる -->
    <div class="main" :class="{ 'has-player': hasPlayer, 'player-minimized': playerMinimized }">
      <div class="sp_stats">
        <div class="channels">
          <span>{{ channelCount }}</span>
          <span>channels</span>
        </div>
        <div class="episodes">
          <span>{{ episodeCount }}</span>
          <span>episodes</span>
        </div>
        <div class="update">
          <span>{{ updatedDate }} {{ updatedTime }}</span>
          <span>updated</span>
        </div>
      </div>
      <slot />
    </div>
    <!-- 再生中のものを出し続ける。ページを移っても消えないよう、
         ページの中ではなくレイアウトに置く（issue #235） -->
    <global-player />
  </div>
</template>

<style>

/* iOS はダブルタップで拡大する。一覧の行やエピソードを続けて押したときに
   意図せず拡大してしまうので、そのジェスチャだけ外す。
   manipulation は「指でなぞる」「つまんで広げる」は残すので、
   スクロールもピンチでの拡大もそのまま使える */
html, body {
  touch-action: manipulation;
}

/* 右下のプレーヤーに隠れないよう、出ている間だけ下を空ける。
   常に空けておくと、鳴らしていないときに余白が浮く */
.main.has-player {
  padding-bottom: 156px;
}
/* 下に隠しているあいだは、つまみのぶんだけでよい */
.main.has-player.player-minimized {
  padding-bottom: 52px;
}
@media (max-width: 900px) {
  /* 狭い画面では左右いっぱいに敷くぶん、少し高くなる */
  .main.has-player {
    padding-bottom: 180px;
  }
}

header {
  height: 80px;
  /* スクロールしてくる一覧が透けてぼける。上を通るジャケットの色を拾う */
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
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  & a {
    color: #fff;
    &:hover {
      color: #fff;
      opacity: 0.5;
    }
  }
}
/* タイトルとリード文を縦に並べ、2つまとめてヘッダーの中央に置く。
   全体が1つのリンクなので、縦に並べる指定はリンク側に持たせる */
.brand {
  float: left;
  height: 100%;
  /* nav と同じく、縮めるとタイトルが2行になって高さが崩れる */
  flex-shrink: 0;
  >a {
    display: -webkit-flex;
    -webkit-flex-direction: column;
    -webkit-justify-content: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    height: 100%;
  }
}
h1 {
  margin: 0;
  line-height: 1.2;
  /* 文字を直接持つようになったので、h1 の既定（2em）ではなくここで指定する */
  font-size: 22px;
}
.lead {
  margin: 3px 0 0;
  color: #fff;
  font-size: 11px;
  line-height: 1.2;
  /* 小さい文字なので少し字間を空けて読みやすくする */
  letter-spacing: 0.05em;
  /* タイトルより一段引いた見え方にする */
  opacity: 0.8;
}
h2:first-child {
  margin-top: 0;
}
nav {
  float: left;
  display: flex;
  align-items: center;
  font-size: 13px;
  margin-left: 60px;
  height: 100%;
  /* 幅が足りないときに縮められると、リンクが折り返して統計に重なる。
     ここは縮めない。足りない幅は境界を下回った時点で SP 表示が引き取る */
  flex-shrink: 0;
  white-space: nowrap;
  & a {
    display: inline-block;
    color: #fff;
  }
  & a:not(:first-child) {
    margin-left: 2em;
  }
}
/* アクセス解析の除外中だけ出す。既定では隠しておき、
   プラグインが html に付ける data-ga-optout で表示を切り替える */
.ga-optout {
  display: none;
  margin-left: 15px;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 10px;
  color: rgba(255,255,255,0.9);
  border: 1px solid rgba(255,255,255,0.5);
  white-space: nowrap;
  cursor: help;
}
html[data-ga-optout] .ga-optout {
  display: block;
}
.sp_stats {
  display: none;
}
button {
  display: block;
  border-radius: 3px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 10px 20px;
  min-width: 100px;
  outline: none;
  border: 0;
  cursor: pointer;
  background-color: #7f00ff;
  &[disabled] {
    color: rgba(255,255,255,0.4);
    cursor: not-allowed;
  }
  &:not([disabled]) {
    &:hover {
      background-color: #9933ff;
    }
    &:active {
      background-color: #b266ff;
    }
  }
}
.stats {
  margin-right: 0;
  border-left: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.7);
  padding-left: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition-duration: 0.2s;
  flex-shrink: 1;
  /* 3つの stats をまとめて右端へ寄せる。
     以前は :nth-of-type(1) で先頭を指していたが、これは同じ要素名の中での
     順番を見るため、ヘッダーに div を1つ足しただけで外れてしまう。
     クラスで指定して DOM の変更に左右されないようにする */
  &.channels {
    margin-left: auto;
  }
  &:not(:last-child) {
    margin-right: 20px;
  }
  >span:first-child {
    font-size: 16px;
  }
  >span:nth-child(2) {
    font-size: 10px;
  }
}
/* ここから下はヘッダーを詰めて、統計を2段目（.sp_stats）へ移す。

   もとは 810px だった（Responsive で幅を測っていたときの境界の引き継ぎ）が、
   iPad を縦にした幅（834px）で横並びのままになり、ナビゲーションが
   統計に重なって Request が読めなくなっていた。macOS の Chrome で測ると
   横並びに要るのは 765px で 834px に収まるものの、iOS は同じ指定でも
   文字をひとまわり大きく出すため、実際には収まらない。
   iPad の縦を確実に含む幅にしてある */
@media (max-width: 900px) {
  .wrapper {
    & header {
      padding-left: 15px;
      padding-right: 0;
      height: 70px;
      & h1 {
        font-size: 13px;
      }
      & nav {
        float: right;
        margin-left: 15px;
        font-size: 10px;
        & a {
          font-size: 10px;
        }
        & a:not(:first-child) {
          margin-left: 10px;
        }
      }
      .lead {
        display: none;
      }
      .stats {
        display: none;
      }
    }
    .sp_stats {
      /* ヘッダーと地続きに見せる。ここは一緒にスクロールしていくので、
         透かす意味がない。同じ見え方になる色を置く */
      background-color: var(--brand-solid);
      background-image: var(--brand-texture);
      font-size: 10px;
      color: white;
      display: flex;
      align-items: center;
      height: 30px;
      padding-top: 10px;
      padding-bottom: 10px;
      border-top: 1px solid rgba(255,255,255,0.4);
      >div {
        display: flex;
        flex-direction: column;
        padding-left: 15px;
        margin-right: 15px;
        &:not(:first-child) {
          border-left: 1px solid rgba(255,255,255,0.4);
        }
      }
    }
  }
}
</style>

<script>
import build_info from '@/static/downloads/build_info.json'
import { jst } from '@/lib/jst'
import { player } from '@/lib/player'

export default {
  data: function() {
    // ここだけ lib/jst.js を通っておらず、moment() が実行時のタイムゾーンで
    // 解釈していた。Netlify のビルドは UTC なので、本番のヘッダーには
    // UTC の時刻が出ていた
    const updated = jst(build_info.updated)
    return {
      updatedDate: updated.format('YYYY.MM.DD'),
      // AM / PM は英語で出す。書式の A は既定のロケール（ja）だと
      // 「午前」「午後」になり、隣の updated や channels / episodes と
      // 揃わない。locale('en') を挟むと他の日本語表記まで英語になるので、
      // ここだけ自分で付ける
      updatedTime: `${updated.format('h:mm:ss')} ${updated.hour() < 12 ? 'AM' : 'PM'}`,
      channelCount: Object.keys(build_info.channels).length,
      episodeCount: build_info.episodeCount
    }
  },
  computed: {
    hasPlayer: function() {
      return !!player.episode
    },
    playerMinimized: function() {
      return player.minimized
    }
  }
}
</script>
