const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface FaceUser {
  name: string
  last_clinic_id: string | null
}

export async function fetchFaceUsers(): Promise<FaceUser[]> {
  const res = await fetch(`${BASE_URL}/face/users`)
  if (!res.ok) throw new Error(`/face/users: ${res.status}`)
  return res.json()
}
