"use strict";

import { reactive } from 'vue'

// サイト全体で1つだけの再生状態。
//
// 以前は components/episode-player.vue が1話ごとに Audio を持っていた。
// 行を閉じるとコンポーネントごと消えて再生も止まり、ページを移っても止まった
// （issue #235）。音を出すのは1つだけなので、状態も Audio もここに1つ持ち、
// 画面の側はそれを見るだけにする。
//
// Nuxt の useState ではなくモジュールの reactive にしているのは、ページも
// コンポーネントも Options API で書かれているため。setup を通さずに
// import して使える。事前レンダリング（Node 側）では Audio を作らないので、
// ビルド中に状態が入ることはない。
//
// 音声は配信元の URL をそのまま鳴らす。中継もキャッシュもしない
// （CLAUDE.md「音声の再生」）。

export const RATES = [1, 1.2, 1.5, 1.8, 2]

export const player = reactive({
  // 今のエピソード。{ key, channelTitle, title, link, url, duration }
  episode: null,
  playing: false,
  currentTime: 0,
  // フィードに書かれた長さを先に出し、音声を読み込めたらそちらで置き換える
  duration: NaN,
  rate: 1,
  // 「番組へ」で開きたい先。pages/index.vue がこれを見て子行を開く。
  // 処理したら消してもらう（同じ番組をもう一度指せるように）
  reveal: null
})

// Audio はブラウザにしか無い。事前レンダリング中は作らない
let audio = null

const attach = (url) => {
  if(!audio) {
    audio = new Audio()
    audio.addEventListener('loadedmetadata', () => { player.duration = audio.duration })
    audio.addEventListener('timeupdate', () => { player.currentTime = audio.currentTime })
    audio.addEventListener('play', () => { player.playing = true })
    audio.addEventListener('pause', () => { player.playing = false })
    audio.addEventListener('ended', () => {
      player.playing = false
      player.currentTime = 0
      audio.currentTime = 0
    })
  }
  if(audio.src !== url) {
    audio.src = url
    audio.playbackRate = player.rate
  }
  return audio
}

// 同じエピソードか。link は持たない番組があるので、音声の URL で見る
export const isCurrent = (episode) =>
  !!episode && !!player.episode && player.episode.url === episode.url

// 画面の側が渡してくるものから、持ち回る形に整える
const toEntry = (episode, channel) => ({
  key: (channel && channel.key) || episode.key || null,
  channelTitle: (channel && channel.title) || episode.channel_title || null,
  title: episode.title,
  link: episode.link || null,
  url: episode.url,
  duration: episode.duration
})

// 今の1話を差し替えて鳴らす
function setEpisode(entry) {
  player.episode = entry
  player.currentTime = 0
  // 再生前はフィードに書かれている長さを使う。読み込めたら置き換わる
  player.duration = entry.duration == null ? NaN : entry.duration
  if(!import.meta.client) return
  attach(entry.url).play()
}

// 一覧の行や /new から呼ぶ。同じものなら再生と一時停止の切り替え、
// 違うものなら差し替えて頭から鳴らす
export function toggleEpisode(episode, channel) {
  if(!episode || !episode.url) return
  if(isCurrent(episode)) {
    toggle()
    return
  }
  setEpisode(toEntry(episode, channel))
}

export function toggle() {
  if(!import.meta.client || !player.episode) return
  const el = attach(player.episode.url)
  if(el.paused) el.play()
  else el.pause()
}

export function seekTo(seconds) {
  if(!import.meta.client || !player.episode) return
  const el = attach(player.episode.url)
  const max = isFinite(player.duration) ? player.duration : Infinity
  const time = Math.max(0, Math.min(seconds, max))
  el.currentTime = time
  player.currentTime = time
}

export function skip(seconds) {
  seekTo(player.currentTime + seconds)
}

export function cycleRate() {
  player.rate = RATES[(RATES.indexOf(player.rate) + 1) % RATES.length]
  if(audio) audio.playbackRate = player.rate
}

// 右下のプレーヤーから、その番組の子行へ辿るための合図。
// URL には持たせていない（まとめて設計したいので issue #236 へ回した）
export function requestReveal() {
  if(!player.episode || !player.episode.key) return
  player.reveal = { key: player.episode.key, url: player.episode.url, at: Date.now() }
}

export function clearReveal() {
  player.reveal = null
}
