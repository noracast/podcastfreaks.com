"use strict";

// 公開中のサイトの状態を調べ、問題があれば Markdown で報告する。
//
// 毎日のビルドが失敗し続けていても誰も気づかない、という状態が長く続いた。
// ビルドの成否そのものだけでなく、「ビルドは通っているが中身がおかしい」
// （取得できないフィード、ポッドキャストでないフィード）も拾う。
//
// GitHub Actions から依存のインストールなしで動かせるよう、素の CommonJS で書く。
// 判定はすべて公開中の build_info.json を見るだけで完結する。
//
// 使い方:
//   node scripts/check-site-health.js        問題があれば報告を出力して exit 1
//   node scripts/check-site-health.js --json 判定結果を JSON で出力
//
// Ref: https://github.com/noracast/podcastfreaks.com/issues/48

const BUILD_INFO_URL = 'https://podcastfreaks.com/downloads/build_info.json'

// 毎日ビルドしているので、これを超えて更新が無ければビルドが止まっている
const STALE_BUILD_HOURS = 36

const keyOf = (path) => String(path || '').replace(/^.*\//, '').replace(/\.rss$/, '')

const hoursSince = (date) => (Date.now() - new Date(date).getTime()) / 3600000

async function checkSiteHealth(url = BUILD_INFO_URL) {
  const res = await fetch(url)
  if (!res.ok) {
    return {
      problems: [{
        kind: 'fetch',
        title: 'サイトの状態を取得できません',
        detail: `${url} が ${res.status} を返しました。サイト自体が落ちている可能性があります。`
      }],
      info: null
    }
  }

  const info = await res.json()
  const problems = []

  const staleHours = hoursSince(info.updated)
  if (staleHours > STALE_BUILD_HOURS) {
    problems.push({
      kind: 'stale',
      title: 'ビルドが止まっています',
      detail: `最後のビルドは ${new Date(info.updated).toISOString()}（約${Math.floor(staleHours / 24)}日前）です。` +
        '毎日のビルドは IFTTT から Netlify の Build hook を叩いて動かしています。まずそちらを確認してください。'
    })
  }

  const errors = info.errors || []
  if (errors.length) {
    problems.push({
      kind: 'errors',
      title: `フィードを取得できない番組が ${errors.length}件あります`,
      detail: errors.map(e => `- \`${keyOf(e.rss)}\` — ${(e.error && e.error.message) || e.label}`).join('\n')
    })
  }

  const warnings = info.warnings || []
  if (warnings.length) {
    problems.push({
      kind: 'warnings',
      title: `ポッドキャストのフィードでない可能性がある番組が ${warnings.length}件あります`,
      detail: warnings.map(w => `- \`${keyOf(w.rss)}\` — ${w.message}`).join('\n')
    })
  }

  return { problems, info }
}

const buildReport = ({ problems, info }) => {
  const lines = ['毎日のビルド結果を見て、対応が必要そうなものをまとめています。', '']
  problems.forEach(p => {
    lines.push(`### ${p.title}`, '', p.detail, '')
  })
  if (info) {
    lines.push('---', '',
      `番組 ${Object.keys(info.channels || {}).length}件 / エピソード ${info.episodeCount}件 / ` +
      `最終ビルド ${new Date(info.updated).toISOString()}`, '',
      '対処の手順は `.claude/skills/feed-triage/SKILL.md` にまとめてあります。')
  }
  return lines.join('\n')
}

module.exports = { checkSiteHealth, buildReport, BUILD_INFO_URL }

if (require.main === module) {
  checkSiteHealth().then(result => {
    const { problems } = result
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify({ hasProblems: problems.length > 0, problems }, null, 2))
    }
    else if (problems.length) {
      console.log(buildReport(result))
    }
    else {
      console.log('問題は見つかりませんでした。')
    }
    process.exit(problems.length ? 1 : 0)
  }).catch(err => {
    console.error('判定に失敗しました:', err.message)
    process.exit(2)
  })
}
