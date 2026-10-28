"use client"

import { PIPELINE_STATUSES, STATUS_CONFIG } from "@/lib/types"
import type { LeadStats } from "@/lib/types"

interface StatusFilterBarProps {
    value: string
    stats: LeadStats | null
    onChange: (status: string) => void
}

export default function StatusFilterBar({ value, stats, onChange }: StatusFilterBarProps) {
    return (
        <div className="filter-section">
            <span className="filter-section__label">Status</span>
            <div className="filter-pills">
                <button
                    type="button"
                    className={`pill ${value === "all" ? "pill--active" : ""}`}
                    onClick={() => onChange("all")}
                >
                    All
                </button>
                {PIPELINE_STATUSES.map((status) => (
                    <button
                        key={status}
                        type="button"
                        className={`pill ${value === status ? "pill--active" : ""}`}
                        onClick={() => onChange(status)}
                        style={
                            value === status
                                ? {
                                      background: STATUS_CONFIG[status].bg,
                                      color: STATUS_CONFIG[status].color,
                                      borderColor: STATUS_CONFIG[status].color,
                                  }
                                : undefined
                        }
                    >
                        {STATUS_CONFIG[status].label}
                        {stats ? ` ${stats.byStatus[status] || 0}` : ""}
                    </button>
                ))}
            </div>
        </div>
    )
}
