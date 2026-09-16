"use strict";

// どこまで聴かれたかの区切り（%）。GA4 の動画の計測（video_progress）に倣う
export const MILESTONES = [10, 25, 50, 75, 90]

// いまの位置で、まだ送っていない区切りのうち越えたもの。
// シークで飛んだ場合は、飛び越えた区切りもまとめて返す
// （その回をどこまで開いたか、として数える）
export default function crossedMilestones(currentTime, duration, reached = []) {
  if(!isFinite(duration) || duration <= 0 || !isFinite(currentTime)) return []
  const percent = (currentTime / duration) * 100
  return MILESTONES.filter(m => percent >= m && !reached.includes(m))
}
