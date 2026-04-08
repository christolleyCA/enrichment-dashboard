const USD_TO_CAD = 1.35

export const COST_PER_ORG = {
  serpentUrl: 0.00075,            // Serper: $0.75/1K searches
  deepseekUrlValidation: 0.000050, // per org that gets validated (~25% of searched)
  serperUrl: 0.00075,             // Serper: $0.75/1K searches
  serpentNews: 0.00075,           // Serper: $0.75/1K searches
  deepseekNewsClassify: 0.000070, // per org that returned results
  serperNews: 0.00075,            // Serper: $0.75/1K searches
}

export function estimateUrlSerpentCost(searched: number, found: number): number {
  return searched * COST_PER_ORG.serpentUrl + found * COST_PER_ORG.deepseekUrlValidation
}

export function estimateUrlSerperCost(serperSearched: number): number {
  return serperSearched * COST_PER_ORG.serperUrl
}

export function estimateNewsSerpentCost(searched: number, withResults: number): number {
  return searched * COST_PER_ORG.serpentNews + withResults * COST_PER_ORG.deepseekNewsClassify
}

export function estimateNewsSerperCost(serperSearched: number): number {
  return serperSearched * COST_PER_ORG.serperNews
}

export function formatCost(usd: number): string {
  const cad = usd * USD_TO_CAD
  if (cad >= 1000) return `CA$${(cad / 1000).toFixed(1)}k`
  if (cad >= 1) return `CA$${cad.toFixed(2)}`
  return `CA$${cad.toFixed(4)}`
}
