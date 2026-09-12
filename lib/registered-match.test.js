import { describe, it, expect } from 'vitest'
import matchRegistered, { matchByHost, normalizeFeed, normalizeTitle, searchRegistered } from './registered-match.js'

// static/registered.json と同じ形（#229）
const registered = {
  fukabori: { feed: 'https://fukabori.fm/feed.xml', title: 'fukabori.fm' },
  rebuild: { feed: 'https://feeds.rebuild.fm/rebuildfm', title: 'Rebuild' },
  // フィードが落ちていて取得できなかった番組は、番組名が入らない
  broken: { feed: 'https://example.com/feed', title: null }
}

describe('normalizeFeed', () => {
  it('プロトコル・www・末尾のスラッシュの違いを無視する', () => {
    expect(normalizeFeed('http://www.Example.com/feed/')).toBe('example.com/feed')
  })

  it('クエリは残す（クエリで番組を分けるフィードがある）', () => {
    expect(normalizeFeed('https://example.com/feed?show=2')).toBe('example.com/feed?show=2')
  })
})

describe('normalizeTitle', () => {
  it('全角・半角・空白・大文字小文字の違いを無視する', () => {
    expect(normalizeTitle('ｆｕｋａｂｏｒｉ.ｆｍ')).toBe(normalizeTitle('Fukabori.fm'))
    expect(normalizeTitle('ゆる コンピュータ　科学ラジオ')).toBe('ゆるコンピュータ科学ラジオ')
  })
})

describe('matchRegistered', () => {
  it('フィードの URL が一致すれば登録済み', () => {
    const matched = matchRegistered(registered, { feed: 'https://fukabori.fm/feed.xml', title: '別の名前' })
    expect(matched).toHaveLength(1)
    expect(matched[0].key).toBe('fukabori')
    expect(matched[0].matchedBy).toBe('feed')
  })

  // こちらが FeedBurner 経由などで登録していると、Apple 側の feedUrl と
  // 食い違う。番組名でも見ないと取りこぼす
  it('フィードが違っても、番組名が一致すれば登録済みとして出す', () => {
    const matched = matchRegistered(registered, { feed: 'https://rss.art19.com/fukabori', title: 'fukabori.fm' })
    expect(matched).toHaveLength(1)
    expect(matched[0].key).toBe('fukabori')
    expect(matched[0].matchedBy).toBe('title')
  })

  it('どちらも当たらなければ空', () => {
    expect(matchRegistered(registered, { feed: 'https://example.org/rss', title: '新しい番組' })).toEqual([])
  })

  it('番組名を持たない登録（取得に失敗した番組）は、フィードだけで見る', () => {
    expect(matchRegistered(registered, { feed: 'https://example.com/feed', title: '' })[0].key).toBe('broken')
    expect(matchRegistered(registered, { feed: '', title: '' })).toEqual([])
  })

  it('一覧が読めなかったときは、判定せずに空を返す', () => {
    expect(matchRegistered(null, { feed: 'https://fukabori.fm/feed.xml' })).toEqual([])
  })
})

describe('matchByHost', () => {
  const registered = {
    voiceofonebutton: { feed: 'http://radio.voiceofonebutton.net/index20.rdf', title: 'Apple News Radio ワンボタンの声' },
    '10xfm': { feed: 'https://anchor.fm/s/559fd878/podcast/rss', title: '10X.fm' },
    '46fm': { feed: 'https://anchor.fm/s/292515ec/podcast/rss', title: '46fm' },
    fukabori: { feed: 'https://fukabori.fm/feed.xml', title: 'fukabori.fm' }
  }

  // 番組サイトの URL はフィードの URL と一致しないが、同じホストで配信していれば同じ番組
  it('同じホストで配信している番組を返す', () => {
    const matched = matchByHost(registered, 'https://radio.voiceofonebutton.net/')
    expect(matched.length).toBe(1)
    expect(matched[0].key).toBe('voiceofonebutton')
    expect(matched[0].matchedBy).toBe('host')
  })

  it('www の有無と http / https は同じものとして見る', () => {
    expect(matchByHost(registered, 'https://www.fukabori.fm/episode/1')[0].key).toBe('fukabori')
  })

  // anchor.fm のようなホストは、同じでも別の番組
  it('配信基盤のホストでは何も返さない', () => {
    expect(matchByHost(registered, 'https://anchor.fm/s/559fd878/podcast/rss')).toEqual([])
  })

  it('URL でなければ何も返さない', () => {
    expect(matchByHost(registered, '')).toEqual([])
    expect(matchByHost(null, 'https://fukabori.fm/')).toEqual([])
  })
})

describe('searchRegistered', () => {
  const registered = {
    noracast: { feed: 'https://noracast.jp/feed.xml', title: 'noracast' },
    fukabori: { feed: 'https://fukabori.fm/feed.xml', title: 'fukabori.fm' },
    agileradio: { feed: 'https://example.com/agile.xml', title: 'アジャイルラジオ' },
    broken: { feed: 'https://example.com/broken.xml', title: null }
  }

  // iTunes の検索に出てこない番組でも「もう載っている」ことは答えられる
  it('番組名の一部で当てる', () => {
    const matched = searchRegistered(registered, 'nora')
    expect(matched.length).toBe(1)
    expect(matched[0].key).toBe('noracast')
    expect(matched[0].matchedBy).toBe('search')
  })

  it('全角と半角、大文字小文字の違いは無視する', () => {
    expect(searchRegistered(registered, 'ＦＵＫＡＢＯＲＩ')[0].key).toBe('fukabori')
    expect(searchRegistered(registered, 'アジャイル')[0].key).toBe('agileradio')
  })

  // 番組名はフィードが落ちていると入っていない。キーでも引けるようにする
  it('番組名が無いものは、キーで当てる', () => {
    expect(searchRegistered(registered, 'broken')[0].key).toBe('broken')
  })

  // キーまで部分一致にすると、shinamonoradio が nora で当たる
  it('キーは前方一致で見る', () => {
    const keys = { noracast: { feed: 'https://noracast.jp/feed.xml', title: 'noracast' }, shinamonoradio: { feed: 'https://example.com/f.xml', title: '品モノラジオ' } }
    expect(searchRegistered(keys, 'nora').map(entry => entry.key)).toEqual(['noracast'])
  })

  it('1文字では当てない（当たりすぎる）', () => {
    expect(searchRegistered(registered, 'n')).toEqual([])
    expect(searchRegistered(registered, '')).toEqual([])
  })

  // 並べるのは小さなジャケットだけなので、当たったものは全部返す
  it('既定では件数を絞らない', () => {
    expect(searchRegistered(registered, 'or').map(entry => entry.key).sort()).toEqual(['fukabori', 'noracast'])
    expect(searchRegistered(registered, 'or', 1).length).toBe(1)
  })
})

describe('searchRegistered の並び', () => {
  // cast は31件当たる。見つけた順に10件で切ると noracast が落ちていた
  const many = {
    ForkwellTechCast: { feed: 'https://example.com/1', title: 'Forkwell Tech Cast' },
    ariel: { feed: 'https://example.com/2', title: 'ありえるえりあ » Podcast' },
    ashikagacast: { feed: 'https://example.com/3', title: 'アシカガCAST' },
    'autify-podcast': { feed: 'https://example.com/4', title: 'Autify Japan Podcast' },
    blockchainjam: { feed: 'https://example.com/5', title: 'BlockChainJam Podcast - ブロックチェーンジャム ポッドキャスト' },
    noracast: { feed: 'https://noracast.jp/feed.xml', title: 'noracast' }
  }

  it('名前が短いものを先に出す（長い名前に埋もれさせない）', () => {
    const keys = searchRegistered(many, 'cast', 3).map(entry => entry.key)
    expect(keys).toContain('noracast')
  })

  it('名前がそのものなら最初に出す', () => {
    expect(searchRegistered(many, 'noracast')[0].key).toBe('noracast')
  })
})
