"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { fetchOverview } from "@/lib/api"
import { IconChevron } from "./icons"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
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
const DEFAULT_WORKDAYS = [1, 2, 3]

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

function parseIso(iso: string) {
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return null
    return { year: y, month: m, day: d }
}

function weekdayFromIso(iso: string) {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d, 12).getDay()
}

function formatDisplay(iso: string) {
    const parsed = parseIso(iso)
    if (!parsed) return ""
    return new Date(parsed.year, parsed.month - 1, parsed.day, 12).toLocaleDateString(
        "en-US",
        { weekday: "short", month: "short", day: "numeric", year: "numeric" }
    )
}

type Props = {
    value: string
    onChange: (iso: string) => void
    minDate?: string
    allowPast?: boolean
    /** Match Overview greying: past, closed workdays, OOO, full days */
    respectSchedule?: boolean
}

export default function BrandDatePicker({
    value,
    onChange,
    minDate,
    allowPast = false,
    respectSchedule = true,
}: Props) {
    const rootRef = useRef<HTMLDivElement>(null)
    const today = todayIso()
    const earliest = minDate || (allowPast ? "" : today)

    const initialView = parseIso(value || today) || {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
    }

    const [open, setOpen] = useState(false)
    const [year, setYear] = useState(initialView.year)
    const [month, setMonth] = useState(initialView.month)
    const [workdays, setWorkdays] = useState<number[]>(DEFAULT_WORKDAYS)
    const [oooDates, setOooDates] = useState<Set<string>>(() => new Set())
    const [fullDates, setFullDates] = useState<Set<string>>(() => new Set())

    useEffect(() => {
        if (!open) return
        const parsed = parseIso(value || today)
        if (parsed) {
            setYear(parsed.year)
            setMonth(parsed.month)
        }
    }, [open, value, today])

    useEffect(() => {
        if (!open) return
        function onPointerDown(event: MouseEvent | TouchEvent) {
            const target = event.target as Node | null
            if (!rootRef.current || !target) return
            if (!rootRef.current.contains(target)) setOpen(false)
        }
        document.addEventListener("mousedown", onPointerDown)
        document.addEventListener("touchstart", onPointerDown)
        return () => {
            document.removeEventListener("mousedown", onPointerDown)
            document.removeEventListener("touchstart", onPointerDown)
        }
    }, [open])

    useEffect(() => {
        if (!open || !respectSchedule) return
        let cancelled = false
        fetchOverview({ year, month })
            .then((overview) => {
                if (cancelled) return
                setWorkdays(
                    overview.workdays?.length ? overview.workdays : DEFAULT_WORKDAYS
                )
                setOooDates(new Set(overview.oooDates || []))
                setFullDates(new Set(overview.fullDates || []))
            })
            .catch(() => {
                if (cancelled) return
                setWorkdays(DEFAULT_WORKDAYS)
                setOooDates(new Set())
                setFullDates(new Set())
            })
        return () => {
            cancelled = true
        }
    }, [open, respectSchedule, year, month])

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

    const dayState = (iso: string) => {
        const isPast = Boolean(earliest && iso < earliest)
        if (!respectSchedule) {
            return {
                isPast,
                isClosed: false,
                isOoo: false,
                isFull: false,
                disabled: isPast,
            }
        }
        const isClosed = !workdaySet.has(weekdayFromIso(iso))
        const isOoo = !isClosed && oooDates.has(iso)
        const isFull = !isClosed && !isOoo && fullDates.has(iso)
        return {
            isPast,
            isClosed,
            isOoo,
            isFull,
            disabled: isPast || isClosed || isOoo || isFull,
        }
    }

    return (
        <div className="brand-datepicker" ref={rootRef}>
            <button
                type="button"
                className={`brand-datepicker__trigger ${open ? "brand-datepicker__trigger--open" : ""} ${value ? "brand-datepicker__trigger--filled" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <span>{value ? formatDisplay(value) : "Select a date"}</span>
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <rect width="18" height="18" x="3" y="4" rx="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
            </button>

            {open && (
                <div className="brand-datepicker__popover" role="dialog" aria-label="Choose date">
                    <div className="brand-datepicker__header">
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => shiftMonth(-1)}
                            aria-label="Previous month"
                        >
                            <IconChevron style={{ transform: "rotate(90deg)" }} />
                        </button>
                        <strong>
                            {MONTHS[month - 1]} {year}
                        </strong>
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => shiftMonth(1)}
                            aria-label="Next month"
                        >
                            <IconChevron style={{ transform: "rotate(-90deg)" }} />
                        </button>
                    </div>

                    <div className="brand-datepicker__weekdays">
                        {WEEKDAYS.map((d, idx) => (
                            <span
                                key={d}
                                className={
                                    respectSchedule && !workdaySet.has(idx)
                                        ? "brand-datepicker__weekday--off"
                                        : ""
                                }
                            >
                                {d}
                            </span>
                        ))}
                    </div>

                    <div className="brand-datepicker__days">
                        {cells.map((cell, idx) => {
                            if (!cell.iso || cell.day == null) {
                                return (
                                    <span
                                        key={`empty-${idx}`}
                                        className="brand-datepicker__day brand-datepicker__day--empty"
                                    />
                                )
                            }
                            const selected = value === cell.iso
                            const isToday = cell.iso === today
                            const state = dayState(cell.iso)
                            return (
                                <button
                                    key={cell.iso}
                                    type="button"
                                    disabled={state.disabled}
                                    title={
                                        state.isOoo
                                            ? "Out of office"
                                            : state.isFull
                                              ? "Fully booked"
                                              : state.isClosed
                                                ? "Outside work schedule"
                                                : state.isPast
                                                  ? "Past date"
                                                  : undefined
                                    }
                                    className={[
                                        "brand-datepicker__day",
                                        selected ? "brand-datepicker__day--selected" : "",
                                        isToday ? "brand-datepicker__day--today" : "",
                                        state.isPast ? "brand-datepicker__day--past" : "",
                                        state.isClosed && !state.isPast
                                            ? "brand-datepicker__day--closed"
                                            : "",
                                        state.isOoo ? "brand-datepicker__day--ooo" : "",
                                        state.isFull ? "brand-datepicker__day--full" : "",
                                        state.disabled
                                            ? "brand-datepicker__day--disabled"
                                            : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => {
                                        onChange(cell.iso!)
                                        setOpen(false)
                                    }}
                                >
                                    <span>{cell.day}</span>
                                    {state.isOoo && !state.isPast ? (
                                        <em className="brand-datepicker__ooo">OOO</em>
                                    ) : null}
                                </button>
                            )
                        })}
                    </div>

                    {respectSchedule ? (
                        <p className="brand-datepicker__hint">
                            Past, off, and OOO days are greyed out — same as Overview.
                        </p>
                    ) : null}

                    <div className="brand-datepicker__footer">
                        <button
                            type="button"
                            className="brand-datepicker__link"
                            onClick={() => {
                                onChange("")
                                setOpen(false)
                            }}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="brand-datepicker__link brand-datepicker__link--primary"
                            disabled={dayState(today).disabled}
                            onClick={() => {
                                onChange(today)
                                setOpen(false)
                            }}
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
