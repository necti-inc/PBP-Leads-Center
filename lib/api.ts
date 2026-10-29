import { config } from "./config"
import type {
    Customer,
    CustomersSummary,
    Lead,
    LeadStats,
    OverviewData,
    TimeOff,
    Visit,
    WorkSchedule,
} from "./types"
import { normalizeStatus } from "./types"

function getApiKey(): string {
    if (typeof window === "undefined") return ""
    return localStorage.getItem(config.storageKey) || ""
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${config.apiUrl}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
            ...(options.headers || {}),
        },
    })

    if (response.status === 401) {
        localStorage.removeItem(config.storageKey)
        throw new Error("UNAUTHORIZED")
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Request failed")
    }

    return response.json()
}

export async function fetchLeads(params?: {
    status?: string
    source?: string
    search?: string
}): Promise<Lead[]> {
    const query = new URLSearchParams()
    if (params?.status) query.set("status", params.status)
    if (params?.source) query.set("source", params.source)
    if (params?.search) query.set("search", params.search)

    const qs = query.toString()
    const data = await request<{ leads: Lead[] }>(`/leads${qs ? `?${qs}` : ""}`)
    return data.leads.map((lead) => ({ ...lead, status: normalizeStatus(lead.status) }))
}

export async function fetchLead(id: string): Promise<Lead> {
    const data = await request<{ lead: Lead }>(`/leads/${id}`)
    return { ...data.lead, status: normalizeStatus(data.lead.status) }
}

export async function fetchStats(): Promise<LeadStats> {
    return request<LeadStats>("/leads/stats")
}

export type LeadUpdatePayload = Partial<
    Pick<
        Lead,
        | "status"
        | "notes"
        | "priority"
        | "assignedTo"
        | "fullname"
        | "phonenumber"
        | "email"
        | "homeaddress"
        | "city"
        | "zipcode"
        | "projectType"
        | "fenceType"
        | "linearFeet"
        | "estimate"
        | "source"
    >
> & {
    markContacted?: boolean
}

export async function updateLead(id: string, updates: LeadUpdatePayload): Promise<Lead> {
    const data = await request<{ lead: Lead }>(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    })
    return { ...data.lead, status: normalizeStatus(data.lead.status) }
}

export async function createLead(payload: LeadUpdatePayload & {
    fullname: string
    phonenumber: string
}): Promise<Lead> {
    const data = await request<{ lead: Lead }>("/leads", {
        method: "POST",
        body: JSON.stringify(payload),
    })
    return { ...data.lead, status: normalizeStatus(data.lead.status) }
}

export async function deleteLead(id: string): Promise<void> {
    await request<{ ok: boolean }>(`/leads/${id}`, { method: "DELETE" })
}

export async function regenerateMessage(
    id: string,
    status?: string
): Promise<Lead> {
    const data = await request<{ lead: Lead }>(`/leads/${id}/regenerate-message`, {
        method: "POST",
        body: JSON.stringify({ status }),
    })
    return { ...data.lead, status: normalizeStatus(data.lead.status) }
}

export async function uploadLeadAttachment(
    id: string,
    file: File
): Promise<Lead> {
    const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = String(reader.result || "")
            const base64 = result.includes(",") ? result.split(",")[1] : result
            resolve(base64)
        }
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(file)
    })

    const data = await request<{ lead: Lead }>(`/leads/${id}/attachments`, {
        method: "POST",
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            dataBase64,
        }),
    })
    return { ...data.lead, status: normalizeStatus(data.lead.status) }
}

export async function deleteLeadAttachment(
    id: string,
    attachmentId: string
): Promise<Lead> {
    const data = await request<{ lead: Lead }>(
        `/leads/${id}/attachments/${attachmentId}`,
        { method: "DELETE" }
    )
    return { ...data.lead, status: normalizeStatus(data.lead.status) }
}

export async function fetchOverview(params?: {
    year?: number
    month?: number
}): Promise<OverviewData> {
    const query = new URLSearchParams()
    if (params?.year) query.set("year", String(params.year))
    if (params?.month) query.set("month", String(params.month))
    const qs = query.toString()
    return request<OverviewData>(`/overview${qs ? `?${qs}` : ""}`)
}

export async function fetchCustomers(params?: {
    status?: string
    search?: string
    source?: string
}): Promise<{ customers: Customer[]; summary: CustomersSummary }> {
    const query = new URLSearchParams()
    if (params?.status) query.set("status", params.status)
    if (params?.search) query.set("search", params.search)
    if (params?.source) query.set("source", params.source)
    const qs = query.toString()
    return request(`/customers${qs ? `?${qs}` : ""}`)
}

export async function createCustomer(payload: {
    fullname: string
    phonenumber: string
    email?: string
    homeaddress?: string
    city?: string
    zipcode?: string
    notes?: string
    preferredDate?: string | null
    activityStatus?: "active" | "inactive"
    source?: string
    poolSize?: string
    projectType?: string
}): Promise<Customer> {
    const data = await request<{ customer: Customer }>("/customers", {
        method: "POST",
        body: JSON.stringify(payload),
    })
    return data.customer
}

export async function fetchCustomer(
    id: string
): Promise<{ customer: Customer; visits: Visit[] }> {
    return request(`/customers/${id}`)
}

export async function updateCustomer(
    id: string,
    updates: Partial<
        Pick<
            Customer,
            | "fullname"
            | "phonenumber"
            | "email"
            | "homeaddress"
            | "city"
            | "zipcode"
            | "notes"
            | "activityStatus"
            | "preferredDate"
            | "poolSize"
            | "projectType"
            | "source"
            | "estimate"
        >
    >
): Promise<Customer> {
    const data = await request<{ customer: Customer }>(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    })
    return data.customer
}

export async function deleteCustomer(
    id: string
): Promise<{ ok: boolean; id: string; visitsDeleted: number }> {
    return request(`/customers/${id}`, { method: "DELETE" })
}

export async function createVisit(payload: {
    date: string
    title?: string
    customerId?: string | null
    customerName?: string
    notes?: string
    status?: string
    frequency?: "once" | "weekly" | "biweekly" | "monthly"
    occurrences?: number
}): Promise<{ visit: Visit; visits: Visit[]; created: number; skipped: { date: string; reason: string }[]; frequency: string }> {
    const data = await request<{
        visit: Visit
        visits?: Visit[]
        created?: number
        skipped?: { date: string; reason: string }[]
        frequency?: string
    }>("/visits", {
        method: "POST",
        body: JSON.stringify(payload),
    })
    return {
        visit: data.visit,
        visits: data.visits || [data.visit],
        created: data.created ?? 1,
        skipped: data.skipped || [],
        frequency: data.frequency || payload.frequency || "once",
    }
}

export async function updateVisit(
    id: string,
    updates: Partial<
        Pick<Visit, "date" | "status" | "notes" | "title" | "startHour" | "endHour">
    >
): Promise<Visit> {
    const data = await request<{ visit: Visit }>(`/visits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    })
    return data.visit
}

export async function rescheduleVisit(
    id: string,
    payload: { date: string; scope?: "one" | "series" }
): Promise<{
    visit: Visit
    visits: Visit[]
    updated: number
    skipped: { id: string; date: string; reason: string }[]
    scope: string
}> {
    return request(`/visits/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify(payload),
    })
}

export async function createTimeOff(payload: {
    date: string
    label?: string
    notes?: string
}): Promise<TimeOff> {
    const data = await request<{ timeOff: TimeOff }>("/time-off", {
        method: "POST",
        body: JSON.stringify(payload),
    })
    return data.timeOff
}

export async function deleteTimeOff(date: string): Promise<void> {
    await request<{ ok: boolean }>(`/time-off/${date}`, { method: "DELETE" })
}

export async function fetchSchedule(): Promise<WorkSchedule> {
    return request<WorkSchedule>("/schedule")
}

export async function updateSchedule(workdays: number[]): Promise<WorkSchedule> {
    return request<WorkSchedule>("/schedule", {
        method: "PUT",
        body: JSON.stringify({ workdays }),
    })
}

export async function syncCustomersFromLeads(): Promise<{
    ok: boolean
    customersSynced: number
    visitsEnsured: number
    leads: number
}> {
    return request("/customers/sync-from-leads", { method: "POST", body: "{}" })
}

export function isAuthenticated(): boolean {
    if (typeof window === "undefined") return false
    return !!getApiKey()
}

export function login(apiKey: string): void {
    localStorage.setItem(config.storageKey, apiKey)
}

export function logout(): void {
    localStorage.removeItem(config.storageKey)
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
    const response = await fetch(`${config.apiUrl}/health`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    })
    return response.ok
}
