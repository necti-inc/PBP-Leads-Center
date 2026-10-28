"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { FollowUpKind } from "@/lib/followups"
import type { Lead, LeadStatus } from "@/lib/types"
import { PIPELINE_STATUSES, STATUS_CONFIG } from "@/lib/types"
import { updateLead } from "@/lib/api"
import LeadCard from "./LeadCard"

interface PipelineBoardProps {
    leads: Lead[]
    onSelect: (lead: Lead) => void
    onLeadUpdate: (lead: Lead) => void
    onLeadDelete?: (lead: Lead) => void
    showToast?: (msg: string) => void
    alertKinds?: Map<string, FollowUpKind>
}

export default function PipelineBoard({
    leads,
    onSelect,
    onLeadUpdate,
    onLeadDelete,
    showToast,
    alertKinds,
}: PipelineBoardProps) {
    const [isDesktop, setIsDesktop] = useState(false)
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
    const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const didDragRef = useRef(false)

    useEffect(() => {
        const check = () => setIsDesktop(window.innerWidth >= 768)
        check()
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])

    const handleDragStart = useCallback((leadId: string) => (e: React.DragEvent) => {
        didDragRef.current = false
        setDraggedLeadId(leadId)
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", leadId)
        if (e.currentTarget instanceof HTMLElement) {
            e.dataTransfer.setDragImage(e.currentTarget, 20, 20)
        }
    }, [])

    const handleDragEnd = useCallback(() => {
        didDragRef.current = true
        setDraggedLeadId(null)
        setDragOverStatus(null)
        window.setTimeout(() => {
            didDragRef.current = false
        }, 0)
    }, [])

    const handleSelect = useCallback(
        (lead: Lead) => {
            if (didDragRef.current) return
            onSelect(lead)
        },
        [onSelect]
    )

    const handleDragOver = useCallback((status: LeadStatus) => (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        setDragOverStatus(status)
    }, [])

    const handleDragLeave = useCallback(() => {
        setDragOverStatus(null)
    }, [])

    const handleDrop = useCallback(
        (targetStatus: LeadStatus) => async (e: React.DragEvent) => {
            e.preventDefault()
            setDragOverStatus(null)

            const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId
            if (!leadId) return

            const lead = leads.find((l) => l.id === leadId)
            if (!lead || lead.status === targetStatus) {
                setDraggedLeadId(null)
                return
            }

            setUpdatingId(leadId)
            try {
                const updated = await updateLead(leadId, { status: targetStatus })
                onLeadUpdate(updated)
                showToast?.(`Moved to ${STATUS_CONFIG[targetStatus].label}`)
            } catch {
                showToast?.("Failed to move lead")
            } finally {
                setUpdatingId(null)
                setDraggedLeadId(null)
            }
        },
        [draggedLeadId, leads, onLeadUpdate, showToast]
    )

    return (
        <div className={`kanban ${isDesktop ? "kanban--dnd" : ""}`}>
            {PIPELINE_STATUSES.map((status) => {
                const columnLeads = leads.filter((l) => l.status === status)
                const cfg = STATUS_CONFIG[status]
                const isDropTarget = dragOverStatus === status && draggedLeadId !== null

                return (
                    <div
                        key={status}
                        className={`kanban-column ${isDropTarget ? "kanban-column--drop-target" : ""}`}
                        style={{ "--column-color": cfg.color, "--column-bg": cfg.bg } as React.CSSProperties}
                        onDragOver={isDesktop ? handleDragOver(status) : undefined}
                        onDragLeave={isDesktop ? handleDragLeave : undefined}
                        onDrop={isDesktop ? handleDrop(status) : undefined}
                    >
                        <div className="kanban-column__header">
                            <span className="kanban-column__dot" style={{ background: cfg.color }} />
                            <span className="kanban-column__title">{cfg.label}</span>
                            <span
                                className="kanban-column__count"
                                style={{ color: cfg.color, background: cfg.bg }}
                            >
                                {columnLeads.length}
                            </span>
                        </div>
                        <div className="kanban-column__cards">
                            {columnLeads.length === 0 ? (
                                <p className={`kanban-empty ${isDropTarget ? "kanban-empty--active" : ""}`}>
                                    {isDropTarget ? "Drop here" : "No leads"}
                                </p>
                            ) : (
                                columnLeads.map((lead) => (
                                    <LeadCard
                                        key={lead.id}
                                        lead={lead}
                                        onClick={() => handleSelect(lead)}
                                        onStatusChange={onLeadUpdate}
                                        onDelete={onLeadDelete}
                                        compact
                                        draggable={isDesktop}
                                        isDragging={draggedLeadId === lead.id}
                                        onDragStart={handleDragStart(lead.id)}
                                        onDragEnd={handleDragEnd}
                                        alertKind={alertKinds?.get(lead.id)}
                                    />
                                ))
                            )}
                            {updatingId && columnLeads.some((l) => l.id === updatingId) === false && isDropTarget && (
                                <div className="kanban-drop-placeholder">Drop to move here</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
