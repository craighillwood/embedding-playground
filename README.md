# Embedding Playground

Explore how a language model "sees" words. Type a word and see its nearest neighbours, compare two words, do word arithmetic like **king - man + woman = queen**, and watch it all on a 2D map.

**Try it live: [embedding-playground.pages.dev](https://embedding-playground.pages.dev/)**

It runs entirely in the browser using 20,000 real word vectors from [GloVe](https://nlp.stanford.edu/projects/glove/). There's no backend and no ML or math library: the vector math, the nearest-neighbour search and the 2D map are plain TypeScript loops (under 300 lines, with comments), so you can read exactly what's going on.

## How it works

### Embeddings: words as points in space

A model can't do math on the word "king", so it turns each word into a list of numbers called an **embedding** (or vector). Here every word is 50 numbers. You can think of it as a position in a 50-dimensional space.

Nobody picks these numbers by hand. GloVe learned them from 6 billion words of Wikipedia and news text, nudging words that appear in similar contexts towards similar positions. "Coffee" and "tea" show up next to "cup", "drink" and "morning", so they end up close together. The individual numbers don't mean anything on their own, but the directions between words often do.

The Nearest neighbours panel shows a word's 50 numbers as a coloured strip, so you can see what the model actually works with.

### Cosine similarity: how close are two words?

To compare two words we look at the **angle** between their vectors, not the distance:

```
cosine(a, b) = (a · b) / (|a| × |b|)
```

The dot product `a · b` multiplies the vectors number by number and adds it all up. Dividing by the two lengths removes the effect of how big the numbers are, leaving only the direction. The result is 1 when the vectors point the same way, 0 when they're unrelated, and -1 when they point in opposite directions. "cat" and "dog" score about 0.92.

### Nearest neighbours: one function for everything

[`nearestNeighbours`](src/lib/vectors.ts) takes any point in the space, compares it against all 20,000 words with cosine similarity, and keeps the best 10. Each comparison is three dot products of 50 numbers (one for `a · b` and one for each length), so that's a brute-force scan of about three million multiplications. It still takes only a few milliseconds, so it reruns on every keystroke.

Every feature is that one function pointed at a different spot:

- **Nearest neighbours**: the point is the word's own vector.
- **Compare**: "closest to both" is the point halfway between the two words.
- **Word arithmetic**: the point is the result of the sum.

Real systems with millions of vectors use special indexes that check only a fraction of them, trading a little accuracy for speed, but the idea is the same.

### Analogies: word arithmetic

If the vectors capture meaning, the direction from "man" to "woman" should be roughly the same as the direction from "king" to "queen". So:

```
king - man + woman ≈ queen
```

[`solveExpression`](src/lib/analogy.ts) scales each word's vector to length 1 (so every word gets an equal say, however long its vector is), adds and subtracts them, and asks for the nearest neighbours of the result. It leaves out the words you typed, because the answer is usually still closest to "king" itself. That small detail is a well-known caveat of the famous demo.

Some analogies work well (paris - france + italy = rome), some are close (bigger - big + small gives "larger" just above "smaller"), and some reveal the biases in the training text. Try your own.

### The map: drawing 50 dimensions in 2

We can't draw 50 dimensions, so the map uses **principal component analysis (PCA)** ([`src/lib/pca.ts`](src/lib/pca.ts)). It finds the two directions in which the words are most spread out, and places each word by how far along each of those directions it sits. It's a flattened shadow of the real space, so it's only a rough guide. The "Fit to these" toggle recomputes it from just the highlighted words, which spreads them out.

The map is a visual aid, not the core of the project, and I haven't dug into how PCA finds those directions.

### How this relates to LLMs

Models like GPT and Claude start the same way: every token is looked up in an embedding table and becomes a vector. The difference is what happens next. GloVe gives each word a single fixed vector, so "bank" means the same thing next to "river" and next to "money". A transformer passes the vectors through many attention layers that mix in information from the surrounding text, so each token's vector ends up reflecting its context. Embedding-based search (like "find documents similar to this question") uses the same cosine similarity and nearest-neighbour idea as this playground.

## Running it

Requires Node 22.18+ (the data script runs TypeScript directly).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other commands:

```bash
npm test        # unit tests, including king - man + woman = queen on the real vectors
npm run build   # type-check and build the static site into dist/
```

### Regenerating the data

The trimmed vectors are committed in [`public/data`](public/data), so you don't need this unless you want a different vocabulary size.

1. Download `glove.6B.zip` from the [GloVe site](https://nlp.stanford.edu/projects/glove/) (about 800 MB) and extract `glove.6B.50d.txt` into `data/raw/` (git-ignored).
2. Run `npm run prepare-data`.

[`scripts/trim-glove.ts`](scripts/trim-glove.ts) keeps the 20,000 most common plain lowercase words (GloVe already lists words by frequency) and writes two files:

- `words.txt`: one word per line.
- `vectors.bin`: all the vectors as raw 32-bit floats, back to back. Row `i` is the vector for line `i`.

That's 3.8 MB, and the browser can load it straight into a `Float32Array` with no parsing. The same numbers as text or JSON take more than twice the space and have to be parsed first.

## Project structure

```
src/lib/vectors.ts         dot product, cosine similarity, nearest neighbours
src/lib/analogy.ts         parsing and solving "a - b + c"
src/lib/pca.ts             PCA for the 2D map
src/lib/loadEmbeddings.ts  fetches the binary data
src/components/            React UI: the three panels and the SVG map
scripts/trim-glove.ts      turns the raw GloVe file into the compact format
```

## What I learned

- **An embedding is just a lookup table.** The "intelligence" is all in how the numbers were trained. Once you have them, everything here is high-school vector math.
- **Direction matters more than size.** A vector's length isn't a measure of how common a word is. The longest vectors here belong to rare junk tokens like "fdch" and "worldsources" (about 11), and the shortest to vague words like "coincidentally" and "likewise" (about 2). One intuition: a word used in many different contexts gets pulled in many directions during training, and those pulls partly cancel. Cosine similarity ignores length entirely, which is why it compares meaning better than raw distance.
- **Normalising is a safety measure, not the trick.** I compared analogies with and without scaling each word to length 1 first. For king - man + woman the two sums point less than 3° apart and both give queen, because those common words all have similar lengths (5.2 to 5.6). It would only matter when mixing words of very different lengths.
- **The famous analogy has an asterisk.** king - man + woman lands closest to "king" (0.885); "queen" (0.852) only wins once the input words are excluded.
- **Intuition about these spaces is often a bit off, so measure.** I guessed king + man would land near "prince". It gives father, son and brother.
- **Brute force is fine at this scale.** 20,000 × 50 is small enough to search on every keystroke without any clever indexing. Keeping a short sorted list of the best 10 (and skipping anything worse than the last entry) avoids sorting all 20,000 scores.
- **A flat typed array is a simple, fast data format.** All vectors live in one `Float32Array` and word `i` starts at index `i * 50`, which is easy to get off by one. `subarray` gives a view into that shared memory, not a copy, so writing to a word's vector would silently corrupt every result that uses it. That's why the code never mutates a looked-up vector and always adds into a fresh array.
## Built with AI assistance

I built this with Claude (Anthropic's AI assistant) as a pair programmer, as a way to learn LLM fundamentals hands-on after watching CJ's video *LLMs Explained: Tokens, Embeddings, Transformers and More*. I directed the scope and design, tested it in the browser, and then went through the code step by step with Claude, answering check questions, until I could explain the data format, the vector math, nearest neighbours and the analogy code line by line. Along the way that review caught and fixed a few explanations that overclaimed, like what a vector's length means.

## Licence and credits

The code is released under the [MIT License](LICENSE). The word vectors in `public/data` are not covered by it: they're a trimmed copy of GloVe, which keeps its own licence below.

Word vectors: GloVe 6B 50d by Jeffrey Pennington, Richard Socher and Christopher D. Manning, 2014. [GloVe: Global Vectors for Word Representation](https://nlp.stanford.edu/pubs/glove.pdf). Released under the [Public Domain Dedication and License (PDDL)](https://opendatacommons.org/licenses/pddl/1-0/).
