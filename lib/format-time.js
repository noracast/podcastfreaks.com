"use strict";

// 再生位置と長さの表示。1時間未満は m:ss、超えたら h:mm:ss にする。
// 読み取れないときは '--:--'（フィードに長さが無い番組があり、
// 音声を読み込むまで分からない）
export default function formatTime(seconds) {
  if(!isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
