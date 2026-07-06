import { apiRequest } from "@/lib/api/client"

export type HealthResponse = {
  status: "ok"
  service: string
}

export function fetchHealth() {
  return apiRequest<HealthResponse>("/api/health")
}
