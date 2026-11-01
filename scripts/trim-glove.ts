/**
 * Trims the GloVe 6B 50d text file down to the most common words and writes a
 * compact binary format the browser can load directly:
 *
 *   <outDir>/words.txt    one word per line, most common first
 *   <outDir>/vectors.bin  Float32 values, row i holds the vector for line i of words.txt
 *
 * Usage: node scripts/trim-glove.ts <glove.6B.50d.txt> [outDir] [wordCount]
 */
import { createReadStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const [inputPath, outDir = 'public/data', countArg = '20000'] = process.argv.slice(2)
if (!inputPath) {
  console.error('Usage: node scripts/trim-glove.ts <glove.6B.50d.txt> [outDir] [wordCount]')
  process.exit(1)
}
const maxWords = Number(countArg)

// GloVe lists words by frequency, so the first lines are the most common words.
// Skip numbers, punctuation and other tokens that aren't plain lowercase words.
const PLAIN_WORD = /^[a-z]+$/

const words: string[] = []
let vectors: Float32Array | undefined
let dim = 0

const lines = createInterface({ input: createReadStream(inputPath), crlfDelay: Infinity })
for await (const line of lines) {
  const [word, ...values] = line.split(' ')
  if (!PLAIN_WORD.test(word)) continue

  if (!vectors) {
    dim = values.length
    vectors = new Float32Array(maxWords * dim)
  }
  vectors.set(values.map(Number), words.length * dim)
  words.push(word)
  if (words.length === maxWords) break
}

if (!vectors) throw new Error(`No words found in ${inputPath}`)

// Float32Array uses the machine's byte order, which is little-endian on every
// platform the browser side will realistically run on, so it reads back as-is.
const used = vectors.subarray(0, words.length * dim)
await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'words.txt'), words.join('\n'))
await writeFile(join(outDir, 'vectors.bin'), new Uint8Array(used.buffer, 0, used.byteLength))

const megabytes = (used.byteLength / 1024 / 1024).toFixed(1)
console.log(`Wrote ${words.length} words x ${dim} dimensions (${megabytes} MB) to ${outDir}`)
