"use strict";

// 途中まで聴いた回を、次に選んだとき続きから鳴らす。
//
// 覚えるのは「音声の URL と、そこまで聴いた秒数」だけ。音声そのものは
// 置かない（CLAUDE.md「音声の再生」）。置き場は localStorage で、
// 端末の中だけに閉じる。
//
// 端末ごとに別々でよいと割り切っている。同じ回を PC と iPhone で続きから、
// までやるにはサーバー側が要る。

export const STORAGE_KEY = 'pf-resume-v1'

// 覚えておく回の数。番組をまたいで行き来するので、それなりに持つ。
// 古いものから捨てる
export const LIMIT = 200

// 頭の方は覚えない。少し鳴らしただけのものまで途中から始まると、
// 「頭から聴き直す」ができなくなる
export const HEAD = 30

// 終わりぎわも覚えない。聴き終えた回は次に選んだとき頭からでよい
export const TAIL = 30

const now = () => Date.now()

// localStorage は、プライベートモードや容量いっぱいのときに例外を投げる。
// 続きから聴けないだけで困る場面ではないので、黙って何もしない
const read = (storage) => {
  if(!storage) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if(!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}
  } catch {
    return {}
  }
}

const write = (storage, value) => {
  if(!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {}
}

// 増え続けないよう、触った順に古いものから捨てる
const trim = (entries) => {
  const keys = Object.keys(entries)
  if(keys.length <= LIMIT) return entries
  const sorted = keys.sort((a, b) => (entries[b].at || 0) - (entries[a].at || 0)).slice(0, LIMIT)
  const kept = {}
  for(const key of sorted) kept[key] = entries[key]
  return kept
}

// その回を前回どこまで聴いたか。無ければ 0（頭から）
export function positionFor(url, storage) {
  if(!url) return 0
  const entry = read(storage)[url]
  const time = entry && Number(entry.time)
  return isFinite(time) && time > 0 ? time : 0
}

// 聴いている途中の位置を覚える。
// 頭と終わりぎわは覚えない（覚えると、かえって扱いにくくなる）
export function remember(url, time, duration, storage) {
  if(!url || !isFinite(time)) return
  if(time < HEAD) return forget(url, storage)
  if(isFinite(duration) && duration > 0 && time > duration - TAIL) return forget(url, storage)

  const entries = read(storage)
  entries[url] = { time, at: now() }
  write(storage, trim(entries))
}

// 聴き終えた回、頭に戻した回。覚えていたものを消す
export function forget(url, storage) {
  if(!url) return
  const entries = read(storage)
  if(!(url in entries)) return
  delete entries[url]
  write(storage, entries)
}
