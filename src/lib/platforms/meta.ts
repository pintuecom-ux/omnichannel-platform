export const META_GRAPH_VERSION = 'v25.0'
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export function buildMetaGraphUrl(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${META_GRAPH_BASE}/${normalized}`
}
