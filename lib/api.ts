import { config } from "./config"
import type { Lead, LeadStats } from "./types"
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
