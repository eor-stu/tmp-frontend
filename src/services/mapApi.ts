const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface MapNode {
  id: string
  name: string
  description: string
}

export async function fetchNodes(): Promise<MapNode[]> {
  const res = await fetch(`${BASE_URL}/map/nodes`)
  if (!res.ok) throw new Error(`/map/nodes: ${res.status}`)
  return res.json()
}

export async function fetchCost(start: string, end: string): Promise<number | null> {
  const res = await fetch(`${BASE_URL}/map/cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end }),
  })
  if (!res.ok) throw new Error(`/map/cost: ${res.status}`)
  const data = await res.json()
  return data.cost as number | null
}
