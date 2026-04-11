import { mockDashboardData } from '../data/mockData'
import type { DashboardData } from '../types/domain'

export async function loadDashboardData(): Promise<DashboardData> {
  return mockDashboardData
}
