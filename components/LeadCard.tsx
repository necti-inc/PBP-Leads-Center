"use client"

import { useState } from "react"
import type { FollowUpKind } from "@/lib/followups"
import type { Lead, LeadStatus } from "@/lib/types"
import { PIPELINE_STATUSES, STATUS_CONFIG } from "@/lib/types"
import { formatSourceLabel, getSourceTheme } from "@/lib/sources"
import { updateLead } from "@/lib/api"
import { formatRelativeDate, getInitials } from "@/lib/utils"
import LeadContextMenu from "./LeadContextMenu"
import LeadPrice from "./LeadPrice"
import StatusBadge from "./StatusBadge"
import { IconChevron, IconMessage, IconPhone } from "./icons"

interface LeadCardProps {
    lead: Lead
    onClick: () => void
    onStatusChange?: (lead: Lead) => void
    onDelete?: (lead: Lead) => void
    compact?: boolean
    draggable?: boolean
    isDragging?: boolean
    onDragStart?: (e: React.DragEvent) => void
    onDragEnd?: (e: React.DragEvent) => void
    alertKind?: FollowUpKind
}

export default function LeadCard({
    lead,
    onClick,
    onStatusChange,
    onDelete,
    compact = false,
    draggable = false,
    isDragging = false,
    onDragStart,
    onDragEnd,
    alertKind,
}: LeadCardProps) {
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
    const statusCfg = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new
    const phoneDigits = lead.phonenumber.replace(/\D/g, "")
    const smsBody = lead.generatedMessage
        ? `&body=${encodeURIComponent(lead.generatedMessage)}`
        : ""

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.stopPropagation()
        const status = e.target.value as LeadStatus
        if (status === lead.status) return
        try {
            const updated = await updateLead(lead.id, { status })
            onStatusChange?.(updated)
        } catch {
            /* parent can toast if needed */
        }
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (!onDelete) return
        e.preventDefault()
        e.stopPropagation()
        setMenu({ x: e.clientX, y: e.clientY })
    }

    return (
        <>
        <article
            className={`lead-card lead-card--${lead.status} ${compact ? "lead-card--compact" : ""} ${isDragging ? "lead-card--dragging" : ""} ${draggable ? "lead-card--draggable" : ""} ${alertKind ? `lead-card--alert lead-card--alert-${alertKind}` : ""}`}
            style={{
                "--status-color": statusCfg.color,
                "--status-bg": statusCfg.bg,
            } as React.CSSProperties}
            onClick={onClick}
            onContextMenu={handleContextMenu}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="lead-card__accent" aria-hidden />

            <div className="lead-card__top">
                <div
                    className="lead-avatar"
                    style={{
                        background: statusCfg.bg,
                        color: statusCfg.color,
                        borderColor: statusCfg.color,
                    }}
                >
                    {getInitials(lead.fullname)}
                </div>
                <div className="lead-card__info">
                    <div className="lead-card__name-row">
                        <h3 className="lead-card__name">{lead.fullname}</h3>
                        <div className="lead-card__name-end">
                            {alertKind && (
                                <span
                                    className={`lead-card__alert lead-card__alert--${alertKind}`}
                                    title={alertKind === "reach_out" ? "Needs outreach" : "Needs follow-up"}
                                >
                                    {alertKind === "reach_out" ? "Reach out" : "Follow up"}
                                </span>
                            )}
                            <LeadPrice lead={lead} variant="card" />
                        </div>
                    </div>
                    <p className="lead-card__meta">
                        {lead.city || "Local"}
                        {lead.projectType
                            ? ` · ${lead.projectType}`
                            : lead.fenceType
                              ? ` · ${lead.fenceType}`
                              : ""}
                    </p>
                    <p className="lead-card__date">
                        Added {formatRelativeDate(lead.createdAt)}
                        {lead.lastContactedAt && ` · Contacted ${formatRelativeDate(lead.lastContactedAt)}`}
                    </p>
                </div>
            </div>

            <div className="lead-card__footer">
                {!compact && (
                    <div className="lead-card__status" onClick={(e) => e.stopPropagation()}>
                        <select
                            className="status-select"
                            value={lead.status}
                            onChange={handleStatusChange}
                            aria-label="Change lead status"
                            style={{
                                color: statusCfg.color,
                                background: statusCfg.bg,
                                borderColor: statusCfg.color,
                            }}
                        >
                            {PIPELINE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {STATUS_CONFIG[s].label}
                                </option>
                            ))}
                        </select>
                        <IconChevron
                            className="status-select-chevron"
                            style={{ color: statusCfg.color }}
                        />
                    </div>
                )}
                {compact && <StatusBadge status={lead.status} />}
                {(() => {
                    const theme = getSourceTheme(lead.source)
                    return (
                        <span
                            className="source-pill"
                            style={{
                                background: theme.bg,
                                color: theme.color,
                                borderColor: theme.border,
                            }}
                        >
                            {formatSourceLabel(lead.source)}
                        </span>
                    )
                })()}
            </div>

            {!compact && (
                <div className="lead-card__actions" onClick={(e) => e.stopPropagation()}>
                    <a href={`tel:${phoneDigits}`} className="quick-action" title="Call">
                        <IconPhone />
                        <span>Call</span>
                    </a>
                    <a href={`sms:${phoneDigits}${smsBody}`} className="quick-action quick-action--primary" title="Text">
                        <IconMessage />
                        <span>Text</span>
                    </a>
                </div>
            )}

            {draggable && (
                <div className="lead-card__drag-hint" aria-hidden>
                    Drag to move
                </div>
            )}
        </article>

        {menu && onDelete && (
            <LeadContextMenu
                x={menu.x}
                y={menu.y}
                leadName={lead.fullname}
                onClose={() => setMenu(null)}
                onDelete={() => onDelete(lead)}
            />
        )}
        </>
    )
}
