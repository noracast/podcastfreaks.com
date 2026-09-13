import { describe, it, expect, beforeEach } from 'vitest'
import { positionFor, remember, forget, STORAGE_KEY, LIMIT, HEAD, TAIL } from './resume-position.js'

// localStorage の代わり。中身をそのまま覗けるようにしておく
const makeStorage = (initial = {}) => {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v },
    removeItem: (k) => { delete data[k] }
  }
}

const stored = (storage) => JSON.parse(storage.data[STORAGE_KEY] || '{}')

const URL_A = 'https://example.com/a.mp3'
const URL_B = 'https://example.com/b.mp3'

let storage

beforeEach(() => {
  storage = makeStorage()
})

describe('positionFor', () => {
  it('覚えていなければ 0（頭から）', () => {
    expect(positionFor(URL_A, storage)).toBe(0)
  })

  it('覚えていればその秒数', () => {
    remember(URL_A, 600, 3600, storage)
    expect(positionFor(URL_A, storage)).toBe(600)
  })

  it('置き場が無くても落ちない。プライベートモードでも聴けるように', () => {
    expect(positionFor(URL_A, null)).toBe(0)
  })

  it('中身が壊れていても 0 を返す', () => {
    const broken = makeStorage({ [STORAGE_KEY]: '{壊れた' })
    expect(positionFor(URL_A, broken)).toBe(0)
    const wrongShape = makeStorage({ [STORAGE_KEY]: '[1,2,3]' })
    expect(positionFor(URL_A, wrongShape)).toBe(0)
  })
})

describe('remember', () => {
  it('頭の方（30秒未満）は覚えない。頭から聴き直せなくなるため', () => {
    remember(URL_A, HEAD - 1, 3600, storage)
    expect(positionFor(URL_A, storage)).toBe(0)
  })

  it('終わりぎわ（残り30秒未満）も覚えない。次は頭からでよい', () => {
    remember(URL_A, 3600 - (TAIL - 1), 3600, storage)
    expect(positionFor(URL_A, storage)).toBe(0)
  })

  it('終わりぎわに達したら、それまでの控えを消す', () => {
    remember(URL_A, 600, 3600, storage)
    remember(URL_A, 3599, 3600, storage)
    expect(positionFor(URL_A, storage)).toBe(0)
  })

  it('長さが分からないとき（読み込み前）でも、頭でなければ覚える', () => {
    remember(URL_A, 600, NaN, storage)
    expect(positionFor(URL_A, storage)).toBe(600)
  })

  it('回ごとに別々に覚える', () => {
    remember(URL_A, 600, 3600, storage)
    remember(URL_B, 120, 3600, storage)
    expect(positionFor(URL_A, storage)).toBe(600)
    expect(positionFor(URL_B, storage)).toBe(120)
  })

  it('増え続けないよう、古いものから捨てる', () => {
    for(let i = 0; i < LIMIT + 10; i++) remember(`https://example.com/${i}.mp3`, 100 + i, 3600, storage)
    expect(Object.keys(stored(storage))).toHaveLength(LIMIT)
    // 最後に触ったものは残っている
    expect(positionFor(`https://example.com/${LIMIT + 9}.mp3`, storage)).toBe(100 + LIMIT + 9)
  })

  it('書き込めない置き場でも落ちない（容量いっぱいのとき）', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } }
    expect(() => remember(URL_A, 600, 3600, full)).not.toThrow()
  })
})

describe('forget', () => {
  it('覚えていたものを消す', () => {
    remember(URL_A, 600, 3600, storage)
    forget(URL_A, storage)
    expect(positionFor(URL_A, storage)).toBe(0)
  })

  it('覚えていないものを消しても何も起きない', () => {
    expect(() => forget(URL_A, storage)).not.toThrow()
    expect(storage.data[STORAGE_KEY]).toBeUndefined()
  })
})
