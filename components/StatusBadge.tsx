"use client"

import type { LeadStatus } from "@/lib/types"
import { STATUS_CONFIG, normalizeStatus } from "@/lib/types"

interface StatusBadgeProps {
    status: LeadStatus | string
    size?: "sm" | "md"
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
    const normalized = normalizeStatus(status)
    const cfg = STATUS_CONFIG[normalized]

    return (
        <span
            className={`status-badge status-badge--${size}`}
            style={{ color: cfg.color, background: cfg.bg }}
        >
            <span className="status-dot" style={{ background: cfg.color }} />
            {cfg.label}
        </span>
    )
}
