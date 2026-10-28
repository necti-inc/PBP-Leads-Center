"use client"

import type { FollowUpAlert } from "@/lib/followups"
import type { Lead } from "@/lib/types"
import { IconBell } from "./icons"

interface ActionAlertsProps {
    alerts: FollowUpAlert[]
    onSelect: (lead: Lead) => void
}

export default function ActionAlerts({ alerts, onSelect }: ActionAlertsProps) {
    if (alerts.length === 0) return null

    const reachCount = alerts.filter((a) => a.kind === "reach_out").length
    const followCount = alerts.filter((a) => a.kind === "follow_up").length

    return (
        <div className="action-alerts">
            <div className="action-alerts__summary">
                <span className="action-alerts__icon" aria-hidden>
                    <IconBell />
                </span>
                <div>
                    <p className="action-alerts__title">
                        {alerts.length} need{alerts.length === 1 ? "s" : ""} attention
                    </p>
                    <p className="action-alerts__meta">
                        {reachCount > 0 && `${reachCount} to reach out`}
                        {reachCount > 0 && followCount > 0 && " · "}
                        {followCount > 0 && `${followCount} to follow up`}
                    </p>
                </div>
            </div>

            <div className="action-alerts__chips">
                {alerts.map((alert) => (
                    <button
                        key={alert.id}
                        className={`action-alert action-alert--${alert.kind} action-alert--${alert.urgency}`}
                        onClick={() => onSelect(alert.lead)}
                    >
                        <span className="action-alert__dot" aria-hidden />
                        {alert.message}
                    </button>
                ))}
            </div>
        </div>
    )
}
