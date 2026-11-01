import { createEmbeddings, type Embeddings } from './vectors.ts'

/** Fetches the files written by scripts/trim-glove.ts. */
export async function loadEmbeddings(baseUrl = import.meta.env.BASE_URL): Promise<Embeddings> {
  const [wordsResponse, vectorsResponse] = await Promise.all([
    fetch(`${baseUrl}data/words.txt`),
    fetch(`${baseUrl}data/vectors.bin`),
  ])
  if (!wordsResponse.ok || !vectorsResponse.ok) {
    throw new Error('Could not load the word vectors. Did you run `npm run prepare-data`?')
  }

  const words = (await wordsResponse.text()).split('\n')
  const vectors = new Float32Array(await vectorsResponse.arrayBuffer())
  return createEmbeddings(words, vectors)
}
