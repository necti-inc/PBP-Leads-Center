"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    createTimeOff,
    createVisit,
    deleteTimeOff,
    fetchCustomers,
    fetchOverview,
    rescheduleVisit,
    updateSchedule,
    updateVisit,
} from "@/lib/api"
import type { Customer, OverviewData, Visit, VisitFrequency } from "@/lib/types"
import { formatPhoneDisplay, getInitials } from "@/lib/utils"
import BrandDatePicker from "./BrandDatePicker"
import { IconChevron, IconDirections, IconSearch } from "./icons"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const WEEKDAY_OPTIONS = [
    { day: 0, label: "Sun" },
    { day: 1, label: "Mon" },
    { day: 2, label: "Tue" },
    { day: 3, label: "Wed" },
    { day: 4, label: "Thu" },
    { day: 5, label: "Fri" },
    { day: 6, label: "Sat" },
]
const DEFAULT_WORKDAYS = [1, 2, 3]
const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

function pad(n: number) {
    return String(n).padStart(2, "0")
}

function toIso(year: number, month: number, day: number) {
    return `${year}-${pad(month)}-${pad(day)}`
}

function todayIso() {
    const d = new Date()
    return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function weekdayFromIso(iso: string) {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d, 12).getDay()
}

function formatVisitDate(iso?: string | null) {
    if (!iso) return "—"
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    })
}

type Props = {
    showToast: (msg: string) => void
    onOpenCustomer?: (customerId: string) => void
}

type RescheduleState = {
    visit: Visit
    date: string
    scope: "one" | "series"
}

function directionsUrl(address: string) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export default function OverviewView({ showToast, onOpenCustomer }: Props) {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [data, setData] = useState<OverviewData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState<string | null>(() => todayIso())
    const [scheduling, setScheduling] = useState(false)
    const [customerQuery, setCustomerQuery] = useState("")
    const [customerResults, setCustomerResults] = useState<Customer[]>([])
    const [customerSearching, setCustomerSearching] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [visitNotes, setVisitNotes] = useState("")
    const [visitFrequency, setVisitFrequency] = useState<VisitFrequency>("once")
    const [saving, setSaving] = useState(false)
    const [oooBusy, setOooBusy] = useState(false)
    const [scheduleBusy, setScheduleBusy] = useState(false)
    const [reschedule, setReschedule] = useState<RescheduleState | null>(null)
    const [rescheduleBusy, setRescheduleBusy] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const overview = await fetchOverview({ year, month })
            setData(overview)
            const workdays = overview.workdays?.length
                ? overview.workdays
                : DEFAULT_WORKDAYS
            const today = todayIso()
            const viewingCurrentMonth = today.startsWith(`${year}-${pad(month)}`)

            setSelectedDate((prev) => {
                if (viewingCurrentMonth) return today

                if (
                    prev &&
                    prev.startsWith(`${year}-${pad(month)}`) &&
                    prev >= today &&
                    workdays.includes(weekdayFromIso(prev))
                ) {
                    return prev
                }

                const daysInMonth = new Date(year, month, 0).getDate()
                for (let day = 1; day <= daysInMonth; day += 1) {
                    const iso = toIso(year, month, day)
                    if (iso >= today && workdays.includes(weekdayFromIso(iso))) {
                        return iso
                    }
                }
                return prev
            })
        } catch (err) {
            if (err instanceof Error && err.message === "UNAUTHORIZED") throw err
            showToast("Could not load overview")
        } finally {
            setLoading(false)
        }
    }, [year, month, showToast])

    useEffect(() => {
        load().catch(() => {})
    }, [load])

    useEffect(() => {
        if (!scheduling) return
        const q = customerQuery.trim()
        if (q.length < 1) {
            setCustomerResults([])
            return
        }
        let cancelled = false
        setCustomerSearching(true)
        const t = setTimeout(() => {
            fetchCustomers({ search: q })
                .then((result) => {
                    if (!cancelled) setCustomerResults(result.customers.slice(0, 8))
                })
                .catch(() => {
                    if (!cancelled) setCustomerResults([])
                })
                .finally(() => {
                    if (!cancelled) setCustomerSearching(false)
                })
        }, 220)
        return () => {
            cancelled = true
            clearTimeout(t)
        }
    }, [customerQuery, scheduling])

    const workdays = useMemo(
        () => (data?.workdays?.length ? data.workdays : DEFAULT_WORKDAYS),
        [data]
    )
    const workdaySet = useMemo(() => new Set(workdays), [workdays])

    const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month])
    const startWeekday = useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month])

    const cells = useMemo(() => {
        const list: Array<{ day: number | null; iso: string | null }> = []
        for (let i = 0; i < startWeekday; i += 1) list.push({ day: null, iso: null })
        for (let day = 1; day <= daysInMonth; day += 1) {
            list.push({ day, iso: toIso(year, month, day) })
        }
        while (list.length % 7 !== 0) list.push({ day: null, iso: null })
        return list
    }, [daysInMonth, startWeekday, year, month])

    const oooSet = useMemo(
        () => new Set(data?.oooDates || data?.timeOff?.map((t) => t.date) || []),
        [data]
    )

    const selectedVisits: Visit[] = useMemo(() => {
        if (!data || !selectedDate) return []
        return data.visits.filter((v) => v.date === selectedDate && v.status !== "cancelled")
    }, [data, selectedDate])

    const today = todayIso()
    const selectedIsOoo = selectedDate ? oooSet.has(selectedDate) : false
    const selectedIsWorkday = selectedDate
        ? workdaySet.has(weekdayFromIso(selectedDate))
        : false
    const selectedIsPast = selectedDate ? selectedDate < today : false
    const selectedCanManage = Boolean(selectedDate && selectedIsWorkday && !selectedIsPast)

    const resetScheduleForm = () => {
        setScheduling(false)
        setCustomerQuery("")
        setCustomerResults([])
        setSelectedCustomer(null)
        setVisitNotes("")
        setVisitFrequency("once")
    }

    const shiftMonth = (delta: number) => {
        let nextMonth = month + delta
        let nextYear = year
        if (nextMonth < 1) {
            nextMonth = 12
            nextYear -= 1
        } else if (nextMonth > 12) {
            nextMonth = 1
            nextYear += 1
        }
        setMonth(nextMonth)
        setYear(nextYear)
    }

    const handleToggleWorkday = async (day: number) => {
        const next = workdaySet.has(day)
            ? workdays.filter((d) => d !== day)
            : [...workdays, day].sort((a, b) => a - b)

        if (next.length === 0) {
            showToast("Keep at least one work day")
            return
        }

        setScheduleBusy(true)
        try {
            await updateSchedule(next)
            showToast(next.map((d) => WEEKDAYS[d]).join(", ") + " open for booking")
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not update schedule")
        } finally {
            setScheduleBusy(false)
        }
    }

    const handleScheduleJob = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDate || !selectedCustomer) return
        if (selectedDate < todayIso()) {
            showToast("Can't schedule jobs on past days")
            return
        }
        if (!selectedIsWorkday) {
            showToast("That day is outside your work schedule")
            return
        }
        if (oooSet.has(selectedDate)) {
            showToast("That day is marked OOO — remove time off first")
            return
        }
        setSaving(true)
        try {
            const result = await createVisit({
                date: selectedDate,
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.fullname,
                notes: visitNotes.trim(),
                title: `Visit — ${selectedCustomer.fullname}`,
                frequency: visitFrequency,
            })
            if (result.created > 1) {
                const skippedNote =
                    result.skipped.length > 0
                        ? ` · ${result.skipped.length} skipped`
                        : ""
                showToast(`Scheduled ${result.created} jobs${skippedNote}`)
            } else {
                showToast(`Scheduled ${selectedCustomer.fullname.split(" ")[0]}`)
            }
            resetScheduleForm()
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not schedule job")
        } finally {
            setSaving(false)
        }
    }

    const handleToggleOoo = async () => {
        if (!selectedDate || !selectedIsWorkday || selectedDate < todayIso()) return
        setOooBusy(true)
        try {
            if (selectedIsOoo) {
                await deleteTimeOff(selectedDate)
                showToast("Time off removed — day is bookable again")
            } else {
                await createTimeOff({
                    date: selectedDate,
                    label: "OOO",
                    notes: "Out of office — all day",
                })
                showToast("Day marked OOO — customers can't book it")
                resetScheduleForm()
            }
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not update time off")
        } finally {
            setOooBusy(false)
        }
    }

    const openReschedule = (visit: Visit) => {
        setReschedule({
            visit,
            date: "",
            scope: visit.seriesId && visit.frequency && visit.frequency !== "once"
                ? "one"
                : "one",
        })
        resetScheduleForm()
    }

    const handleReschedule = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!reschedule?.date) return
        setRescheduleBusy(true)
        try {
            const result = await rescheduleVisit(reschedule.visit.id, {
                date: reschedule.date,
                scope: reschedule.scope,
            })
            const skippedNote =
                result.skipped.length > 0 ? ` · ${result.skipped.length} skipped` : ""
            showToast(
                result.updated > 1
                    ? `Moved ${result.updated} visits${skippedNote}`
                    : `Rescheduled to ${formatVisitDate(result.visit.date)}`
            )
            setReschedule(null)
            if (result.visit.date) setSelectedDate(result.visit.date)
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not reschedule")
        } finally {
            setRescheduleBusy(false)
        }
    }

    const handleCancelVisit = async (visit: Visit) => {
        const confirmed = window.confirm(
            `Cancel this job for ${visit.customerName || "this customer"} on ${formatVisitDate(visit.date)}?`
        )
        if (!confirmed) return
        try {
            await updateVisit(visit.id, { status: "cancelled" })
            showToast("Job cancelled")
            setReschedule((prev) => (prev?.visit.id === visit.id ? null : prev))
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not cancel job")
        }
    }

    const renderVisitItem = (visit: Visit, opts?: { manage?: boolean }) => {
        const canOpen = Boolean(visit.customerId && onOpenCustomer)
        const address = visit.customerAddress?.trim() || ""
        const manage = Boolean(opts?.manage)

        return (
            <li key={visit.id}>
                <div className="calendar-side__visit-top">
                    <div className="calendar-side__visit-copy">
                        {canOpen ? (
                            <button
                                type="button"
                                className="calendar-side__visit-link"
                                onClick={() => onOpenCustomer?.(visit.customerId!)}
                            >
                                {visit.customerName || visit.title}
                            </button>
                        ) : (
                            <div className="calendar-side__visit-title">
                                {visit.customerName || visit.title}
                            </div>
                        )}
                        <div className="calendar-side__visit-meta">
                            {visit.startHour}:00–{visit.endHour}:00 · {visit.status}
                            {visit.frequency && visit.frequency !== "once"
                                ? ` · ${visit.frequencyLabel || visit.frequency}`
                                : ""}
                        </div>
                        {address ? (
                            <div className="calendar-side__visit-address">{address}</div>
                        ) : null}
                    </div>
                    {address ? (
                        <a
                            className="calendar-side__dir-btn"
                            href={directionsUrl(address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Get directions"
                            aria-label={`Directions to ${visit.customerName || "customer"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <IconDirections />
                        </a>
                    ) : null}
                </div>
                {visit.notes ? (
                    <div className="calendar-side__visit-notes">{visit.notes}</div>
                ) : null}
                {manage && visit.status === "scheduled" && selectedCanManage ? (
                    <div className="calendar-side__visit-actions">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openReschedule(visit)}
                        >
                            Reschedule
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleCancelVisit(visit)}
                        >
                            Cancel job
                        </button>
                    </div>
                ) : null}
            </li>
        )
    }

    if (loading && !data) {
        return (
            <div className="loading-state">
                <div className="spinner" />
                <p>Loading overview...</p>
            </div>
        )
    }

    const stats = data?.stats
    const maxPerDay = data?.maxPerDay || 20
    const counts = data?.counts || {}
    const hasSeriesOption = Boolean(
        reschedule?.visit.seriesId &&
            reschedule.visit.frequency &&
            reschedule.visit.frequency !== "once"
    )

    return (
        <div className="overview">
            <div className="overview__stats">
                <div className="overview__stat">
                    <span className="overview__stat-label">Customers</span>
                    <strong>{stats?.customersTotal ?? 0}</strong>
                </div>
                <div className="overview__stat overview__stat--active">
                    <span className="overview__stat-label">Active</span>
                    <strong>{stats?.customersActive ?? 0}</strong>
                </div>
                <div className="overview__stat">
                    <span className="overview__stat-label">Inactive</span>
                    <strong>{stats?.customersInactive ?? 0}</strong>
                </div>
                <div className="overview__stat">
                    <span className="overview__stat-label">Visits this month</span>
                    <strong>{stats?.visitsThisMonth ?? 0}</strong>
                </div>
            </div>

            <section className="schedule-bar">
                <div className="schedule-bar__copy">
                    <strong>Work days</strong>
                    <span>Customers can only book these weekdays on the quote form.</span>
                </div>
                <div className="schedule-bar__days">
                    {WEEKDAY_OPTIONS.map(({ day, label }) => {
                        const on = workdaySet.has(day)
                        return (
                            <button
                                key={day}
                                type="button"
                                className={`schedule-day-chip ${on ? "schedule-day-chip--on" : ""}`}
                                onClick={() => handleToggleWorkday(day)}
                                disabled={scheduleBusy}
                                aria-pressed={on}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>
            </section>

            <div className="overview__grid">
                <section className="calendar-panel">
                    <div className="calendar-panel__header">
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => shiftMonth(-1)}
                            aria-label="Previous month"
                        >
                            <IconChevron style={{ transform: "rotate(90deg)" }} />
                        </button>
                        <h2>
                            {MONTHS[month - 1]} {year}
                        </h2>
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => shiftMonth(1)}
                            aria-label="Next month"
                        >
                            <IconChevron style={{ transform: "rotate(-90deg)" }} />
                        </button>
                    </div>

                    <div className="calendar-panel__weekdays">
                        {WEEKDAYS.map((d) => (
                            <div
                                key={d}
                                className={
                                    !workdaySet.has(WEEKDAYS.indexOf(d))
                                        ? "calendar-panel__weekday--off"
                                        : ""
                                }
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="calendar-panel__days">
                        {cells.map((cell, idx) => {
                            if (!cell.iso || cell.day == null) {
                                return (
                                    <div
                                        key={`empty-${idx}`}
                                        className="calendar-day calendar-day--empty"
                                    />
                                )
                            }
                            const count = counts[cell.iso] || 0
                            const isPast = cell.iso < today
                            const isWork = workdaySet.has(weekdayFromIso(cell.iso))
                            const isSelectable = isWork && !isPast
                            const isOoo = isWork && oooSet.has(cell.iso)
                            const isFull = isSelectable && !isOoo && count >= maxPerDay
                            const isSelected = selectedDate === cell.iso
                            const isToday = cell.iso === today
                            const canClick = isToday || isSelectable
                            return (
                                <button
                                    key={cell.iso}
                                    type="button"
                                    disabled={!canClick}
                                    className={[
                                        "calendar-day",
                                        isPast ? "calendar-day--past" : "",
                                        !isWork && !isPast ? "calendar-day--closed" : "",
                                        isSelected ? "calendar-day--selected" : "",
                                        isToday ? "calendar-day--today" : "",
                                        count > 0 && isWork && !isOoo
                                            ? "calendar-day--booked"
                                            : "",
                                        isFull ? "calendar-day--full" : "",
                                        isOoo ? "calendar-day--ooo" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => {
                                        if (!canClick) return
                                        setSelectedDate(cell.iso)
                                        resetScheduleForm()
                                        setReschedule(null)
                                    }}
                                >
                                    <span className="calendar-day__num">{cell.day}</span>
                                    {isWork &&
                                        !isPast &&
                                        (isOoo ? (
                                            <span className="calendar-day__ooo">OOO</span>
                                        ) : (
                                            count > 0 && (
                                                <span className="calendar-day__count">
                                                    {count}/{maxPerDay}
                                                </span>
                                            )
                                        ))}
                                </button>
                            )
                        })}
                    </div>

                    <p className="calendar-panel__hint">
                        Past and off days are greyed out. Today is selected by default.
                    </p>
                </section>

                <section className="calendar-side">
                    {!selectedDate ? (
                        <div className="calendar-side__empty">
                            Select a day to manage jobs or time off.
                        </div>
                    ) : selectedIsPast ? (
                        <div className="calendar-side__empty">
                            <strong>{selectedDate}</strong>
                            <p>
                                Past day — view only. Pick today or a future work day to
                                schedule.
                            </p>
                            {selectedVisits.length > 0 && (
                                <ul className="calendar-side__list" style={{ marginTop: 12 }}>
                                    {selectedVisits.map((visit) => renderVisitItem(visit))}
                                </ul>
                            )}
                        </div>
                    ) : !selectedIsWorkday ? (
                        <div className="calendar-side__empty">
                            <strong>
                                {selectedDate === today ? "Today" : selectedDate}
                            </strong>
                            <p>
                                Outside your work schedule. Toggle work days above to open
                                it.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="calendar-side__header">
                                <div>
                                    <h3>
                                        {selectedDate === today
                                            ? `Today · ${selectedDate}`
                                            : selectedDate}
                                    </h3>
                                    <p>
                                        {selectedIsOoo
                                            ? "Out of office · customers can't book"
                                            : `${selectedVisits.length} job${selectedVisits.length === 1 ? "" : "s"}${
                                                  counts[selectedDate]
                                                      ? ` · ${counts[selectedDate]}/${maxPerDay} booked`
                                                      : ""
                                              }`}
                                    </p>
                                </div>
                                {selectedCanManage && (
                                    <div className="calendar-side__actions">
                                        <button
                                            type="button"
                                            className={`btn-sm ${selectedIsOoo ? "btn-ghost" : "btn-ooo"}`}
                                            onClick={handleToggleOoo}
                                            disabled={oooBusy}
                                        >
                                            {oooBusy
                                                ? "…"
                                                : selectedIsOoo
                                                  ? "Remove time off"
                                                  : "Add time off"}
                                        </button>
                                        {!selectedIsOoo && (
                                            <button
                                                type="button"
                                                className="btn-primary btn-sm"
                                                onClick={() => {
                                                    setReschedule(null)
                                                    if (scheduling) resetScheduleForm()
                                                    else setScheduling(true)
                                                }}
                                            >
                                                {scheduling ? "Cancel" : "Schedule job"}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedIsOoo && (
                                <div className="calendar-side__ooo-banner">
                                    <strong>OOO all day</strong>
                                    <span>This date is blocked on the quote form.</span>
                                </div>
                            )}

                            {scheduling && selectedCanManage && !selectedIsOoo && (
                                <form
                                    className="calendar-side__form calendar-side__form--job"
                                    onSubmit={handleScheduleJob}
                                >
                                    <label className="calendar-side__label">
                                        Customer
                                        {selectedCustomer ? (
                                            <div className="calendar-customer-picked">
                                                <span className="calendar-customer-picked__avatar">
                                                    {getInitials(selectedCustomer.fullname)}
                                                </span>
                                                <div>
                                                    <strong>{selectedCustomer.fullname}</strong>
                                                    <span>
                                                        {formatPhoneDisplay(
                                                            selectedCustomer.phonenumber
                                                        )}
                                                        {selectedCustomer.city
                                                            ? ` · ${selectedCustomer.city}`
                                                            : ""}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-ghost btn-sm"
                                                    onClick={() => {
                                                        setSelectedCustomer(null)
                                                        setCustomerQuery("")
                                                    }}
                                                >
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="search-input">
                                                    <IconSearch />
                                                    <input
                                                        type="search"
                                                        placeholder="Search customers..."
                                                        value={customerQuery}
                                                        onChange={(e) =>
                                                            setCustomerQuery(e.target.value)
                                                        }
                                                        autoFocus
                                                    />
                                                </div>
                                                {customerSearching ? (
                                                    <p className="calendar-side__search-hint">
                                                        Searching…
                                                    </p>
                                                ) : customerQuery.trim() &&
                                                  customerResults.length === 0 ? (
                                                    <p className="calendar-side__search-hint">
                                                        No customers found. Add them in
                                                        Customers first.
                                                    </p>
                                                ) : customerResults.length > 0 ? (
                                                    <ul className="calendar-customer-results">
                                                        {customerResults.map((customer) => (
                                                            <li key={customer.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedCustomer(
                                                                            customer
                                                                        )
                                                                        setCustomerQuery("")
                                                                        setCustomerResults(
                                                                            []
                                                                        )
                                                                    }}
                                                                >
                                                                    <span className="calendar-customer-results__avatar">
                                                                        {getInitials(
                                                                            customer.fullname
                                                                        )}
                                                                    </span>
                                                                    <span>
                                                                        <strong>
                                                                            {customer.fullname}
                                                                        </strong>
                                                                        <em>
                                                                            {formatPhoneDisplay(
                                                                                customer.phonenumber
                                                                            )}
                                                                        </em>
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="calendar-side__search-hint">
                                                        Type a name, phone, or city.
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </label>

                                    <label className="calendar-side__label">
                                        Frequency
                                        <select
                                            value={visitFrequency}
                                            onChange={(e) =>
                                                setVisitFrequency(
                                                    e.target.value as VisitFrequency
                                                )
                                            }
                                        >
                                            <option value="once">One-time job</option>
                                            <option value="weekly">
                                                Every week (same weekday)
                                            </option>
                                            <option value="biweekly">Every 2 weeks</option>
                                            <option value="monthly">Every month</option>
                                        </select>
                                    </label>

                                    {visitFrequency !== "once" ? (
                                        <p className="calendar-side__search-hint">
                                            Creates about 6 months of jobs from this day.
                                            OOO or full days are skipped.
                                        </p>
                                    ) : null}

                                    <label className="calendar-side__label">
                                        Notes
                                        <textarea
                                            placeholder="Optional"
                                            value={visitNotes}
                                            onChange={(e) => setVisitNotes(e.target.value)}
                                            rows={2}
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={saving || !selectedCustomer}
                                    >
                                        {saving
                                            ? "Scheduling…"
                                            : visitFrequency === "once"
                                              ? "Schedule job"
                                              : "Schedule recurring jobs"}
                                    </button>
                                </form>
                            )}

                            {reschedule && (
                                <form
                                    className="calendar-side__form calendar-side__form--reschedule"
                                    onSubmit={handleReschedule}
                                >
                                    <div className="calendar-side__reschedule-head">
                                        <strong>
                                            Reschedule {reschedule.visit.customerName || "job"}
                                        </strong>
                                        <span>
                                            Currently {formatVisitDate(reschedule.visit.date)}
                                        </span>
                                    </div>

                                    <label className="calendar-side__label">
                                        New date
                                        <BrandDatePicker
                                            value={reschedule.date}
                                            onChange={(date) =>
                                                setReschedule((prev) =>
                                                    prev ? { ...prev, date } : prev
                                                )
                                            }
                                        />
                                    </label>

                                    {hasSeriesOption ? (
                                        <fieldset className="calendar-side__scope">
                                            <legend>What should move?</legend>
                                            <label
                                                className={`calendar-side__scope-option ${
                                                    reschedule.scope === "one"
                                                        ? "calendar-side__scope-option--active"
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="reschedule-scope"
                                                    checked={reschedule.scope === "one"}
                                                    onChange={() =>
                                                        setReschedule((prev) =>
                                                            prev
                                                                ? { ...prev, scope: "one" }
                                                                : prev
                                                        )
                                                    }
                                                />
                                                <span>
                                                    <strong>Just this service</strong>
                                                    <em>Only move today’s visit</em>
                                                </span>
                                            </label>
                                            <label
                                                className={`calendar-side__scope-option ${
                                                    reschedule.scope === "series"
                                                        ? "calendar-side__scope-option--active"
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="reschedule-scope"
                                                    checked={reschedule.scope === "series"}
                                                    onChange={() =>
                                                        setReschedule((prev) =>
                                                            prev
                                                                ? {
                                                                      ...prev,
                                                                      scope: "series",
                                                                  }
                                                                : prev
                                                        )
                                                    }
                                                />
                                                <span>
                                                    <strong>This and future visits</strong>
                                                    <em>Shift the whole remaining series</em>
                                                </span>
                                            </label>
                                        </fieldset>
                                    ) : null}

                                    <div className="calendar-side__reschedule-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setReschedule(null)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-sm"
                                            disabled={rescheduleBusy || !reschedule.date}
                                        >
                                            {rescheduleBusy ? "Moving…" : "Confirm move"}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {!selectedIsOoo && selectedVisits.length === 0 ? (
                                <div className="calendar-side__empty">
                                    No jobs on this day yet.
                                </div>
                            ) : !selectedIsOoo ? (
                                <ul className="calendar-side__list">
                                    {selectedVisits.map((visit) =>
                                        renderVisitItem(visit, { manage: true })
                                    )}
                                </ul>
                            ) : null}
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}
