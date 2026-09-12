import { describe, it, expect } from 'vitest'
import registerRequestIssueUrl, { issueBody, issueTitle, ISSUE_LABEL } from './register-request-issue.js'

const channel = {
  title: 'fukabori.fm',
  feed: 'https://rss.art19.com/fukabori',
  apple: 'https://podcasts.apple.com/jp/podcast/fukabori-fm/id1388826609',
  trackCount: 141,
  releaseDate: '2026-07-31T08:30:00Z',
  genres: ['テクノロジー', 'ポッドキャスト']
}

describe('issueTitle', () => {
  it('番組名を添える', () => {
    expect(issueTitle('fukabori.fm')).toBe('番組の登録リクエスト: fukabori.fm')
  })

  it('番組名が無くても issue は立てられる', () => {
    expect(issueTitle('')).toBe('番組の登録リクエスト')
  })
})

describe('issueBody', () => {
  const body = issueBody({ channel, source: { url: 'https://open.spotify.com/show/abc', title: 'fukabori.fm' } })

  // Actions（#231）がここを読む。`- ラベル: 値` の形を崩さない
  it('調べた結果を1行ずつ並べる', () => {
    expect(body).toContain('- 番組名: fukabori.fm')
    expect(body).toContain('- フィード: https://rss.art19.com/fukabori')
    expect(body).toContain('- 話数: 141')
    expect(body).toContain('- ジャンル: テクノロジー, ポッドキャスト')
  })

  it('最新エピソードの日付は日本時間の日付にする', () => {
    // 2026-07-31T08:30:00Z は JST では同じ日の 17:30
    expect(body).toContain('- 最新エピソード: 2026-07-31')
  })

  it('分からないものは、人が書き足せるよう空で置く', () => {
    expect(body).toContain('- X: ')
    expect(body).toContain('- ハッシュタグ: ')
    expect(body).toContain('- キーの希望: ')
  })

  it('どのページから送ったかを残す', () => {
    expect(body).toContain('- 見ていたページ: https://open.spotify.com/show/abc')
  })

  it('項目が欠けていても壊れない', () => {
    const empty = issueBody()
    expect(empty).toContain('- 番組名: ')
    expect(empty).toContain('- 最新エピソード: ')
  })
})

describe('registerRequestIssueUrl', () => {
  it('GitHub の issue 作成画面へ、ラベル・題・本文を載せて渡す', () => {
    const url = new URL(registerRequestIssueUrl({ channel, source: {} }))
    expect(url.origin + url.pathname).toBe('https://github.com/noracast/podcastfreaks.com/issues/new')
    expect(url.searchParams.get('labels')).toBe(ISSUE_LABEL)
    expect(url.searchParams.get('title')).toBe('番組の登録リクエスト: fukabori.fm')
    expect(url.searchParams.get('body')).toContain('- フィード: https://rss.art19.com/fukabori')
  })
})
