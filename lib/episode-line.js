import formatTime from '@/lib/format-time'
import { player, isCurrent } from '@/lib/player'

// トップの子行（components/episode-item.vue）と /new の行
// （components/episode-row.vue）で同じ中身。どの回か、鳴っているか、長さは
// どちらも同じ出し方になる。見た目のほうは assets/episode-line.css にある。
//
// 押したときの行き先は違う（子行は自分がどの番組かを知っているが、/new は
// 回だけ持っていて、番組名からは一覧へ飛ぶ）ので、メソッドは各コンポーネント
// に残してある。並べるものも中身も違うので、コンポーネント自体は分けたまま
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
  }
}
