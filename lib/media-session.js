"use strict";

// ロック画面やコントロールセンターに、いま鳴っているものを出す。
//
// 音を出しているのはページの中の Audio（lib/player.js）だが、それだけだと
// 端末側には「音が鳴っている」ことしか伝わらず、ロック画面には何も出ない。
// ここで番組名・回のタイトル・ジャケットを渡し、押されたボタンを
// プレーヤーへ返す。イヤホンの再生・停止もここを通る。
//
// 音声そのものは配信元から直接鳴らしたままで、手元には置かない
// （CLAUDE.md「音声の再生」）。ここで渡すのは見出しの情報だけ。

// ジャケットは1枚の元画像と、縮めた2枚がある（scripts/pf-util.js の
// downloadAndResize）。端末はこの中から場所に合う大きさを選ぶので、
// 小さいものから大きいものまで並べて渡す。
// 元画像は 3000x3000 なので、ロック画面の大きな表示にも足りる
const ARTWORK_SIZES = [
  { suffix: '-60', sizes: '60x60' },
  { suffix: '-120', sizes: '120x120' },
  { suffix: '', sizes: '512x512' }
]

const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }

const available = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator

// 拡張子の直前に大きさを挿し込む。最初のドットにマッチさせると、
// キーにドットを含む番組（yota.fm, CEO.FM など）で壊れる
// （components/cover.vue と同じ理由）
export function artworkFor(cover, origin = '') {
  if(!cover) return []
  const ext = (cover.split('.').pop() || '').toLowerCase()
  return ARTWORK_SIZES.map(({ suffix, sizes }) => ({
    src: origin + cover.replace(/\.([^.]+)$/, `${suffix}.$1`),
    sizes,
    type: TYPES[ext] || ''
  }))
}

// 押されたボタンをプレーヤーへ返す。渡し忘れたものは登録しない
// （登録しないでおくと、端末はそのボタンを出さない）
export function bindActions(handlers) {
  if(!available()) return
  const set = (name, fn) => {
    if(!fn) return
    // 端末が知らない操作を渡すと例外になる。出せるものだけ出す
    try { navigator.mediaSession.setActionHandler(name, fn) } catch {}
  }
  set('play', handlers.play)
  set('pause', handlers.pause)
  set('seekbackward', (e) => handlers.skip && handlers.skip(-(e && e.seekOffset ? e.seekOffset : 10)))
  set('seekforward', (e) => handlers.skip && handlers.skip(e && e.seekOffset ? e.seekOffset : 10))
  set('seekto', (e) => {
    if(!handlers.seekTo || !e || e.seekTime == null) return
    handlers.seekTo(e.seekTime)
  })
  // 前後は、聴いた順の控え（player.history）を辿る
  set('previoustrack', handlers.previous)
  set('nexttrack', handlers.next)
}

export function setMetadata(entry, cover, origin = '') {
  if(!available()) return
  if(!entry) {
    navigator.mediaSession.metadata = null
    return
  }
  if(typeof MediaMetadata === 'undefined') return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: entry.title || '',
    // ロック画面では2行目が演者の欄になる。番組名を入れる
    artist: entry.channelTitle || '',
    album: 'Podcast Freaks',
    artwork: artworkFor(cover, origin)
  })
}

export function setPlaybackState(playing) {
  if(!available()) return
  navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
}

// つまみの位置。これを渡さないと、ロック画面の細長いバーが出ない。
// 長さが分からないうち（読み込み前）は渡せないので黙って何もしない
export function setPosition({ duration, position, rate }) {
  if(!available() || !navigator.mediaSession.setPositionState) return
  if(!isFinite(duration) || duration <= 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration,
      playbackRate: rate || 1,
      // 読み込み直後に duration を超えた値を渡すと例外になる
      position: Math.max(0, Math.min(position || 0, duration))
    })
  } catch {}
}
