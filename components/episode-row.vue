<template>
  <!-- /new に並ぶ1話。トップの子行（components/episode-item.vue）と同じく、
       行のどこを押しても右下のプレーヤーで鳴る。
       違うのは、番組をまたぐ一覧なのでジャケットと番組名を添えるところ -->
  <button
    class="row"
    :class="{ 'is-current': current, 'is-playing': current && playing }"
    :title="playable ? `${episode.title} を再生` : `${episode.title}（音声が取得できていません）`"
    :disabled="!playable"
    @click="onPlay"
  >
    <span class="cover-wrap">
      <cover class="cover" :channel="episode.key" :size="30" radius="50%" />
      <!-- ジャケットに重ねる再生の印。行に触れている間と、鳴らしている回に出す -->
      <span class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="12" height="12">
          <g v-if="current && playing" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </g>
          <path v-else fill="currentColor" d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </span>
    <span class="text">{{ episode.title }}</span>
    <!-- 番組名は題名の後ろに控えめに。ジャケットで分かることが多いが、
         知らない番組のときはここで名前が読める -->
    <span class="channel">{{ episode.channel_title }}</span>
    <span class="time">{{ formattedDuration }}</span>
  </button>
</template>

<style scoped>
.row {
  /* レイアウトのグローバルな button の指定（角丸・余白・最小幅・中央寄せ）を打ち消す */
  border: 0;
  border-radius: 0;
  min-width: 0;
  padding: 0 20px 0 0;
  background: none;
  color: inherit;
  /* font: inherit だと親（/new）の 16px を拾ってしまう。
     トップの子行（components/episode-item.vue）と同じ 13px に揃える */
  font: inherit;
  font-size: 13px;
  font-weight: normal;
  text-align: left;
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
  &:focus-visible {
    outline: 1px solid #7f00ff;
    outline-offset: -1px;
  }

  .cover-wrap {
    flex: none;
    position: relative;
    display: flex;
    /* 日付の見出しと縦に揃える */
    margin-left: 100px;
    .mark {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      color: #fff;
      /* グレーで重ねる。紫は「いま鳴っている回」の印に取ってある */
      background-color: rgba(70, 70, 70, 0.6);
      opacity: 0;
      transition: opacity 0.15s;
    }
  }
  &:focus-visible .cover-wrap .mark {
    opacity: 1;
  }

  .text {
    flex: 0 1 auto;
    min-width: 0;
    color: #555;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .channel {
    flex: none;
    max-width: 30%;
    color: #999;
    font-size: 11px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .time {
    flex: none;
    /* 残りを埋めて右端へ寄せる */
    margin-left: auto;
    padding-left: 12px;
    color: #999;
    font-size: 11px;
    /* 数字の幅を揃えて、並びの中で右端が揃うようにする */
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* 右下で鳴らしている回。触れていなくても印を出したままにする */
  &.is-current {
    .cover-wrap .mark {
      opacity: 1;
      background-color: rgba(127, 0, 255, 0.65);
    }
    .text {
      color: #111;
      font-weight: bold;
    }
  }
}

/* 触れたときの見た目は、ポインタのある環境だけにする。
   指で押すと離したあとも状態が残り、押しっぱなしのように見えるため。
   幅ではなく入力の仕方で分ける（タッチできるノート PC もある） */
@media (hover: hover) {
  .row:not(:disabled):hover {
    background-color: #f2f2f2;
  }
  /* 行のどこに触れても再生の印を出す。行ごと押せば鳴ると分かるように */
  .row:not(:disabled):hover .cover-wrap .mark {
    opacity: 1;
  }
}

/* 900px は pages/new.vue の境界と揃える */
@media (max-width: 900px) {
  .row {
    padding-right: 10px;
    gap: 10px;
    .cover-wrap {
      margin-left: 10px;
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
import formatTime from '@/lib/format-time'
import { player, isCurrent, toggleEpisode } from '@/lib/player'

export default {
  props: {
    episode: {
      required: true,
      type: Object
    }
  },
  computed: {
    // 音声を持たない回がある（記事だけのフィードや、enclosure の無い回）
    playable: function() { return !!this.episode.url },
    current: function() { return isCurrent(this.episode) },
    playing: function() { return player.playing },
    formattedDuration: function() {
      return formatTime(this.episode.duration == null ? NaN : this.episode.duration)
    }
  },
  methods: {
    onPlay: function() {
      // episode に key と channel_title が入っているので、
      // 右下のプレーヤーはそこから番組を知る
      toggleEpisode(this.episode)
    }
  }
}
</script>
