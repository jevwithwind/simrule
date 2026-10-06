// Rule similarity: TF-IDF cosine over normalised rule text, blended with a feature overlap score.
// Deterministic and explainable. In production this would be replaced by embeddings plus a vector store.
import { extractFeatures, type RuleFeatures } from './features';

export const SIMILARITY_WEIGHTS = { text: 0.65, features: 0.35 } as const;
export const FEATURE_WEIGHTS = { categories: 0.35, triggers: 0.45, threshold: 0.1, lookback: 0.1 } as const;

const STOPWORDS = new Set(
  'a an the of in to for or and any who whose has have had been be is are was were with within preceding years year months month by on that which not even if as at from its this their they them under than rather decline insure insurance applicant applicants deny someone anyone people person vehicle vehicles used use using uses on into more less one there those these such e.g. eg i.e. ie per whether same all being'.split(
    ' ',
  ),
);

export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  if (w.length > 3 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/licen[cs]e/g, 'licence')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

export interface SimDoc {
  id: string;
  text: string;
  categories: string[];
  kind: 'submission' | 'precedent';
}

export interface SimResult {
  id: string;
  kind: 'submission' | 'precedent';
  score: number;
  textScore: number;
  featureScore: number;
}

type Vector = Map<string, number>;

export class SimilarityIndex {
  private idf = new Map<string, number>();
  private vectors = new Map<string, Vector>();
  private features = new Map<string, RuleFeatures>();
  private docs: SimDoc[];

  constructor(docs: SimDoc[]) {
    this.docs = docs;
    const tokenized = docs.map((d) => tokenize(d.text));
    const df = new Map<string, number>();
    for (const toks of tokenized) for (const t of new Set(toks)) df.set(t, (df.get(t) ?? 0) + 1);
    const n = docs.length;
    for (const [t, f] of df) this.idf.set(t, Math.log((n + 1) / (f + 1)) + 1);
    docs.forEach((d, i) => {
      this.vectors.set(d.id, this.vectorize(tokenized[i]));
      this.features.set(d.id, extractFeatures(d.text, d.categories));
    });
  }

  private vectorize(tokens: string[]): Vector {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const v: Vector = new Map();
    let norm = 0;
    for (const [t, f] of tf) {
      const w = (f / tokens.length) * (this.idf.get(t) ?? Math.log(this.docs.length + 1) + 1);
      v.set(t, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [t, w] of v) v.set(t, w / norm);
    return v;
  }

  static cosine(a: Vector, b: Vector): number {
    let dot = 0;
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    for (const [t, w] of small) dot += w * (large.get(t) ?? 0);
    return dot;
  }

  static featureOverlap(a: RuleFeatures, b: RuleFeatures): number {
    const jaccard = <T>(x: T[], y: T[]) => {
      if (x.length === 0 && y.length === 0) return 0;
      const sx = new Set(x);
      const inter = y.filter((v) => sx.has(v)).length;
      return inter / new Set([...x, ...y]).size;
    };
    const numSim = (p: number | null, q: number | null) => {
      if (p === null && q === null) return 0.5;
      if (p === null || q === null) return 0;
      return 1 - Math.abs(p - q) / Math.max(p, q);
    };
    return (
      FEATURE_WEIGHTS.categories * jaccard(a.categories, b.categories) +
      FEATURE_WEIGHTS.triggers * jaccard(a.triggers, b.triggers) +
      FEATURE_WEIGHTS.threshold * numSim(a.threshold, b.threshold) +
      FEATURE_WEIGHTS.lookback * numSim(a.lookbackYears, b.lookbackYears)
    );
  }

  /** Score a document already in the index, or ad-hoc text, against every other document. */
  query(input: { id?: string; text: string; categories: string[] }): SimResult[] {
    const vec = input.id && this.vectors.has(input.id) ? this.vectors.get(input.id)! : this.vectorize(tokenize(input.text));
    const feat = input.id && this.features.has(input.id) ? this.features.get(input.id)! : extractFeatures(input.text, input.categories);
    return this.docs
      .filter((d) => d.id !== input.id)
      .map((d) => {
        const textScore = SimilarityIndex.cosine(vec, this.vectors.get(d.id)!);
        const featureScore = SimilarityIndex.featureOverlap(feat, this.features.get(d.id)!);
        const score = SIMILARITY_WEIGHTS.text * textScore + SIMILARITY_WEIGHTS.features * featureScore;
        return { id: d.id, kind: d.kind, score: round(score), textScore: round(textScore), featureScore: round(featureScore) };
      })
      .sort((a, b) => b.score - a.score);
  }

  getFeatures(id: string): RuleFeatures | undefined {
    return this.features.get(id);
  }
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Top-N candidates, guaranteeing at least one precedent so every rule is compared with the registry. */
export function topCandidates(results: SimResult[], n = 5): SimResult[] {
  const top = results.slice(0, n);
  if (!top.some((r) => r.kind === 'precedent')) {
    const bestPrecedent = results.find((r) => r.kind === 'precedent');
    if (bestPrecedent) top[n - 1] = bestPrecedent;
  }
  return top;
}
