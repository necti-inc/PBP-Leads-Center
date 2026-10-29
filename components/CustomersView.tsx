"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createCustomer, fetchCustomers } from "@/lib/api"
import { formatSourceLabel } from "@/lib/sources"
import type { ActivityStatus, Customer, CustomersSummary } from "@/lib/types"
import { formatPhoneDisplay, formatRelativeDate, getInitials } from "@/lib/utils"
import AddressAutocomplete from "./AddressAutocomplete"
import BrandDatePicker from "./BrandDatePicker"
import CustomerDetailPage from "./CustomerDetailPage"
import { IconSearch } from "./icons"

type Props = {
    showToast: (msg: string) => void
}

const EMPTY_FORM = {
    fullname: "",
    phonenumber: "",
    email: "",
    homeaddress: "",
    city: "",
    zipcode: "",
    notes: "",
    preferredDate: "",
    activityStatus: "inactive" as ActivityStatus,
}

function formatVisitDate(iso?: string | null) {
    if (!iso) return null
    const [y, m, d] = iso.split("-").map(Number)
    if (!y || !m || !d) return iso
    return new Date(y, m - 1, d, 12).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    })
}

function syncCustomerUrl(customerId: string | null) {
    const params = new URLSearchParams(window.location.search)
    params.set("view", "customers")
    if (customerId) params.set("customer", customerId)
    else params.delete("customer")
    const qs = params.toString()
    window.history.replaceState({}, "", qs ? `/?${qs}` : "/")
}

export default function CustomersView({ showToast }: Props) {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [summary, setSummary] = useState<CustomersSummary>({
        total: 0,
        active: 0,
        inactive: 0,
    })
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all")
    const [search, setSearch] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const customerId = params.get("customer")
        if (customerId) setSelectedId(customerId)
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchCustomers({
                status: statusFilter === "all" ? undefined : statusFilter,
                search: search.trim() || undefined,
            })
            setCustomers(data.customers)
            setSummary(data.summary)
        } catch (err) {
            if (err instanceof Error && err.message === "UNAUTHORIZED") throw err
            showToast("Could not load customers")
        } finally {
            setLoading(false)
        }
    }, [statusFilter, search, showToast])

    useEffect(() => {
        if (selectedId) return
        const t = setTimeout(() => {
            load().catch(() => {})
        }, search ? 250 : 0)
        return () => clearTimeout(t)
    }, [load, search, selectedId])

    const openCustomer = (customerId: string) => {
        setSelectedId(customerId)
        syncCustomerUrl(customerId)
    }

    const closeCustomer = () => {
        setSelectedId(null)
        syncCustomerUrl(null)
        load().catch(() => {})
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.fullname.trim() || !form.phonenumber.trim()) return
        setSaving(true)
        try {
            const customer = await createCustomer({
                fullname: form.fullname.trim(),
                phonenumber: form.phonenumber.trim(),
                email: form.email.trim(),
                homeaddress: form.homeaddress.trim(),
                city: form.city.trim(),
                zipcode: form.zipcode.trim(),
                notes: form.notes.trim(),
                preferredDate: form.preferredDate || null,
                activityStatus: form.preferredDate ? "active" : form.activityStatus,
                source: "manual",
            })
            showToast(`Added ${customer.fullname.split(" ")[0]}`)
            setForm(EMPTY_FORM)
            setShowForm(false)
            openCustomer(customer.id)
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Could not add customer")
        } finally {
            setSaving(false)
        }
    }

    const filterChips = useMemo(
        () => [
            { id: "all" as const, label: "All", count: summary.total },
            { id: "active" as const, label: "Active", count: summary.active },
            { id: "inactive" as const, label: "Inactive", count: summary.inactive },
        ],
        [summary]
    )

    if (selectedId) {
        return (
            <CustomerDetailPage
                customerId={selectedId}
                showToast={showToast}
                onBack={closeCustomer}
            />
        )
    }

    return (
        <div className="customers">
            <div className="customers__stats">
                <div className="customers-stat">
                    <span className="customers-stat__label">Total</span>
                    <strong>{summary.total}</strong>
                    <span className="customers-stat__hint">In your book</span>
                </div>
                <div className="customers-stat customers-stat--active">
                    <span className="customers-stat__label">Active</span>
                    <strong>{summary.active}</strong>
                    <span className="customers-stat__hint">Scheduled or completed</span>
                </div>
                <div className="customers-stat">
                    <span className="customers-stat__label">Inactive</span>
                    <strong>{summary.inactive}</strong>
                    <span className="customers-stat__hint">No visit yet</span>
                </div>
            </div>

            <div className="customers__toolbar">
                <div className="customers__toolbar-row">
                    <div className="search-input">
                        <IconSearch />
                        <input
                            type="search"
                            placeholder="Search name, phone, city..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {!showForm && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setShowForm(true)}
                        >
                            Add customer
                        </button>
                    )}
                </div>
                <div className="customers__filters" role="tablist" aria-label="Customer status">
                    {filterChips.map((chip) => (
                        <button
                            key={chip.id}
                            type="button"
                            role="tab"
                            aria-selected={statusFilter === chip.id}
                            className={`filter-chip ${statusFilter === chip.id ? "filter-chip--active" : ""}`}
                            onClick={() => setStatusFilter(chip.id)}
                        >
                            {chip.label}
                            <span className="filter-chip__count">{chip.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {showForm && (
                <form className="customers__form" onSubmit={handleCreate}>
                    <div className="customers__form-head">
                        <div>
                            <h3>Add customer</h3>
                            <p>
                                Temporary CMS entry. A preferred visit date marks them active.
                            </p>
                        </div>
                    </div>
                    <div className="customers__form-grid">
                        <label>
                            Full name
                            <input
                                required
                                value={form.fullname}
                                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                            />
                        </label>
                        <label>
                            Phone
                            <input
                                required
                                value={form.phonenumber}
                                onChange={(e) => setForm({ ...form, phonenumber: e.target.value })}
                            />
                        </label>
                        <label>
                            Email
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </label>
                        <div className="customers__form-field">
                            <span className="customers__form-label">Preferred visit</span>
                            <BrandDatePicker
                                value={form.preferredDate}
                                onChange={(preferredDate) =>
                                    setForm({ ...form, preferredDate })
                                }
                            />
                        </div>
                        <label className="customers__form-span">
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
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                        </label>
                        <label>
                            ZIP
                            <input
                                value={form.zipcode}
                                onChange={(e) => setForm({ ...form, zipcode: e.target.value })}
                            />
                        </label>
                        <label className="customers__form-span">
                            Notes
                            <textarea
                                rows={2}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            />
                        </label>
                    </div>
                    <div className="customers__form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                                setShowForm(false)
                                setForm(EMPTY_FORM)
                            }}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? "Saving…" : "Save customer"}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading customers...</p>
                </div>
            ) : customers.length === 0 ? (
                <div className="customers-empty">
                    <div className="customers-empty__badge">Customers</div>
                    <h3>No customers yet</h3>
                    <p>
                        Quote form submissions show up here automatically. Add someone manually
                        anytime while the full CMS is still coming together.
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowForm(true)}
                    >
                        Add customer
                    </button>
                </div>
            ) : (
                <div className="customers-table-wrap">
                    <table className="customers-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Phone</th>
                                <th>Location</th>
                                <th>Source</th>
                                <th>Visit</th>
                                <th>Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => {
                                const active = customer.activityStatus === "active"
                                return (
                                    <tr
                                        key={customer.id}
                                        className="customers-table__row"
                                        onClick={() => openCustomer(customer.id)}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault()
                                                openCustomer(customer.id)
                                            }
                                        }}
                                    >
                                        <td>
                                            <div className="customers-table__customer">
                                                <span
                                                    className={`customers-table__avatar customers-table__avatar--${customer.activityStatus}`}
                                                >
                                                    {getInitials(customer.fullname || "?")}
                                                </span>
                                                <div>
                                                    <strong>{customer.fullname}</strong>
                                                    {customer.email ? (
                                                        <span>{customer.email}</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span
                                                className={`activity-pill activity-pill--${customer.activityStatus}`}
                                            >
                                                {active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="customers-table__mono">
                                                {formatPhoneDisplay(customer.phonenumber)}
                                            </span>
                                        </td>
                                        <td>{customer.city || "—"}</td>
                                        <td>
                                            <span className="customers-table__source">
                                                {formatSourceLabel(customer.source || "manual")}
                                            </span>
                                        </td>
                                        <td>
                                            {customer.preferredDate ? (
                                                <span className="customers-table__visit">
                                                    {formatVisitDate(customer.preferredDate)}
                                                </span>
                                            ) : (
                                                <span className="customers-table__muted">
                                                    Not set
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="customers-table__muted">
                                                {formatRelativeDate(
                                                    customer.updatedAt || customer.createdAt
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
