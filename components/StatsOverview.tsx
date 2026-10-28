"use client"

import type { LeadStats } from "@/lib/types"
import { STATUS_CONFIG, PIPELINE_STATUSES } from "@/lib/types"
import { formatSourceLabel } from "@/lib/sources"

interface StatsOverviewProps {
    stats: LeadStats
    compact?: boolean
}

export default function StatsOverview({ stats, compact = false }: StatsOverviewProps) {
    const cards = [
        {
            label: "New Leads",
            value: stats.byStatus.new || 0,
            accent: STATUS_CONFIG.new.color,
            hint: "Need first contact",
        },
        {
            label: "Today",
            value: stats.today,
            accent: "#00adef",
            hint: "Submitted today",
        },
        {
            label: "This Week",
            value: stats.thisWeek,
            accent: "#2563EB",
            hint: "Last 7 days",
        },
        {
            label: "Completed",
            value: stats.byStatus.completed || 0,
            accent: STATUS_CONFIG.completed.color,
            hint: "Booked jobs",
        },
        {
            label: "Total",
            value: stats.total,
            accent: "#0f172a",
            hint: "All time",
        },
    ]

    return (
        <div className={`stats-grid ${compact ? "stats-grid--compact" : ""}`}>
            {cards.map((card) => (
                <div key={card.label} className="stat-tile">
                    <div className="stat-tile__accent" style={{ background: card.accent }} />
                    <div className="stat-tile__content">
                        <span className="stat-tile__label">{card.label}</span>
                        <span className="stat-tile__value">{card.value}</span>
                        <span className="stat-tile__hint">{card.hint}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

interface StatsViewProps {
    stats: LeadStats
}

export function StatsView({ stats }: StatsViewProps) {
    const maxStatus = Math.max(...PIPELINE_STATUSES.map((s) => stats.byStatus[s] || 0), 1)
    const maxSource = Math.max(...Object.values(stats.bySource), 1)

    return (
        <div className="stats-view">
            <div className="panel">
                <h2 className="panel__title">Pipeline breakdown</h2>
                <div className="bar-list">
                    {PIPELINE_STATUSES.map((s) => {
                        const count = stats.byStatus[s] || 0
                        const pct = (count / maxStatus) * 100
                        return (
                            <div key={s} className="bar-row">
                                <div className="bar-row__header">
                                    <span className="bar-row__label">{STATUS_CONFIG[s].label}</span>
                                    <span className="bar-row__count" style={{ color: STATUS_CONFIG[s].color }}>
                                        {count}
                                    </span>
                                </div>
                                <div className="bar-track">
                                    <div
                                        className="bar-fill"
                                        style={{ width: `${pct}%`, background: STATUS_CONFIG[s].color }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="panel">
                <h2 className="panel__title">Lead sources</h2>
                <div className="bar-list">
                    {Object.entries(stats.bySource).map(([source, count]) => {
                        const pct = (count / maxSource) * 100
                        return (
                            <div key={source} className="bar-row">
                                <div className="bar-row__header">
                                    <span className="bar-row__label">
                                        {formatSourceLabel(source)}
                                    </span>
                                    <span className="bar-row__count">{count}</span>
                                </div>
                                <div className="bar-track">
                                    <div className="bar-fill bar-fill--brand" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
