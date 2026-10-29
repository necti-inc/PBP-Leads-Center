export type LeadStatus =
    | "new"
    | "contacted"
    | "scheduled"
    | "completed"
    | "lost"

const LEGACY_STATUS_MAP: Record<string, LeadStatus> = {
    follow_up: "contacted",
    qualified: "contacted",
    customer_scheduled: "scheduled",
    won: "completed",
}

export const STATUS_CONFIG: Record<
    LeadStatus,
    { label: string; color: string; bg: string }
> = {
    new: { label: "New", color: "#00adef", bg: "#e6f7fd" },
    contacted: { label: "Contacted", color: "#7C3AED", bg: "#F3E8FF" },
    scheduled: { label: "Scheduled", color: "#2563EB", bg: "#DBEAFE" },
    completed: { label: "Completed", color: "#16A34A", bg: "#DCFCE7" },
    lost: { label: "Lost", color: "#6B7280", bg: "#F3F4F6" },
}

export const PIPELINE_STATUSES: LeadStatus[] = [
    "new",
    "contacted",
    "scheduled",
    "completed",
    "lost",
]

export function normalizeStatus(status?: string | null): LeadStatus {
    if (!status) return "new"
    if (status in STATUS_CONFIG) return status as LeadStatus
    return LEGACY_STATUS_MAP[status] || "new"
}

export interface LeadAttachment {
    id: string
    name: string
    contentType: string
    size?: number
    storagePath?: string
    url: string
    uploadedAt?: string | null
}

export interface Lead {
    id: string
    fullname: string
    phonenumber: string
    email: string
    homeaddress: string
    city: string
    zipcode: string
    projectType?: string
    fenceType?: string
    poolSize?: string | null
    preferredDate?: string | null
    firstName?: string | null
    lastName?: string | null
    linearFeet?: number | null
    estimate?: number | null
    /** @deprecated solar field kept for compatibility with shared UI helpers */
    price?: number
    status: LeadStatus
    priority: string
    source: string
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    notes: string
    attachments?: LeadAttachment[]
    assignedTo?: string | null
    lastContactedAt?: string | null
    generatedMessage?: string | null
    messageGeneratedAt?: string | null
    messageStatus?: string | null
    createdAt?: string | null
    updatedAt?: string | null
}

export interface LeadStats {
    total: number
    byStatus: Record<string, number>
    bySource: Record<string, number>
    sourceSummary?: Array<{ id: string; label: string; count: number }>
    today: number
    thisWeek: number
}

export type ActivityStatus = "active" | "inactive"
export type VisitStatus = "scheduled" | "completed" | "cancelled"
export type VisitFrequency = "once" | "weekly" | "biweekly" | "monthly"

export interface Customer {
    id: string
    fullname: string
    firstName?: string | null
    lastName?: string | null
    phonenumber: string
    email: string
    homeaddress: string
    city: string
    zipcode: string
    notes: string
    source: string
    activityStatus: ActivityStatus
    preferredDate?: string | null
    serviceFrequency?: VisitFrequency
    leadId?: string | null
    leadIds?: string[]
    poolSize?: string | null
    projectType?: string | null
    estimate?: number | null
    createdAt?: string | null
    updatedAt?: string | null
}

export interface Visit {
    id: string
    title: string
    date: string | null
    startHour: number
    endHour: number
    status: VisitStatus
    notes: string
    customerId?: string | null
    customerName: string
    customerAddress?: string | null
    customerPhone?: string | null
    leadId?: string | null
    source: string
    frequency?: VisitFrequency
    frequencyLabel?: string
    seriesId?: string | null
    occurrenceIndex?: number
    createdAt?: string | null
    updatedAt?: string | null
}

export interface TimeOff {
    id: string
    date: string
    allDay: boolean
    label: string
    notes: string
    createdAt?: string | null
    updatedAt?: string | null
}

export interface OverviewData {
    year: number
    month: number
    from: string
    to: string
    maxPerDay: number
    counts: Record<string, number>
    fullDates: string[]
    oooDates?: string[]
    closedWeekdays?: string[]
    workdays?: number[]
    timeOff?: TimeOff[]
    visits: Visit[]
    stats: {
        customersTotal: number
        customersActive: number
        customersInactive: number
        leadsTotal: number
        visitsThisMonth: number
    }
}

export interface WorkSchedule {
    workdays: number[]
    updatedAt?: string | null
}

export interface CustomersSummary {
    total: number
    active: number
    inactive: number
}
