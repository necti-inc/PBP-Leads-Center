"use client"

import { useCallback, useEffect, useState } from "react"
import {
    createVisit,
    deleteCustomer,
    fetchCustomer,
    updateCustomer,
    updateVisit,
} from "@/lib/api"
import { formatSourceLabel } from "@/lib/sources"
import type { Customer, Visit, VisitFrequency, VisitStatus } from "@/lib/types"
import { formatPhoneDisplay, formatRelativeDate, getInitials } from "@/lib/utils"
import AddressAutocomplete from "./AddressAutocomplete"
import BrandDatePicker from "./BrandDatePicker"
import { IconPhone } from "./icons"

function formatVisitDate(iso?: string | null) {
    if (!iso) return "—"
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    })
}

type Props = {
    customerId: string
    showToast: (msg: string) => void
    onBack: () => void
}

export default function CustomerDetailPage({ customerId, showToast, onBack }: Props) {
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [visits, setVisits] = useState<Visit[]>([])
    const [loading, setLoading] = useState(true)
    const [savingInfo, setSavingInfo] = useState(false)
    const [scheduling, setScheduling] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const [form, setForm] = useState({
        fullname: "",
        phonenumber: "",
        email: "",
        homeaddress: "",
        city: "",
        zipcode: "",
        poolSize: "",
        estimate: "",
        notes: "",
    })
    const [visitDate, setVisitDate] = useState("")
    const [visitNotes, setVisitNotes] = useState("")
    const [visitFrequency, setVisitFrequency] = useState<VisitFrequency>("once")

    const syncForm = useCallback((c: Customer) => {
        setForm({
            fullname: c.fullname || "",
            phonenumber: c.phonenumber || "",
            email: c.email || "",
            homeaddress: c.homeaddress || "",
            city: c.city || "",
            zipcode: c.zipcode || "",
            poolSize: c.poolSize || "",
            estimate: c.estimate != null ? String(c.estimate) : "",
            notes: c.notes || "",
        })
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchCustomer(customerId)
            setCustomer(data.customer)
            setVisits(data.visits)
            syncForm(data.customer)
        } catch (err) {
            if (err instanceof Error && err.message === "UNAUTHORIZED") throw err
            showToast("Could not load customer")
        } finally {
            setLoading(false)
        }
    }, [customerId, showToast, syncForm])

    useEffect(() => {
        load().catch(() => {})
    }, [load])

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customer) return
        setSavingInfo(true)
        try {
            const estimateRaw = form.estimate.trim()
            const updated = await updateCustomer(customer.id, {
                fullname: form.fullname.trim(),
                phonenumber: form.phonenumber.trim(),
                email: form.email.trim(),
                homeaddress: form.homeaddress.trim(),
                city: form.city.trim(),
                zipcode: form.zipcode.trim(),
                poolSize: form.poolSize.trim() || null,
                estimate: estimateRaw === "" ? null : Number(estimateRaw),
                notes: form.notes.trim(),
            })
            setCustomer(updated)
            syncForm(updated)
            showToast("Customer saved")
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not save")
        } finally {
            setSavingInfo(false)
        }
    }

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!customer || !visitDate) return
        setScheduling(true)
        try {
            const result = await createVisit({
                date: visitDate,
                customerId: customer.id,
                customerName: customer.fullname,
                notes: visitNotes.trim(),
                title: `Visit — ${customer.fullname}`,
                frequency: visitFrequency,
            })
            setVisitDate("")
            setVisitNotes("")
            setVisitFrequency("once")
            if (result.created > 1) {
                const skippedNote =
                    result.skipped.length > 0
                        ? ` · ${result.skipped.length} skipped (OOO/full)`
                        : ""
                showToast(`Scheduled ${result.created} visits${skippedNote}`)
            } else {
                showToast("Visit scheduled")
            }
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not schedule")
        } finally {
            setScheduling(false)
        }
    }

    const handleVisitStatus = async (visit: Visit, status: VisitStatus) => {
        try {
            await updateVisit(visit.id, { status })
            if (status === "completed" || status === "scheduled") {
                await updateCustomer(customerId, { activityStatus: "active" })
            }
            showToast(`Visit marked ${status}`)
            await load()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not update visit")
        }
    }

    const toggleActivity = async () => {
        if (!customer) return
        const next = customer.activityStatus === "active" ? "inactive" : "active"
        try {
            const updated = await updateCustomer(customer.id, { activityStatus: next })
            setCustomer(updated)
            showToast(`Marked ${next}`)
        } catch {
            showToast("Could not update status")
        }
    }

    const handleDelete = async () => {
        if (!customer || deleting) return
        setDeleting(true)
        try {
            const result = await deleteCustomer(customer.id)
            const deletedVisits = result.visitsDeleted || 0
            setConfirmDelete(false)
            showToast(
                deletedVisits > 0
                    ? `Deleted customer + ${deletedVisits} visit${deletedVisits === 1 ? "" : "s"}`
                    : "Customer deleted"
            )
            onBack()
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not delete customer")
        } finally {
            setDeleting(false)
        }
    }

    if (loading || !customer) {
        return (
            <div className="customer-embed">
                <button type="button" className="customer-embed__back" onClick={onBack}>
                    ← Back to customers
                </button>
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading customer...</p>
                </div>
            </div>
        )
    }

    const phoneDigits = customer.phonenumber?.replace(/\D/g, "") || ""

    return (
        <div className="customer-embed">
            <button type="button" className="customer-embed__back" onClick={onBack}>
                ← Back to customers
            </button>

            <section className="customer-page__hero">
                <div className="customer-page__avatar">
                    {getInitials(customer.fullname || "?")}
                </div>
                <div className="customer-page__hero-copy">
                    <p className="customer-page__eyebrow">Customer profile</p>
                    <h1>{customer.fullname}</h1>
                    <div className="customer-page__badges">
                        <span
                            className={`activity-pill activity-pill--${customer.activityStatus}`}
                        >
                            {customer.activityStatus}
                        </span>
                        <span className="customer-page__source">
                            {formatSourceLabel(customer.source || "manual")}
                        </span>
                        <span className="customer-page__meta">
                            Added {formatRelativeDate(customer.createdAt)}
                        </span>
                    </div>
                </div>
                <div className="customer-page__hero-actions">
                    {phoneDigits && (
                        <a className="btn btn-primary" href={`tel:${phoneDigits}`}>
                            <IconPhone />
                            Call
                        </a>
                    )}
                    {customer.email && (
                        <a className="btn btn-secondary" href={`mailto:${customer.email}`}>
                            Email
                        </a>
                    )}
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={toggleActivity}
                    >
                        Mark {customer.activityStatus === "active" ? "inactive" : "active"}
                    </button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setConfirmDelete(true)}
                        disabled={deleting}
                    >
                        Delete customer
                    </button>
                </div>
            </section>

            {confirmDelete ? (
                <div
                    className="confirm-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-customer-title"
                >
                    <button
                        type="button"
                        className="confirm-modal__backdrop"
                        aria-label="Close"
                        onClick={() => {
                            if (!deleting) setConfirmDelete(false)
                        }}
                    />
                    <div className="confirm-modal__card">
                        <p className="confirm-modal__eyebrow">Delete customer</p>
                        <h2 id="delete-customer-title">
                            Delete {customer.fullname}?
                        </h2>
                        <p className="confirm-modal__copy">
                            This can’t be undone.
                            {visits.length > 0
                                ? ` It also removes ${visits.length} visit${
                                      visits.length === 1 ? "" : "s"
                                  } from the calendar.`
                                : ""}
                        </p>
                        <div className="confirm-modal__actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                            >
                                Keep customer
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? "Deleting…" : "Yes, delete"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="customer-page__grid">
                <form className="customer-panel" onSubmit={handleSaveInfo}>
                    <div className="customer-panel__head">
                        <h2>Customer information</h2>
                        <p>Contact details, pool notes, and job cost.</p>
                    </div>

                    <div className="customer-panel__grid">
                        <label>
                            Full name
                            <input
                                required
                                value={form.fullname}
                                onChange={(e) =>
                                    setForm({ ...form, fullname: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Phone
                            <input
                                required
                                value={form.phonenumber}
                                onChange={(e) =>
                                    setForm({ ...form, phonenumber: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Email
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Pool size
                            <input
                                value={form.poolSize}
                                onChange={(e) =>
                                    setForm({ ...form, poolSize: e.target.value })
                                }
                            />
                        </label>
                        <label className="customer-panel__span">
                            Address
                            <AddressAutocomplete
                                value={form.homeaddress}
                                onChange={(homeaddress) =>
                                    setForm((prev) => ({ ...prev, homeaddress }))
                                }
                                onResolved={(parsed) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        homeaddress: parsed.fullAddress,
                                        city: parsed.city,
                                        zipcode: parsed.zipcode,
                                    }))
                                }
                                placeholder=""
                            />
                        </label>
                        <label>
                            City
                            <input
                                value={form.city}
                                onChange={(e) =>
                                    setForm({ ...form, city: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            ZIP
                            <input
                                value={form.zipcode}
                                onChange={(e) =>
                                    setForm({ ...form, zipcode: e.target.value })
                                }
                            />
                        </label>
                        <label>
                            Job cost ($)
                            <input
                                inputMode="decimal"
                                value={form.estimate}
                                onChange={(e) =>
                                    setForm({ ...form, estimate: e.target.value })
                                }
                            />
                        </label>
                        <label className="customer-panel__span">
                            Notes
                            <textarea
                                rows={3}
                                value={form.notes}
                                onChange={(e) =>
                                    setForm({ ...form, notes: e.target.value })
                                }
                            />
                        </label>
                    </div>

                    <div className="customer-panel__actions">
                        <div className="customer-panel__cost-preview">
                            {form.estimate.trim() ? (
                                <>
                                    <span>Quoted</span>
                                    <strong>
                                        $
                                        {Number(form.estimate).toLocaleString("en-US", {
                                            maximumFractionDigits: 2,
                                        })}
                                    </strong>
                                </>
                            ) : (
                                <span>No cost set yet</span>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={savingInfo}
                        >
                            {savingInfo ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>

                <section className="customer-panel">
                    <div className="customer-panel__head">
                        <h2>Schedule visit</h2>
                        <p>Book a quote or service day on the in-app calendar.</p>
                    </div>

                            <form className="customer-schedule" onSubmit={handleSchedule}>
                                <div className="customer-schedule__field">
                                    <span className="customers__form-label">Visit date</span>
                                    <BrandDatePicker
                                        value={visitDate}
                                        onChange={setVisitDate}
                                    />
                                </div>
                                <label>
                                    Frequency
                                    <select
                                        value={visitFrequency}
                                        onChange={(e) =>
                                            setVisitFrequency(e.target.value as VisitFrequency)
                                        }
                                    >
                                        <option value="once">One-time visit</option>
                                        <option value="weekly">Every week (same weekday)</option>
                                        <option value="biweekly">Every 2 weeks</option>
                                        <option value="monthly">Every month</option>
                                    </select>
                                </label>
                                {visitFrequency !== "once" && visitDate ? (
                                    <p className="customer-schedule__hint">
                                        Creates about 6 months of visits on this same weekday.
                                        OOO or full days are skipped.
                                    </p>
                                ) : null}
                                <label>
                                    Visit notes
                                    <textarea
                                        rows={2}
                                        value={visitNotes}
                                        onChange={(e) => setVisitNotes(e.target.value)}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={scheduling || !visitDate}
                                >
                                    {scheduling
                                        ? "Scheduling…"
                                        : visitFrequency === "once"
                                          ? "Schedule visit"
                                          : "Schedule recurring visits"}
                                </button>
                            </form>

                    <div className="customer-visits">
                        <h3>Upcoming & past visits</h3>
                        {visits.length === 0 ? (
                            <p className="customer-visits__empty">
                                No visits yet. Pick a date above to schedule one.
                            </p>
                        ) : (
                            <ul className="customer-visits__list">
                                {visits.map((visit) => (
                                    <li key={visit.id}>
                                        <div>
                                            <strong>{formatVisitDate(visit.date)}</strong>
                                                    <span className="customer-visits__status">
                                                        {visit.status}
                                                    </span>
                                                    {visit.frequency &&
                                                    visit.frequency !== "once" ? (
                                                        <span className="customer-visits__freq">
                                                            {visit.frequencyLabel || visit.frequency}
                                                        </span>
                                                    ) : null}
                                                    {visit.notes ? <p>{visit.notes}</p> : null}
                                        </div>
                                        <div className="customer-visits__actions">
                                            {visit.status === "scheduled" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() =>
                                                            handleVisitStatus(
                                                                visit,
                                                                "completed"
                                                            )
                                                        }
                                                    >
                                                        Complete
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        onClick={() =>
                                                            handleVisitStatus(
                                                                visit,
                                                                "cancelled"
                                                            )
                                                        }
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="customer-summary-card">
                        <div>
                            <span>Preferred visit</span>
                            <strong>
                                {formatVisitDate(customer.preferredDate) === "—"
                                    ? "Not set"
                                    : formatVisitDate(customer.preferredDate)}
                            </strong>
                        </div>
                        <div>
                            <span>Phone</span>
                            <strong>
                                {formatPhoneDisplay(customer.phonenumber)}
                            </strong>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
