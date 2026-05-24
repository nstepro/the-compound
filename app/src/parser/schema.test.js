import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateOutput } from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('validateOutput', () => {
  it('accepts the sample places fixture', () => {
    const fixturePath = path.join(__dirname, '../../fixtures/compound-places.sample.json')
    const data = JSON.parse(readFileSync(fixturePath, 'utf8'))

    const result = validateOutput(data)

    expect(result.metadata.totalPlaces).toBe(2)
    expect(result.places).toHaveLength(2)
    expect(result.places[0].name).toBe('Harbor Grill')
  })

  it('rejects invalid place data', () => {
    expect(() =>
      validateOutput({
        metadata: {
          generatedAt: 'not-a-datetime',
          totalPlaces: 0,
          sourceDocId: 'x',
          parserVersion: '1',
        },
        places: [],
      })
    ).toThrow()
  })
})
