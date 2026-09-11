<template>
  <!-- 子行に並ぶ1話。押すと右下のプレーヤーで鳴る。
       操作（シーク・10秒送り・速度）は右下に集めてある。
       行を閉じるとここは消えるので、ここに操作を置くと触れなくなる -->
  <button
    class="episode episode-line"
    :class="{ 'is-current': current, 'is-playing': current && playing }"
    :title="playable ? episode.title : `${episode.title}（音声が取得できていません）`"
    :disabled="!playable"
    @click="onClick"
  >
    <span class="play">
      <play-icon :playing="current && playing" />
    </span>
    <span class="text">{{ episode.title }}</span>
    <span class="time">{{ formattedDuration }}</span>
  </button>
</template>

<style scoped>
/* 骨格と、題名・長さ・印の見た目は assets/episode-line.css（.episode-line）。
   ここに書くのは、子行にしかないものだけ */
.episode {
  border-bottom: 1px solid #e5e5e5;
  /* 並びの最後だけは引かない。下まで見たとき、子行の下端の線と重なって
     2本に見えてしまう */
  &:last-child {
    border-bottom: 0;
  }
  /* /new から辿ってきたときに光らせる（pages/index.vue が付ける）。
     消えるときだけゆっくり戻す */
  transition: background-color 0.8s;
  &.is-revealed {
    transition: none;
  }
  /* 上下の余白（14px）と釣り合わせる。svg の枠は 16px だが、中の三角は
     左に 5.3px の空きを持っているので、そのぶんを引いた幅にしないと
     左だけ広く見える */
  .play {
    width: 34px;
  }
  .text {
    flex: 1;
  }
  .time {
    /* 右も上下と同じ 14px にする */
    padding: 0 14px 0 8px;
  }
}

/* 触れたときの色は、ポインタのある環境だけ。指で押すと離したあとも
   残ってしまう（components/episode-row.vue と同じ理由）。
   ここを書かないと、レイアウトのグローバルな button:hover（紫）が
   そのまま効いてしまう */
@media (hover: hover) {
  .episode:not(:disabled):hover {
    background-color: #ececec;
  }
}
</style>

<script>
import episodeLine from '@/lib/episode-line'
import { toggleEpisode } from '@/lib/player'

export default {
  // 回そのものの扱い（props と computed）は /new の行と分け合っている
  mixins: [episodeLine],
  props: {
    // どの番組の回か。右下のプレーヤーが番組名を出すのに使う
    channel: {
      type: Object,
      default: null
    }
  },
  methods: {
    onClick: function() {
      toggleEpisode(this.episode, this.channel)
    }
  }
}
</script>
