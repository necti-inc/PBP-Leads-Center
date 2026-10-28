import type { Lead, LeadStatus } from "./types"

export type FollowUpKind = "reach_out" | "follow_up"

export interface FollowUpAlert {
    id: string
    lead: Lead
    kind: FollowUpKind
    message: string
    urgency: "high" | "medium"
    hoursAgo: number
}

const MS_PER_HOUR = 1000 * 60 * 60

const REACH_OUT_STATUSES: LeadStatus[] = ["new"]
const FOLLOW_UP_STATUSES: LeadStatus[] = ["contacted", "scheduled"]

export const REACH_OUT_HOURS = 12
export const FOLLOW_UP_HOURS = 24

function hoursSince(date?: string | null) {
    if (!date) return 0
    const diff = Date.now() - new Date(date).getTime()
    return Math.max(0, Math.floor(diff / MS_PER_HOUR))
}

function lastActivityAt(lead: Lead) {
    return lead.lastContactedAt || lead.updatedAt || lead.createdAt
}

function formatAge(hours: number) {
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return days === 1 ? "1 day" : `${days} days`
}

export function getFollowUpAlerts(leads: Lead[]): FollowUpAlert[] {
    const alerts: FollowUpAlert[] = []

    for (const lead of leads) {
        const createdHours = hoursSince(lead.createdAt)

        if (REACH_OUT_STATUSES.includes(lead.status) && createdHours >= REACH_OUT_HOURS) {
            alerts.push({
                id: `${lead.id}-reach`,
                lead,
                kind: "reach_out",
                message: `Reach out to ${lead.fullname.split(" ")[0]} — added ${formatAge(createdHours)} ago`,
                urgency: createdHours >= 48 ? "high" : "medium",
                hoursAgo: createdHours,
            })
            continue
        }

        if (FOLLOW_UP_STATUSES.includes(lead.status)) {
            const activityHours = hoursSince(lastActivityAt(lead))
            if (activityHours >= FOLLOW_UP_HOURS) {
                alerts.push({
                    id: `${lead.id}-follow`,
                    lead,
                    kind: "follow_up",
                    message: `Ping ${lead.fullname.split(" ")[0]} — no update in ${formatAge(activityHours)}`,
                    urgency: activityHours >= 72 ? "high" : "medium",
                    hoursAgo: activityHours,
                })
            }
        }
    }

    return alerts.sort((a, b) => {
        if (a.urgency !== b.urgency) return a.urgency === "high" ? -1 : 1
        return b.hoursAgo - a.hoursAgo
    })
}

export function getAlertKindForLead(
    leadId: string,
    alerts: FollowUpAlert[]
): FollowUpKind | undefined {
    return alerts.find((a) => a.lead.id === leadId)?.kind
}
