import { describe, it, expect, afterEach, vi } from 'vitest'
import { fetchPredictions } from './noaa-client.js'

describe('fetchPredictions', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('throws on NOAA error envelope even when HTTP is 200 (§1.3)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        error: { message: ' The station is not a valid station or there is system error.' },
      }),
    })

    await expect(fetchPredictions('2026-08-01', '2026-08-31')).rejects.toThrow(
      'NOAA CO-OPS error: The station is not a valid station or there is system error.'
    )
  })

  it('returns the predictions array on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ predictions: [{ t: '2026-08-01 01:08', v: '10.087', type: 'H' }] }),
    })

    const result = await fetchPredictions('2026-08-01', '2026-08-31')
    expect(result).toEqual([{ t: '2026-08-01 01:08', v: '10.087', type: 'H' }])
  })
})
