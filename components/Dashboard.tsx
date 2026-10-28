"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fetchLeads, fetchLead, fetchStats, deleteLead, isAuthenticated, logout } from "@/lib/api"
import { config } from "@/lib/config"
import { getFollowUpAlerts } from "@/lib/followups"
import type { Lead, LeadStats } from "@/lib/types"
import { buildSourceFilterOptions, getActiveSourceLabel } from "@/lib/sources"
import { filterLeads } from "@/lib/leads"
import ActionAlerts from "./ActionAlerts"
import Login from "./Login"
import LeadCard from "./LeadCard"
import LeadDetail from "./LeadDetail"
import PipelineBoard from "./PipelineBoard"
import SourceFilterBar from "./SourceFilterBar"
import StatsOverview, { StatsView } from "./StatsOverview"
import StatusFilterBar from "./StatusFilterBar"
import {
    IconLeads,
    IconList,
    IconLogout,
    IconPipeline,
    IconSearch,
    IconStats,
} from "./icons"

type View = "leads" | "stats"
type LeadsLayout = "pipeline" | "list"

const LAYOUT_KEY = "pbp_leads_layout"
const SOURCE_FILTER_KEY = "pbp_source_filter"

const NAV_ITEMS: { id: View; label: string; Icon: typeof IconLeads }[] = [
    { id: "leads", label: "Leads", Icon: IconLeads },
    { id: "stats", label: "Analytics", Icon: IconStats },
]

export default function Dashboard() {
    const [authed, setAuthed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [view, setView] = useState<View>("leads")
    const [leadsLayout, setLeadsLayout] = useState<LeadsLayout>("list")
    const [layoutReady, setLayoutReady] = useState(false)
    const [leads, setLeads] = useState<Lead[]>([])
    const [stats, setStats] = useState<LeadStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("all")
    const [sourceFilter, setSourceFilter] = useState("all")
    const [search, setSearch] = useState("")
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [toast, setToast] = useState("")
    const [isMobile, setIsMobile] = useState(false)
    const pendingLeadIdRef = useRef<string | null>(null)

    useEffect(() => {
        setMounted(true)
        setAuthed(isAuthenticated())

        const leadId = new URLSearchParams(window.location.search).get("lead")
        if (leadId) pendingLeadIdRef.current = leadId

        const saved = localStorage.getItem(LAYOUT_KEY) as LeadsLayout | null
        if (saved === "pipeline" || saved === "list") {
            setLeadsLayout(saved)
        } else {
            setLeadsLayout(window.innerWidth >= 768 ? "pipeline" : "list")
        }
        setLayoutReady(true)

        const savedSource = localStorage.getItem(SOURCE_FILTER_KEY)
        if (savedSource) setSourceFilter(savedSource)

        const onResize = () => setIsMobile(window.innerWidth < 768)
        onResize()
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])

    const showToast = useCallback((msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(""), 2800)
    }, [])

    const loadData = useCallback(async (options?: { silent?: boolean }) => {
        if (!options?.silent) setLoading(true)
        try {
            const [leadsData, statsData] = await Promise.all([fetchLeads(), fetchStats()])
            setLeads(leadsData)
            setStats(statsData)
        } catch (err) {
            if (err instanceof Error && err.message === "UNAUTHORIZED") {
                setAuthed(false)
            }
        } finally {
            if (!options?.silent) setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (authed && layoutReady) loadData()
    }, [authed, layoutReady, loadData])


    useEffect(() => {
        if (!authed) return
        const interval = setInterval(() => loadData({ silent: true }), 30000)
        return () => clearInterval(interval)
    }, [authed, loadData])

    useEffect(() => {
        if (!authed || !layoutReady || loading) return

        const leadId = pendingLeadIdRef.current
        if (!leadId) return

        const openLeadFromLink = async () => {
            pendingLeadIdRef.current = null
            setView("leads")

            const existing = leads.find((lead) => lead.id === leadId)
            if (existing) {
                setSelectedLead(existing)
            } else {
                try {
                    const lead = await fetchLead(leadId)
                    setSelectedLead(lead)
                    setLeads((prev) =>
                        prev.some((item) => item.id === lead.id) ? prev : [lead, ...prev]
                    )
                } catch {
                    showToast("Could not open that lead")
                }
            }

            window.history.replaceState({}, "", window.location.pathname)
        }

        openLeadFromLink()
    }, [authed, layoutReady, loading, leads, showToast])

    const handleLeadUpdate = (updated: Lead) => {
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        if (selectedLead?.id === updated.id) setSelectedLead(updated)
        fetchStats().then(setStats).catch(() => {})
        showToast(`Updated ${updated.fullname.split(" ")[0]}`)
    }

    const handleLeadDelete = useCallback(
        async (lead: Lead) => {
            const firstName = lead.fullname.split(" ")[0]
            if (
                !window.confirm(
                    `Delete ${lead.fullname}? This permanently removes them from your leads.`
                )
            ) {
                return
            }

            try {
                await deleteLead(lead.id)
                setLeads((prev) => prev.filter((l) => l.id !== lead.id))
                if (selectedLead?.id === lead.id) setSelectedLead(null)
                fetchStats().then(setStats).catch(() => {})
                showToast(`Deleted ${firstName}`)
            } catch {
                showToast("Failed to delete lead")
            }
        },
        [selectedLead, showToast]
    )

    const filteredLeads = useMemo(
        () =>
            filterLeads(leads, {
                statusFilter,
                sourceFilter,
                search,
            }),
        [leads, statusFilter, sourceFilter, search]
    )

    const followUpAlerts = useMemo(() => getFollowUpAlerts(leads), [leads])
    const alertKinds = useMemo(
        () => new Map(followUpAlerts.map((a) => [a.lead.id, a.kind])),
        [followUpAlerts]
    )
    const alertCount = followUpAlerts.length
    const effectiveLayout: LeadsLayout = isMobile ? "list" : leadsLayout
    const sourceFilterOptions = useMemo(
        () => buildSourceFilterOptions(stats),
        [stats]
    )
    const activeSourceLabel = getActiveSourceLabel(sourceFilter, sourceFilterOptions)

    const handleSourceFilterChange = (next: string) => {
        setSourceFilter(next)
        localStorage.setItem(SOURCE_FILTER_KEY, next)
    }

    const leadsFilters = (
        <>
            <SourceFilterBar
                options={sourceFilterOptions}
                value={sourceFilter}
                onChange={handleSourceFilterChange}
            />
            {(isMobile || effectiveLayout === "list") && (
                <StatusFilterBar
                    value={statusFilter}
                    stats={stats}
                    onChange={setStatusFilter}
                />
            )}
        </>
    )

    if (!mounted) {
        return (
            <div className="app-loading">
                <div className="spinner" />
            </div>
        )
    }
    if (!authed) return <Login onLogin={() => setAuthed(true)} />

    const newCount = stats?.byStatus.new || 0
    const badgeCount = Math.max(newCount, alertCount)

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar__brand">
                    <div className="sidebar__logo">
                        <Image
                            src="/logo-transparent.png"
                            alt={config.appName}
                            fill
                            style={{ objectFit: "contain", objectPosition: "left center" }}
                            sizes="118px"
                            priority
                        />
                    </div>
                    <div>
                        <div className="sidebar__tag">{config.appSubtitle}</div>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    {NAV_ITEMS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            className={`sidebar__link ${view === id ? "sidebar__link--active" : ""}`}
                            onClick={() => setView(id)}
                        >
                            <Icon />
                            <span>{label}</span>
                            {id === "leads" && badgeCount > 0 && (
                                <span className="sidebar__badge">{badgeCount}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <button
                    className="sidebar__logout"
                    onClick={() => {
                        logout()
                        setAuthed(false)
                    }}
                >
                    <IconLogout />
                    Sign out
                </button>
            </aside>

            <div className="main">
                <header className="topbar">
                    <div className="topbar__left">
                        {isMobile && (
                            <div className="topbar__mobile-brand">
                                <Image
                                    src="/logo-transparent.png"
                                    alt={config.appName}
                                    fill
                                    style={{ objectFit: "contain", objectPosition: "left center" }}
                                    sizes="88px"
                                />
                            </div>
                        )}
                        <h1 className="topbar__title">
                            {isMobile
                                ? config.appSubtitle
                                : view === "leads"
                                  ? "Leads"
                                  : "Analytics"}
                        </h1>
                        {stats && view === "leads" && (
                            <p className="topbar__subtitle">
                                {stats.total} total · {stats.today} today
                                {activeSourceLabel ? ` · ${activeSourceLabel} only` : ""}
                                {alertCount > 0 && ` · ${alertCount} need attention`}
                            </p>
                        )}
                        {view === "stats" && (
                            <p className="topbar__subtitle">Pipeline & source breakdown</p>
                        )}
                    </div>
                    <div className="topbar__actions">
                        {view === "leads" && !isMobile && (
                            <div className="view-toggle">
                                <button
                                    className={`view-toggle__btn ${leadsLayout === "pipeline" ? "view-toggle__btn--active" : ""}`}
                                    onClick={() => {
                                        setLeadsLayout("pipeline")
                                        localStorage.setItem(LAYOUT_KEY, "pipeline")
                                    }}
                                    title="Pipeline view"
                                >
                                    <IconPipeline />
                                    <span>Board</span>
                                </button>
                                <button
                                    className={`view-toggle__btn ${leadsLayout === "list" ? "view-toggle__btn--active" : ""}`}
                                    onClick={() => {
                                        setLeadsLayout("list")
                                        localStorage.setItem(LAYOUT_KEY, "list")
                                    }}
                                    title="List view"
                                >
                                    <IconList />
                                    <span>List</span>
                                </button>
                            </div>
                        )}
                        <button
                            className="topbar__refresh btn-ghost"
                            onClick={() => loadData()}
                            disabled={loading}
                            aria-label={loading ? "Refreshing" : "Refresh leads"}
                        >
                            {loading ? "…" : isMobile ? "↻" : "Refresh"}
                        </button>
                        {isMobile && (
                            <button
                                className="topbar__logout-btn icon-btn"
                                onClick={() => {
                                    logout()
                                    setAuthed(false)
                                }}
                                aria-label="Sign out"
                            >
                                <IconLogout />
                            </button>
                        )}
                    </div>
                </header>

                {view === "leads" && (
                    <ActionAlerts
                        alerts={followUpAlerts}
                        onSelect={setSelectedLead}
                    />
                )}

                <div className={`content ${view === "leads" && effectiveLayout === "pipeline" ? "content--wide" : ""}`}>
                    {stats && view === "leads" && (
                        <StatsOverview stats={stats} compact={effectiveLayout === "pipeline"} />
                    )}

                    {view === "stats" ? (
                        stats ? (
                            <StatsView stats={stats} />
                        ) : (
                            <div className="loading-state">
                                <div className="spinner" />
                            </div>
                        )
                    ) : effectiveLayout === "pipeline" ? (
                        loading ? (
                            <div className="loading-state">
                                <div className="spinner" />
                                <p>Loading pipeline...</p>
                            </div>
                        ) : (
                            <>
                                <div className="toolbar toolbar--pipeline">
                                    <div className="search-input">
                                        <IconSearch />
                                        <input
                                            type="search"
                                            placeholder="Search leads..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="leads-controls leads-controls--pipeline">
                                    {leadsFilters}
                                </div>
                                <PipelineBoard
                                    leads={filteredLeads}
                                    onSelect={setSelectedLead}
                                    onLeadUpdate={handleLeadUpdate}
                                    onLeadDelete={handleLeadDelete}
                                    showToast={showToast}
                                    alertKinds={alertKinds}
                                />
                            </>
                        )
                    ) : (
                        <>
                            <div className="leads-controls">
                                <div className="toolbar">
                                    <div className="search-input">
                                        <IconSearch />
                                        <input
                                            type="search"
                                            placeholder="Search leads..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {leadsFilters}
                            </div>

                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner" />
                                    <p>Loading leads...</p>
                                </div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state__icon">☀️</div>
                                    <h3>No leads found</h3>
                                    <p>
                                        {leads.length === 0
                                            ? "New inquiries from your website will appear here."
                                            : activeSourceLabel
                                              ? `No ${activeSourceLabel.toLowerCase()} leads match your filters.`
                                              : "Try adjusting your search or filters."}
                                    </p>
                                </div>
                            ) : (
                                <div className="leads-grid">
                                    {filteredLeads.map((lead) => (
                                        <LeadCard
                                            key={lead.id}
                                            lead={lead}
                                            onClick={() => setSelectedLead(lead)}
                                            onStatusChange={handleLeadUpdate}
                                            onDelete={handleLeadDelete}
                                            alertKind={followUpAlerts.find((a) => a.lead.id === lead.id)?.kind}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <nav className="mobile-nav">
                {NAV_ITEMS.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        className={`mobile-nav__item ${view === id ? "mobile-nav__item--active" : ""}`}
                        onClick={() => setView(id)}
                    >
                        <Icon />
                        <span>{label}</span>
                        {id === "leads" && badgeCount > 0 && (
                            <span className="mobile-nav__badge">{badgeCount}</span>
                        )}
                    </button>
                ))}
            </nav>

            {selectedLead && (
                <LeadDetail
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUpdate={handleLeadUpdate}
                    showToast={showToast}
                />
            )}

            {toast && <div className="toast">{toast}</div>}
        </div>
    )
}
