import type { SeverityLevel } from '../types/domain'
import type { TicketRow } from '../types/dashboard'
import { TicketQueueView } from '../components/DashboardViews'

interface QueuePageProps {
  visibleTickets: TicketRow[]
  activeFilter: 'All' | SeverityLevel
  searchTerm: string
  isLoading: boolean
  onFilterChange: (filter: 'All' | SeverityLevel) => void
  onSearchChange: (term: string) => void
  onBeginPrep: (memberId: string) => void
}

export function QueuePage(props: QueuePageProps) {
  return <TicketQueueView {...props} />
}
