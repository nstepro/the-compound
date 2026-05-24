import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { getUpdatePaths } from './update-data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('getUpdatePaths', () => {
  it('resolves parser output and public destinations', () => {
    const { sourcePath, destPath } = getUpdatePaths(__dirname)

    expect(sourcePath).toBe(
      path.join(__dirname, '../src/parser/output/compound-places.json')
    )
    expect(destPath).toBe(
      path.join(__dirname, '../public/compound-places.json')
    )
  })
})
