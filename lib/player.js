"use strict";

import { reactive } from 'vue'
import build_info from '@/static/downloads/build_info.json'
import { bindActions, setMetadata, setPlaybackState, setPosition } from './media-session.js'
import { positionFor, remember, forget } from './resume-position.js'
import track from './analytics.js'
import crossedMilestones from './listen-progress.js'

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

// 聴いた順の控え。番組をまたいで行き来するので、それなりの数を持つ。
// 古いものから捨てる
const HISTORY_LIMIT = 50

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
  reveal: null,

  // プレーヤーを下に隠しているか。レイアウトが一覧の下余白を決めるのに
  // 見る（隠している間はつまみのぶんだけでよい）
  minimized: false,

  // 聴いた順の控えと、いまその何番目にいるか。
  // ブラウザの戻る・進むと同じ振る舞いにする。途中まで戻ってから
  // 別の回を選んだら、そこから先は捨てる
  history: [],
  historyIndex: -1
})

// Audio はブラウザにしか無い。事前レンダリング中は作らない
let audio = null

// ---- 計測（GA4）----
//
// どの回が、どこから選ばれ、実際に鳴り、どれだけ聴かれたか。
// 送るのは lib/analytics.js。一覧は docs/analytics-events.md

// イベントに添える、いまの回の情報
const episodeParams = (entry = player.episode) => entry
  ? { channel_key: entry.key, episode_title: entry.title }
  : {}

export const trackPlayer = (name, params, options) =>
  track(name, { ...episodeParams(), ...params }, options)

// いまの回で、もう送ったもの。回を差し替えたら空に戻す
let started = false
let reachedMilestones = []
// 鳴り始めた時刻（ミリ秒）と、そのとき鳴っていた回。止まったときに差を
// 聴いた時間として送る。回を差し替えたときは player.episode が先に
// 次の回へ替わっているので、鳴っていた回をここで覚えておく
let listeningSince = null
let listeningEntry = null

const resetListening = () => {
  started = false
  reachedMilestones = []
}

// 鳴っていたぶんを送る。止めた・聴き終えた・回を替えた・ページを閉じたとき。
// 速度を上げていても、かかった時間そのもの（人が使った時間）を数える
const flushListening = (beacon = false) => {
  if(listeningSince == null) return
  const seconds = Math.round((Date.now() - listeningSince) / 1000)
  listeningSince = null
  if(seconds < 1) return
  track('audio_listen', { ...episodeParams(listeningEntry), listen_seconds: seconds, rate: player.rate }, { beacon })
}

// play() は、読み込み中に別の回へ替えると AbortError で断られる。
// それは人が選び直しただけなので数えない
const play = (el) => {
  const result = el.play()
  if(result && result.catch) {
    result.catch(error => {
      if(error && error.name === 'AbortError') return
      trackPlayer('audio_error', { error_type: (error && error.name) || 'play', audio_host: hostOf(el.src) })
    })
  }
  return result
}

const hostOf = (url) => {
  try { return new URL(url).hostname } catch { return '' }
}

// 続きから聴くための控えの置き場。ブラウザにしか無い
const store = () => (import.meta.client ? window.localStorage : null)

// 聴いた位置を書き留める間隔。timeupdate は毎秒来るので、そのたびに
// 書くと localStorage への書き込みが多すぎる
const REMEMBER_EVERY = 5
let lastRemembered = -1

// ロック画面のつまみへ渡す値。毎秒の timeupdate ごとに渡すと重いので、
// 1秒ぶん進んだときだけにする
let lastPosted = -1
const postPosition = (force) => {
  if(!audio) return
  if(!force && Math.abs(audio.currentTime - lastPosted) < 1) return
  lastPosted = audio.currentTime
  setPosition({ duration: audio.duration, position: audio.currentTime, rate: player.rate })
}

const attach = (url) => {
  if(!audio) {
    audio = new Audio()
    audio.addEventListener('loadedmetadata', () => {
      player.duration = audio.duration
      postPosition(true)
    })
    audio.addEventListener('timeupdate', () => {
      player.currentTime = audio.currentTime
      postPosition(false)
      // 止まっている間のシークでは数えない。鳴っている位置だけを見る
      if(!audio.paused) {
        for(const percent of crossedMilestones(audio.currentTime, audio.duration, reachedMilestones)) {
          reachedMilestones.push(percent)
          trackPlayer('audio_progress', { percent })
        }
      }
      if(Math.abs(audio.currentTime - lastRemembered) < REMEMBER_EVERY) return
      lastRemembered = audio.currentTime
      remember(audio.src, audio.currentTime, audio.duration, store())
    })
    audio.addEventListener('play', () => {
      player.playing = true
      setPlaybackState(true)
      if(listeningSince == null) {
        listeningSince = Date.now()
        listeningEntry = player.episode
      }
      // その回で初めて鳴ったとき。選んだ（episode_select）のに鳴らなかった
      // ものとの差で、再生できなかった回が分かる
      if(!started) {
        started = true
        trackPlayer('audio_start', { rate: player.rate })
      }
    })
    audio.addEventListener('pause', () => {
      player.playing = false
      setPlaybackState(false)
      flushListening()
    })
    // 配信元の音声を鳴らせなかった（ファイルが無い、形式を読めないなど）。
    // どの配信元で起きやすいかを見たいので、ホスト名を添える
    audio.addEventListener('error', () => {
      if(!audio.src) return
      trackPlayer('audio_error', {
        error_type: `media_${(audio.error && audio.error.code) || 'unknown'}`,
        audio_host: hostOf(audio.src)
      })
    })
    audio.addEventListener('ended', () => {
      flushListening()
      trackPlayer('audio_complete')
      player.playing = false
      player.currentTime = 0
      audio.currentTime = 0
      setPlaybackState(false)
      // 聴き終えたものは、次に選んだとき頭から
      forget(audio.src, store())
    })
    // 閉じる直前にもう一度書く。timeupdate の間隔（5秒）のぶんを取りこぼさない
    window.addEventListener('pagehide', () => {
      if(audio && !audio.paused) remember(audio.src, audio.currentTime, audio.duration, store())
      flushListening(true)
    })
    // ロック画面やイヤホンの操作を受け取る。ここで登録しておけば、
    // あとは端末が押されたものを呼んでくれる
    // どれも画面の外で押されたものなので、input: media_session を付けて送る
    const fromDevice = (control, fn) => (...args) => {
      trackPlayer('player_control', { control, input: 'media_session' })
      return fn(...args)
    }
    bindActions({
      play: fromDevice('play', () => { if(player.episode) play(attach(player.episode.url)) }),
      pause: fromDevice('pause', () => { if(audio) audio.pause() }),
      skip: (seconds) => fromDevice(seconds < 0 ? 'skip_back' : 'skip_forward', skip)(seconds),
      seekTo: fromDevice('seek', seekTo),
      previous: fromDevice('history_back', () => goBack('media_session')),
      next: fromDevice('history_forward', () => goForward('media_session'))
    })
  }
  if(audio.src !== url) {
    // 前の回で鳴っていたぶんは、差し替える前に送る
    // （src を替えても pause は来ない）
    flushListening()
    resetListening()
    audio.src = url
    audio.playbackRate = player.rate
    // 前に途中まで聴いていれば、そこから。
    // src を入れ替えた直後は長さが分からないので、読み込めてから動かす
    const resume = positionFor(url, store())
    lastRemembered = resume
    if(resume > 0) {
      audio.addEventListener('loadedmetadata', () => {
        // 読み込みを待つあいだに人が動かしていたら、そちらを優先する
        if(audio.currentTime > 0) return
        audio.currentTime = resume
        player.currentTime = resume
      }, { once: true })
    }
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
  duration: episode.duration,
  // 右下のプレーヤーが日付を出すのに使う。フィードの RFC2822 のまま持ち、
  // 表示するときに lib/jst.js を通す（CLAUDE.md「日付の扱い」）
  pubDate: episode.pubDate || null
})

// ロック画面へ出すジャケット。番組のキーから引く
const coverFor = (entry) => {
  const channel = entry && entry.key && build_info.channels[entry.key]
  return (channel && channel.cover) || null
}

// 今の1話を差し替えて鳴らす。
// source はどこから選ばれたか（list / episodes / history_back など）
function setEpisode(entry, source) {
  player.episode = entry
  // 続きがあれば、読み込めた時点で attach がそこへ動かす
  player.currentTime = import.meta.client ? positionFor(entry.url, store()) : 0
  // 再生前はフィードに書かれている長さを使う。読み込めたら置き換わる
  player.duration = entry.duration == null ? NaN : entry.duration
  if(!import.meta.client) return
  setMetadata(entry, coverFor(entry), window.location.origin)
  trackPlayer('episode_select', { source, resumed: player.currentTime > 0 })
  play(attach(entry.url))
}

// 一覧の行や /episodes から呼ぶ。同じものなら再生と一時停止の切り替え、
// 違うものなら差し替えて頭から鳴らす。
// source は計測用。どの画面から選ばれたか（list / episodes）
export function toggleEpisode(episode, channel, source) {
  if(!episode || !episode.url) return
  if(isCurrent(episode)) {
    trackPlayer('player_control', { control: player.playing ? 'pause' : 'play', input: source })
    toggle()
    return
  }
  const entry = toEntry(episode, channel)

  // 途中まで戻っているところで別の回を選んだら、その先は捨てる。
  // ブラウザで戻ってから別のリンクを踏んだときと同じ
  player.history = player.history.slice(0, player.historyIndex + 1)
  player.history.push(entry)
  if(player.history.length > HISTORY_LIMIT) player.history = player.history.slice(-HISTORY_LIMIT)
  player.historyIndex = player.history.length - 1

  setEpisode(entry, source)
}

// 聴いた順をさかのぼる／進む。控えの中を動くだけなので、履歴は積まない
export function goBack(source = 'history_back') {
  if(!canGoBack()) return
  player.historyIndex--
  setEpisode(player.history[player.historyIndex], source)
}

export function goForward(source = 'history_forward') {
  if(!canGoForward()) return
  player.historyIndex++
  setEpisode(player.history[player.historyIndex], source)
}

// 控えの一覧から直に選ぶ（右下のドロワー）。控えの中を動くだけなので積まない
export function playAt(index) {
  if(index < 0 || index >= player.history.length) return
  if(index === player.historyIndex && isCurrent(player.history[index])) {
    toggle()
    return
  }
  player.historyIndex = index
  setEpisode(player.history[index], 'history_list')
}

export const canGoBack = () => player.historyIndex > 0
export const canGoForward = () => player.historyIndex >= 0 && player.historyIndex < player.history.length - 1

export function toggle() {
  if(!import.meta.client || !player.episode) return
  const el = attach(player.episode.url)
  if(el.paused) play(el)
  else el.pause()
}

export function seekTo(seconds) {
  if(!import.meta.client || !player.episode) return
  const el = attach(player.episode.url)
  const max = isFinite(player.duration) ? player.duration : Infinity
  const time = Math.max(0, Math.min(seconds, max))
  el.currentTime = time
  player.currentTime = time
  postPosition(true)
  lastRemembered = time
  remember(el.src, time, player.duration, store())
}

export function skip(seconds) {
  seekTo(player.currentTime + seconds)
}

export function cycleRate() {
  player.rate = RATES[(RATES.indexOf(player.rate) + 1) % RATES.length]
  if(audio) audio.playbackRate = player.rate
  postPosition(true)
}

// その回の子行へ辿るための合図。pages/index.vue が見て、番組の行を開き
// その回までスクロールする。URL には持たせていない
// （まとめて設計したいので issue #236 へ回した）。
//
// 同じ回を続けて指しても動くよう、毎回新しいオブジェクトを入れる
// （index.vue は watch で見ているので、値が変わらないと反応しない）
export function revealFor(episode) {
  if(!episode || !episode.key) return
  player.reveal = { key: episode.key, url: episode.url, at: Date.now() }
}

// 右下のプレーヤーから、いま鳴っている回の子行へ辿る
export function requestReveal() {
  revealFor(player.episode)
}

export function clearReveal() {
  player.reveal = null
}
