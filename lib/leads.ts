import type { Lead } from "./types"
import { normalizeStatus } from "./types"

function normalizeSource(source?: string | null): string {
    return String(source || "website").toLowerCase()
}

export function matchesSourceFilter(lead: Lead, sourceFilter: string): boolean {
    if (!sourceFilter || sourceFilter === "all") return true
    return normalizeSource(lead.source) === sourceFilter.toLowerCase()
}

export function filterLeads(
    leads: Lead[],
    options: {
        statusFilter?: string
        sourceFilter?: string
        search?: string
    }
): Lead[] {
    const { statusFilter = "all", sourceFilter = "all", search = "" } = options
    const query = search.trim().toLowerCase()

    return leads.filter((lead) => {
        if (statusFilter !== "all" && normalizeStatus(lead.status) !== statusFilter) {
            return false
        }
        if (!matchesSourceFilter(lead, sourceFilter)) {
            return false
        }
        if (query) {
            const haystack = [
                lead.fullname,
                lead.phonenumber,
                lead.email,
                lead.city,
                lead.homeaddress,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            if (!haystack.includes(query)) return false
        }
        return true
    })
}
