"use client"

import { useEffect, useRef, useState } from "react"
import {
    ensureGoogleMapsLoaded,
    isGoogleMapsConfigured,
    parseAddressFromPlace,
    resolveAutocompletePlace,
    SOCAL_BOUNDS,
    validateParsedAddress,
    type ParsedAddress,
} from "@/lib/googleMaps"

type Props = {
    value: string
    onChange: (value: string) => void
    onResolved?: (parsed: ParsedAddress) => void
    placeholder?: string
    required?: boolean
}

export default function AddressAutocomplete({
    value,
    onChange,
    onResolved,
    placeholder = "Start typing a street address…",
    required = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
    const selectingRef = useRef(false)
    const fromListRef = useRef(false)
    const onResolvedRef = useRef(onResolved)
    const onChangeRef = useRef(onChange)

    const [verified, setVerified] = useState(false)
    const [fieldError, setFieldError] = useState("")
    const [mapsLoadError, setMapsLoadError] = useState("")

    useEffect(() => {
        onResolvedRef.current = onResolved
        onChangeRef.current = onChange
    }, [onResolved, onChange])

    useEffect(() => {
        const markAutocompleteSelecting = (event: MouseEvent | TouchEvent) => {
            const target = event.target as HTMLElement | null
            if (!target?.closest?.(".pac-container")) return
            selectingRef.current = true
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
                const input = inputRef.current
                if (!input || !window.google?.maps?.places || autocompleteRef.current) {
                    return
                }

                const autocomplete = new window.google.maps.places.Autocomplete(input, {
                    componentRestrictions: { country: "us" },
                    bounds: SOCAL_BOUNDS,
                    strictBounds: true,
                    fields: ["address_components", "formatted_address", "place_id"],
                    types: ["address"],
                })
                autocompleteRef.current = autocomplete

                autocomplete.addListener("place_changed", () => {
                    void (async () => {
                        selectingRef.current = true
                        try {
                            const place = await resolveAutocompletePlace(autocomplete.getPlace())
                            if (!place?.address_components?.length) return

                            const parsed = parseAddressFromPlace(place)
                            const validationError = validateParsedAddress(parsed)
                            if (validationError) {
                                setVerified(false)
                                fromListRef.current = false
                                setFieldError(validationError)
                                return
                            }

                            onChangeRef.current(parsed.fullAddress)
                            onResolvedRef.current?.(parsed)
                            setVerified(true)
                            fromListRef.current = true
                            setFieldError("")
                        } finally {
                            window.setTimeout(() => {
                                selectingRef.current = false
                            }, 0)
                        }
                    })()
                })
            })
            .catch(() => {
                if (!cancelled) {
                    setMapsLoadError(
                        "Address suggestions unavailable. You can still type the address."
                    )
                }
            })

        return () => {
            cancelled = true
            if (autocompleteRef.current && window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
                autocompleteRef.current = null
            }
        }
    }, [])

    return (
        <div className="cms-address">
            <div
                className={`cms-address__wrap ${verified ? "cms-address__wrap--verified" : ""}`}
            >
                <input
                    ref={inputRef}
                    value={value}
                    required={required}
                    autoComplete="off"
                    placeholder={placeholder}
                    onChange={(e) => {
                        if (selectingRef.current) return
                        onChange(e.target.value)
                        setVerified(false)
                        fromListRef.current = false
                        setFieldError("")
                    }}
                    onBlur={() => {
                        window.setTimeout(() => {
                            if (selectingRef.current) return
                            if (
                                isGoogleMapsConfigured() &&
                                value.trim() &&
                                !fromListRef.current
                            ) {
                                setFieldError("Select an address from the Google suggestions.")
                            }
                        }, 120)
                    }}
                />
                {verified && (
                    <span className="cms-address__check" aria-hidden>
                        ✓
                    </span>
                )}
            </div>
            {fieldError ? <p className="cms-address__hint cms-address__hint--error">{fieldError}</p> : null}
            {!fieldError && mapsLoadError ? (
                <p className="cms-address__hint cms-address__hint--error">{mapsLoadError}</p>
            ) : null}
            {!fieldError && !mapsLoadError && verified ? (
                <p className="cms-address__hint cms-address__hint--ok">Address confirmed</p>
            ) : null}
            {!fieldError &&
            !mapsLoadError &&
            !verified &&
            isGoogleMapsConfigured() ? (
                <p className="cms-address__hint">
                    Pick from Google suggestions to fill city and ZIP.
                </p>
            ) : null}
        </div>
    )
}
