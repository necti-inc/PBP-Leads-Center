"use client"

import { useEffect, useRef, useState } from "react"
import type { Lead, LeadStatus } from "@/lib/types"
import { PIPELINE_STATUSES, STATUS_CONFIG } from "@/lib/types"
import {
    updateLead,
    regenerateMessage,
} from "@/lib/api"
import {
    ensureGoogleMapsLoaded,
    isGoogleMapsConfigured,
    parseAddressFromPlace,
    resolveAutocompletePlace,
    SOCAL_BOUNDS,
    validateParsedAddress,
} from "@/lib/googleMaps"
import { formatRelativeDate, getInitials } from "@/lib/utils"
import LeadPrice from "./LeadPrice"
import StatusBadge from "./StatusBadge"
import { IconCopy, IconMessage, IconPhone, IconRefresh, IconX } from "./icons"

interface LeadInfoForm {
    fullname: string
    phonenumber: string
    email: string
    homeaddress: string
    city: string
    zipcode: string
    projectType: string
    fenceType: string
    linearFeet: string
    estimate: string
}

function leadToInfoForm(lead: Lead): LeadInfoForm {
    return {
        fullname: lead.fullname || "",
        phonenumber: lead.phonenumber || "",
        email: lead.email || "",
        homeaddress: lead.homeaddress || "",
        city: lead.city || "",
        zipcode: lead.zipcode || "",
        projectType: lead.projectType || "",
        fenceType: lead.fenceType || "",
        linearFeet:
            lead.linearFeet != null && !Number.isNaN(Number(lead.linearFeet))
                ? String(lead.linearFeet)
                : "",
        estimate:
            lead.estimate != null
                ? String(lead.estimate)
                : lead.price != null
                  ? String(lead.price)
                  : "",
    }
}

function infoFormMatchesLead(form: LeadInfoForm, lead: Lead): boolean {
    const current = leadToInfoForm(lead)
    return (Object.keys(current) as (keyof LeadInfoForm)[]).every(
        (key) => form[key] === current[key]
    )
}

interface LeadDetailProps {
    lead: Lead
    onClose: () => void
    onUpdate: (lead: Lead) => void
    showToast: (msg: string) => void
}

export default function LeadDetail({
    lead,
    onClose,
    onUpdate,
    showToast,
}: LeadDetailProps) {
    const [notes, setNotes] = useState(lead.notes || "")
    const [infoForm, setInfoForm] = useState<LeadInfoForm>(() => leadToInfoForm(lead))
    const [saving, setSaving] = useState(false)
    const [savingInfo, setSavingInfo] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [copied, setCopied] = useState(false)
    const [addressVerified, setAddressVerified] = useState(() => !!lead.homeaddress?.trim())
    const [addressFieldError, setAddressFieldError] = useState("")
    const [mapsLoadError, setMapsLoadError] = useState("")

    const addressInputRef = useRef<HTMLInputElement>(null)
    const addressAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
    const addressSelectingRef = useRef(false)
    const addressFromListRef = useRef(!!lead.homeaddress?.trim())

    useEffect(() => {
        setNotes(lead.notes || "")
        setInfoForm(leadToInfoForm(lead))
        const hasAddress = !!lead.homeaddress?.trim()
        setAddressVerified(hasAddress)
        addressFromListRef.current = hasAddress
        setAddressFieldError("")
    }, [lead])

    useEffect(() => {
        const markAutocompleteSelecting = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement | null
            if (!target?.closest?.(".pac-container")) return
            addressSelectingRef.current = true
        }

        document.addEventListener("mousedown", markAutocompleteSelecting)
        document.addEventListener("touchstart", markAutocompleteSelecting)
        return () => {
            document.removeEventListener("mousedown", markAutocompleteSelecting)
            document.removeEventListener("touchstart", markAutocompleteSelecting)
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        if (!isGoogleMapsConfigured()) {
            setMapsLoadError("")
            return
        }

        ensureGoogleMapsLoaded()
            .then(() => {
                if (cancelled) return
                setMapsLoadError("")
                const input = addressInputRef.current
                if (!input || !window.google?.maps?.places || addressAutocompleteRef.current) {
                    return
                }

                const autocomplete = new window.google.maps.places.Autocomplete(input, {
                    componentRestrictions: { country: "us" },
                    bounds: SOCAL_BOUNDS,
                    strictBounds: true,
                    fields: ["address_components", "formatted_address", "place_id"],
                    types: ["address"],
                })
                addressAutocompleteRef.current = autocomplete

                autocomplete.addListener("place_changed", () => {
                    void (async () => {
                        addressSelectingRef.current = true
                        try {
                            const place = await resolveAutocompletePlace(
                                autocomplete.getPlace()
                            )
                            if (!place?.address_components?.length) return

                            const parsed = parseAddressFromPlace(place)
                            const validationError = validateParsedAddress(parsed)
                            if (validationError) {
                                setAddressVerified(false)
                                addressFromListRef.current = false
                                setAddressFieldError(validationError)
                                return
                            }

                            setInfoForm((prev) => ({
                                ...prev,
                                homeaddress: parsed.fullAddress,
                                city: parsed.city,
                                zipcode: parsed.zipcode,
                            }))
                            setAddressVerified(true)
                            addressFromListRef.current = true
                            setAddressFieldError("")
                        } finally {
                            window.setTimeout(() => {
                                addressSelectingRef.current = false
                            }, 0)
                        }
                    })()
                })
            })
            .catch(() => {
                if (!cancelled) {
                    setMapsLoadError(
                        "Address autocomplete is unavailable. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and allow this site in the key’s HTTP referrers."
                    )
                }
            })

        return () => {
            cancelled = true
            if (addressAutocompleteRef.current && window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(
                    addressAutocompleteRef.current
                )
                addressAutocompleteRef.current = null
            }
        }
    }, [])

    const handleStatusChange = async (status: LeadStatus) => {
        if (status === lead.status || saving) return
        setSaving(true)
        try {
            const updated = await updateLead(lead.id, { status })
            onUpdate(updated)
            showToast(`Moved to ${STATUS_CONFIG[status].label}`)
        } catch {
            showToast("Failed to update status")
        } finally {
            setSaving(false)
        }
    }

    const handleSaveNotes = async () => {
        setSaving(true)
        try {
            const updated = await updateLead(lead.id, { notes })
            onUpdate(updated)
            showToast("Notes saved")
        } catch {
            showToast("Failed to save notes")
        } finally {
            setSaving(false)
        }
    }

    const handleInfoChange =
        (field: keyof LeadInfoForm) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            setInfoForm((prev) => ({ ...prev, [field]: e.target.value }))
        }

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (addressSelectingRef.current) return

        setInfoForm((prev) => ({
            ...prev,
            homeaddress: e.target.value,
            city: "",
            zipcode: "",
        }))
        setAddressVerified(false)
        addressFromListRef.current = false
        setAddressFieldError("")
    }

    const handleSaveInfo = async () => {
        const homeTrim = infoForm.homeaddress.trim()
        const savedHome = (lead.homeaddress || "").trim()
        const addressChanged = homeTrim !== savedHome
        const estimateRaw = infoForm.estimate.trim()
        const estimate = estimateRaw ? Number(estimateRaw.replace(/[$,]/g, "")) : null
        const linearRaw = infoForm.linearFeet.trim()
        const linearFeet = linearRaw ? Number(linearRaw) : null

        if (!infoForm.fullname.trim()) {
            showToast("Name is required")
            return
        }
        if (estimateRaw && (estimate == null || Number.isNaN(estimate))) {
            showToast("Enter a valid estimate amount")
            return
        }
        if (linearRaw && (linearFeet == null || Number.isNaN(linearFeet))) {
            showToast("Enter a valid length in feet")
            return
        }
        if (
            isGoogleMapsConfigured() &&
            homeTrim &&
            addressChanged &&
            !addressFromListRef.current
        ) {
            showToast("Select the address from Google suggestions")
            setAddressFieldError("Tap the address from the Google list to confirm.")
            return
        }

        setSavingInfo(true)
        try {
            const updated = await updateLead(lead.id, {
                fullname: infoForm.fullname.trim(),
                phonenumber: infoForm.phonenumber.trim(),
                email: infoForm.email.trim(),
                homeaddress: infoForm.homeaddress.trim(),
                city: infoForm.city.trim(),
                zipcode: infoForm.zipcode.trim(),
                projectType: infoForm.projectType.trim(),
                fenceType: infoForm.fenceType.trim(),
                linearFeet,
                estimate,
            })
            onUpdate(updated)
            showToast("Lead info saved")
        } catch {
            showToast("Failed to save lead info")
        } finally {
            setSavingInfo(false)
        }
    }

    const infoDirty = !infoFormMatchesLead(infoForm, lead)

    const handleRegenerate = async () => {
        setRegenerating(true)
        try {
            const updated = await regenerateMessage(lead.id, lead.status)
            onUpdate(updated)
            showToast("New message ready")
        } catch {
            showToast("Failed to generate message")
        } finally {
            setRegenerating(false)
        }
    }

    const handleCopy = async () => {
        if (!lead.generatedMessage) return
        try {
            await navigator.clipboard.writeText(lead.generatedMessage)
            setCopied(true)
            showToast("Copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            showToast("Copy failed")
        }
    }

    const phoneDigits = lead.phonenumber.replace(/\D/g, "")
    const smsLink = `sms:${phoneDigits}${lead.generatedMessage ? `&body=${encodeURIComponent(lead.generatedMessage)}` : ""}`

    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />
            <aside className="drawer">
                <div className="drawer-handle" />

                <div className="drawer-hero">
                    <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close">
                        <IconX />
                    </button>
                    <div className="drawer-hero__profile">
                        <div className="drawer-avatar">{getInitials(lead.fullname)}</div>
                        <div>
                            <h2 className="drawer-hero__name">{lead.fullname}</h2>
                            <StatusBadge status={lead.status} size="md" />
                        </div>
                    </div>
                    <div className="drawer-hero__price">
                        <span className="drawer-hero__price-label">Estimate</span>
                        <LeadPrice lead={lead} variant="hero" />
                    </div>
                </div>

                <div className="drawer-quick-bar">
                    <a href={`tel:${phoneDigits}`} className="quick-bar-btn">
                        <IconPhone />
                        Call
                    </a>
                    <a href={smsLink} className="quick-bar-btn quick-bar-btn--primary">
                        <IconMessage />
                        Text
                    </a>
                    {lead.generatedMessage && (
                        <button
                            className={`quick-bar-btn ${copied ? "quick-bar-btn--success" : ""}`}
                            onClick={handleCopy}
                        >
                            <IconCopy />
                            {copied ? "Copied" : "Copy"}
                        </button>
                    )}
                </div>

                <div className="drawer-body">
                    <section className="drawer-section drawer-timeline">
                        <div className="timeline-row">
                            <span className="timeline-label">Added</span>
                            <span className="timeline-value">{formatRelativeDate(lead.createdAt)}</span>
                        </div>
                        <div className="timeline-row">
                            <span className="timeline-label">Last contacted</span>
                            <span className="timeline-value">
                                {lead.lastContactedAt
                                    ? formatRelativeDate(lead.lastContactedAt)
                                    : "Not yet"}
                            </span>
                        </div>
                    </section>

                    <section className="drawer-section">
                        <h3 className="drawer-section__title">Status</h3>
                        <div className="status-grid">
                            {PIPELINE_STATUSES.map((status) => {
                                const cfg = STATUS_CONFIG[status]
                                const active = lead.status === status
                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        className={`status-pill ${active ? "status-pill--active" : ""}`}
                                        style={
                                            active
                                                ? {
                                                      borderColor: cfg.color,
                                                      background: cfg.bg,
                                                      color: cfg.color,
                                                  }
                                                : undefined
                                        }
                                        onClick={() => handleStatusChange(status)}
                                        disabled={saving}
                                    >
                                        {cfg.label}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section className="drawer-section">
                        <h3 className="drawer-section__title">Customer info</h3>
                        <p className="lead-edit-hint">
                            Form details land here. Add a dollar estimate manually when you
                            quote the job — nothing is auto-priced.
                        </p>
                        <div className="lead-edit-form">
                            <div className="lead-edit-form__row">
                                <label className="field">
                                    <span className="field__label">Name</span>
                                    <input
                                        value={infoForm.fullname}
                                        onChange={handleInfoChange("fullname")}
                                    />
                                </label>
                                <label className="field">
                                    <span className="field__label">Phone</span>
                                    <input
                                        value={infoForm.phonenumber}
                                        onChange={handleInfoChange("phonenumber")}
                                    />
                                </label>
                            </div>
                            <label className="field">
                                <span className="field__label">Email</span>
                                <input
                                    type="email"
                                    value={infoForm.email}
                                    onChange={handleInfoChange("email")}
                                />
                            </label>
                            <label className="field">
                                <span className="field__label">Address</span>
                                <div
                                    className={`lead-address-input-wrap ${
                                        addressVerified ? "lead-address-input-wrap--verified" : ""
                                    }`}
                                >
                                    <input
                                        ref={addressInputRef}
                                        value={infoForm.homeaddress}
                                        onChange={handleAddressChange}
                                        placeholder="Street address"
                                    />
                                    {addressVerified && (
                                        <span className="lead-address-check" aria-hidden>
                                            ✓
                                        </span>
                                    )}
                                </div>
                                {addressFieldError && (
                                    <p className="lead-address-error">{addressFieldError}</p>
                                )}
                                {mapsLoadError && (
                                    <p className="lead-address-error">{mapsLoadError}</p>
                                )}
                            </label>
                            <div className="lead-edit-form__row">
                                <label className="field">
                                    <span className="field__label">City</span>
                                    <input
                                        value={infoForm.city}
                                        onChange={handleInfoChange("city")}
                                    />
                                </label>
                                <label className="field">
                                    <span className="field__label">Zip</span>
                                    <input
                                        value={infoForm.zipcode}
                                        onChange={handleInfoChange("zipcode")}
                                    />
                                </label>
                            </div>
                            <div className="lead-edit-form__row">
                                <label className="field">
                                    <span className="field__label">Request for</span>
                                    <input
                                        value={infoForm.projectType}
                                        onChange={handleInfoChange("projectType")}
                                        placeholder="Free Quote, Weekly Service…"
                                    />
                                </label>
                                <label className="field">
                                    <span className="field__label">Pool size</span>
                                    <input
                                        value={infoForm.fenceType}
                                        onChange={handleInfoChange("fenceType")}
                                        placeholder="e.g. 15k gal, medium…"
                                    />
                                </label>
                            </div>
                            <div className="lead-edit-form__row">
                                <label className="field">
                                    <span className="field__label">Preferred visit</span>
                                    <input
                                        value={lead.preferredDate || ""}
                                        readOnly
                                        placeholder="Set from quote form"
                                    />
                                </label>
                                <label className="field">
                                    <span className="field__label">Estimate ($)</span>
                                    <input
                                        inputMode="decimal"
                                        value={infoForm.estimate}
                                        onChange={handleInfoChange("estimate")}
                                        placeholder="Enter after quoting"
                                    />
                                </label>
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={handleSaveInfo}
                            disabled={savingInfo || !infoDirty}
                        >
                            {savingInfo ? "Saving…" : "Save customer info"}
                        </button>
                    </section>

                    {lead.generatedMessage && (
                        <section className="drawer-section">
                            <div className="drawer-section__row">
                                <h3 className="drawer-section__title">SMS draft</h3>
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={handleRegenerate}
                                    disabled={regenerating}
                                    aria-label="Regenerate message"
                                >
                                    <IconRefresh />
                                </button>
                            </div>
                            <div className="message-card">
                                <p>{lead.generatedMessage}</p>
                                <button
                                    type="button"
                                    className={`btn-copy-full ${copied ? "copied" : ""}`}
                                    onClick={handleCopy}
                                >
                                    <IconCopy />
                                    {copied ? "Copied" : "Copy message"}
                                </button>
                            </div>
                        </section>
                    )}

                    <section className="drawer-section">
                        <h3 className="drawer-section__title">Team notes</h3>
                        <textarea
                            className="notes-input"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add context for your team..."
                            rows={6}
                        />
                        <button
                            className="btn btn-secondary btn-full"
                            onClick={handleSaveNotes}
                            disabled={saving || notes === (lead.notes || "")}
                        >
                            Save notes
                        </button>
                    </section>
                </div>
            </aside>
        </>
    )
}
