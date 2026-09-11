<template>
  <!-- 子行に並ぶ1話。押すと右下のプレーヤーで鳴る。
       操作（シーク・10秒送り・速度）は右下に集めてある。
       行を閉じるとここは消えるので、ここに操作を置くと触れなくなる -->
  <button
    class="episode"
    :class="{ 'is-current': current, 'is-playing': current && playing }"
    :title="playable ? episode.title : `${episode.title}（音声が取得できていません）`"
    :disabled="!playable"
    @click="onClick"
  >
    <span class="play" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16">
        <g v-if="current && playing" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </g>
        <path v-else fill="currentColor" d="M8 5.5v13l11-6.5z" />
      </svg>
    </span>
    <span class="text">{{ episode.title }}</span>
    <span class="time">{{ formattedDuration }}</span>
  </button>
</template>

<style scoped>
.episode {
  /* レイアウトのグローバルな button の指定（角丸・余白・最小幅・中央寄せ）を打ち消す */
  border: 0;
  border-radius: 0;
  min-width: 0;
  padding: 0;
  background: none;
  width: 100%;
  height: 44px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e5e5;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  /* 並びの最後だけは引かない。下まで見たとき、子行の下端の線と重なって
     2本に見えてしまう */
  &:last-child {
    border-bottom: 0;
  }
  &:disabled {
    cursor: default;
    opacity: 0.4;
  }
  &:not(:disabled):hover {
    background-color: #ececec;
  }
  /* /new から辿ってきたときに光らせる（pages/index.vue が付ける）。
     消えるときだけゆっくり戻す */
  transition: background-color 0.8s;
  &.is-revealed {
    transition: none;
  }
  &:focus-visible {
    outline: 1px solid #7f00ff;
    outline-offset: -1px;
  }
  /* 上下の余白（14px）と釣り合わせる。svg の枠は 16px だが、中の三角は
     左に 5.3px の空きを持っているので、そのぶんを引いた幅にしないと
     左だけ広く見える */
  .play {
    flex: none;
    width: 34px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #999;
  }
  .text {
    flex: 1;
    min-width: 0;
    color: #555;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: color 0.2s;
  }
  .time {
    flex: none;
    /* 右も上下と同じ 14px にする */
    padding: 0 14px 0 8px;
    color: #999;
    font-size: 11px;
    /* 数字の幅を揃えて、並びの中で右端が揃うようにする */
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  /* 右下で鳴らしている回がどれか、並びの中で見て分かるようにする。
     止めているものも印は残す（どこまで聴いたか見失わないように） */
  &.is-current {
    .play {
      color: #7f00ff;
    }
    .text {
      color: #111;
      font-weight: bold;
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
    },
    // どの番組の回か。右下のプレーヤーが番組名を出すのに使う
    channel: {
      type: Object,
      default: null
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
    onClick: function() {
      toggleEpisode(this.episode, this.channel)
    }
  }
}
</script>
