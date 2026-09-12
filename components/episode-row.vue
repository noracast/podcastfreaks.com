<template>
  <!-- /episodes に並ぶ1話。トップの子行（components/episode-item.vue）と同じく、
       押すと右下のプレーヤーで鳴る。違うのは、番組をまたぐ一覧なので
       ジャケットと番組名を添えるところ。
       番組名だけは行き先が違う（一覧でその番組を開く）ので、別のボタンにする。
       そのため行そのものは button ではなく div にしてある -->
  <div
    class="row episode-line"
    :class="{ 'is-current': current, 'is-playing': current && playing, 'is-disabled': !playable }"
  >
    <button
      class="main"
      :title="playable ? `${episode.title} を再生` : `${episode.title}（音声が取得できていません）`"
      :disabled="!playable"
      @click="onPlay"
    >
      <cover class="cover" :channel="episode.key" :size="30" />
      <!-- 触れている間と、鳴らしている回にだけ出す。出ていないときは幅を
           持たないので、題名が右へずれて隙間が開くように見える -->
      <span class="play">
        <play-icon :playing="current && playing" />
      </span>
      <span class="text">{{ episode.title }}</span>
    </button>
    <!-- 番組名は控えめに。ジャケットで分かることが多いが、知らない番組の
         ときはここで名前が読める。押すと一覧でその番組を開く -->
    <button class="channel" :title="`${episode.channel_title} を一覧で開く`" @click="onOpenChannel">{{ episode.channel_title }}</button>
    <span class="time">{{ formattedDuration }}</span>
  </div>
</template>

<style scoped>
/* 骨格と、題名・長さ・印の見た目は assets/episode-line.css（.episode-line）。
   ここに書くのは、/episodes の行にしかないものだけ */
.row {
  padding: 0 20px 0 0;
  gap: 12px;

  /* 中の2つのボタンから、レイアウトのグローバルな button の指定
     （角丸・余白・最小幅・中央寄せ）を外す */
  .main, .channel {
    border: 0;
    border-radius: 0;
    min-width: 0;
    padding: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    /* 触れたときの紫も外す。指で押した端末では :hover が離したあとも
       残るため、これが無いと押した行が紫のまま居座る。
       行そのものの色（下の @media (hover: hover)）はポインタのある
       環境でだけ出す */
    &:hover {
      background-color: transparent;
    }
  }
  /* 題名までがひとつのボタン。行の空いているところを押しても鳴るよう、
     残りの幅はここが持つ */
  .main {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    &:disabled {
      cursor: default;
    }
  }
  .cover {
    flex: none;
    /* 日付の見出しと縦に揃える */
    margin-left: 120px;
  }
  .play {
    width: 0;
    /* 閉じている間は、前後に付く gap のぶんを打ち消しておく */
    margin-left: -12px;
    overflow: hidden;
    opacity: 0;
    transition: width 0.18s, margin-left 0.18s, opacity 0.18s;
  }
  /* 鳴らしている回は触れていなくても出す。キーボードで辿ったときも同じ */
  &.is-current .play,
  .main:focus-visible .play {
    width: 22px;
    margin-left: 0;
    opacity: 1;
  }
  .channel {
    flex: none;
    max-width: 30%;
    color: #999;
    font-size: 11px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: color 0.2s;
  }
  .time {
    padding-left: 12px;
  }
}

/* 触れたときの見た目は、ポインタのある環境だけにする。
   指で押すと離したあとも状態が残り、押しっぱなしのように見えるため。
   幅ではなく入力の仕方で分ける（タッチできるノート PC もある） */
@media (hover: hover) {
  .row:not(.is-disabled):hover {
    background-color: #f2f2f2;
  }
  /* 行のどこに触れても印を出す。行ごと押せば鳴ると分かるように */
  .row:not(.is-disabled):hover .play {
    width: 22px;
    margin-left: 0;
    opacity: 1;
  }
  .row .channel:hover {
    color: #555;
  }
}

/* 900px は pages/episodes.vue の境界と揃える */
@media (max-width: 900px) {
  .row {
    padding-right: 20px;
    gap: 10px;
    .main {
      gap: 10px;
    }
    .cover {
      /* ページの左右の余白（20px）に揃える */
      margin-left: 20px;
    }
    .play {
      margin-left: -10px;
    }
    .text {
      font-size: 12px;
    }

    /* 幅が残らないので、番組名は引っ込める。ジャケットで見分ける */
    .channel {
      display: none;
    }
  }
}
</style>

<script>
import episodeLine from '@/lib/episode-line'
import { toggleEpisode, revealFor } from '@/lib/player'

export default {
  // 回そのものの扱い（props と computed）はトップの子行と分け合っている
  mixins: [episodeLine],
  methods: {
    onPlay: function() {
      // episode に key と channel_title が入っているので、
      // 右下のプレーヤーはそこから番組を知る
      toggleEpisode(this.episode)
    },
    // 一覧へ行き、この番組の行を開いてこの回まで辿る（pages/index.vue が受ける）
    onOpenChannel: function() {
      revealFor(this.episode)
      this.$router.push('/')
    }
  }
}
</script>
