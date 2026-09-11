<template>
  <div class="row" :class="{ 'is-current': current, 'is-playing': current && playing }">
    <!-- ジャケットが再生ボタンを兼ねる。並びが詰まっているので、
         ボタンを別に足すと窮屈になる。押すと右下のプレーヤーで鳴る -->
    <button v-if="playable" class="cover-button" :title="`${episode.title} を再生`" :aria-label="`${episode.title} を再生`" @click="onPlay"><cover class="cover" :channel="episode.key" :size="30" radius="50%" /><span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12"><g v-if="current && playing" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></g><path v-else fill="currentColor" d="M8 5.5v13l11-6.5z" /></svg></span></button><cover v-else class="cover" :channel="episode.key" :size="30" radius="50%" /><a-blank class="text" :href="episode.link"><span class="channel">{{ episode.channel_title }}</span>{{ episode.title }}</a-blank>
  </div>
</template>

<style scoped>
div.row {
  padding: 5px 0;
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  margin-left: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 30px;
  &:hover {
    color: #3a8ee6;
  }
  .cover {
    flex-shrink: 0;
  }
  /* ジャケットに重ねる再生の印。触れている間だけ出す */
  .cover-button {
    /* レイアウトのグローバルな button の指定を打ち消す */
    border: 0;
    border-radius: 0;
    min-width: 0;
    padding: 0;
    background: none;
    flex-shrink: 0;
    position: relative;
    display: flex;
    cursor: pointer;
    .mark {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      color: #fff;
      background-color: rgba(0, 0, 0, 0.55);
      opacity: 0;
      transition: opacity 0.15s;
    }
    &:hover .mark, &:focus-visible .mark {
      opacity: 1;
    }
  }
  /* 右下で鳴らしている回は、触れていなくても印を出したままにする */
  &.is-current {
    .cover-button .mark {
      opacity: 1;
      background-color: rgba(127, 0, 255, 0.65);
    }
    .text {
      font-weight: bold;
    }
  }
  .text {
    flex-shrink: 1;
    height: 100%;
    margin-left: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    align-items: center;
    .channel {
      color: #fff;
      padding-left: 1em;
      font-size: 12px;
      background: #8000ff;
      padding: 5px 8px;
      border-radius: 3px;
      margin-right: 10px;
    }
  }
}
/* 900px は pages/new.vue の境界と揃える。
   以前は Responsive が測った幅から .small を付けていたが、幅が分かるまで
   ページ全体が隠れてしまうため、メディアクエリで判定する */
@media (max-width: 900px) {
  div.row {
    margin-left: 10px;
    .cover {
      width: 30px;
    }
    .text {
      font-size: 12px;
      line-height: 30px;
      .channel {
        font-size: 10px;
      }
    }
  }
}
</style>

<script>
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
    playing: function() { return player.playing }
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
