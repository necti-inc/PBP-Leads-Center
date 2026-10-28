import { config } from "./config"

export const SERVICE_STATE = "CA"

/** Greater service area — keeps autocomplete roughly in market. */
export const SERVICE_BOUNDS = {
    south: 32.45,
    west: -118.85,
    north: 35.05,
    east: -114.75,
}
/** @deprecated alias kept for shared autocomplete helpers */
export const SOCAL_BOUNDS = SERVICE_BOUNDS

export interface ParsedAddress {
    streetAddress: string
    city: string
    zipcode: string
    state: string
    fullAddress: string
    isCalifornia: boolean
}

let mapsLoadPromise: Promise<void> | null = null

function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve()
            return
        }
        const script = document.createElement("script")
        script.src = url
        script.async = true
        script.defer = true
        script.onload = () => {
            if (window.google?.maps?.places) {
                resolve()
                return
            }
            mapsLoadPromise = null
            reject(
                new Error(
                    "Google Maps Places did not load — check API key env var and domain restrictions"
                )
            )
        }
        script.onerror = () => {
            mapsLoadPromise = null
            reject(new Error("Failed to load Google Maps script"))
        }
        document.head.appendChild(script)
    })
}

export function isGoogleMapsConfigured(): boolean {
    return Boolean(config.googleMapsApiKey)
}

/** Loads Places when a key is set; resolves as a no-op when not configured. */
export function ensureGoogleMapsLoaded(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve()
    if (window.google?.maps?.places) return Promise.resolve()
    if (!config.googleMapsApiKey) {
        return Promise.resolve()
    }

    if (!mapsLoadPromise) {
        mapsLoadPromise = loadScript(
            `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&libraries=places`
        )
    }
    return mapsLoadPromise
}

function fetchPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve) => {
        if (!placeId || !window.google?.maps?.places) {
            resolve(null)
            return
        }

        const service = new window.google.maps.places.PlacesService(
            document.createElement("div")
        )
        service.getDetails(
            { placeId, fields: ["address_components", "formatted_address"] },
            (result, status) => {
                const ok = status === window.google.maps.places.PlacesServiceStatus.OK
                resolve(ok ? result : null)
            }
        )
    })
}

export async function resolveAutocompletePlace(
    place: google.maps.places.PlaceResult
): Promise<google.maps.places.PlaceResult | null> {
    if (place?.address_components?.length) return place
    if (!place?.place_id) return place
    return (await fetchPlaceDetails(place.place_id)) || place
}

export function parseAddressFromPlace(
    place: google.maps.places.PlaceResult
): ParsedAddress {
    let streetNumber = ""
    let route = ""
    let city = ""
    let zipcode = ""
    let state = ""

    ;(place?.address_components || []).forEach((component) => {
        const types = component.types
        if (types.includes("street_number")) streetNumber = component.long_name
        if (types.includes("route")) route = component.long_name
        if (!city && types.includes("locality")) city = component.long_name
        if (!city && types.includes("sublocality_level_1")) city = component.long_name
        if (!city && types.includes("postal_town")) city = component.long_name
        if (!city && types.includes("administrative_area_level_3")) {
            city = component.long_name
        }
        if (
            !city &&
            types.includes("administrative_area_level_2") &&
            !component.long_name.toLowerCase().includes("county")
        ) {
            city = component.long_name
        }
        if (types.includes("postal_code")) zipcode = component.long_name
        if (types.includes("administrative_area_level_1")) state = component.short_name
    })

    const streetAddress = `${streetNumber} ${route}`.trim()
    const formatted = place?.formatted_address || ""
    const assembled = [streetAddress, city, state, zipcode].filter(Boolean).join(", ")

    if (formatted) {
        const caMatch = formatted.match(/,\s*([^,]+),\s*CA\s+(\d{5})(?:-\d{4})?/)
        if (caMatch) {
            if (!city) city = caMatch[1].trim()
            if (!zipcode) zipcode = caMatch[2]
        }
        if (!state && /,\s*CA\s+\d{5}/.test(formatted)) state = SERVICE_STATE
        if (!zipcode) {
            const zipMatch = formatted.match(/\b(\d{5})(?:-\d{4})?\b/)
            if (zipMatch) zipcode = zipMatch[1]
        }
    }

    const fullAddress =
        state === SERVICE_STATE && formatted ? formatted : assembled || formatted

    return {
        streetAddress,
        city,
        zipcode,
        state,
        fullAddress,
        isCalifornia: state === SERVICE_STATE,
    }
}

export function validateParsedAddress(parsed: ParsedAddress): string | null {
    if (!parsed.isCalifornia) {
        return "Choose a Southern California address from the Google list."
    }
    if (!parsed.streetAddress) {
        return "Choose a full street address from the Google suggestions."
    }
    if (!parsed.city || !parsed.zipcode) {
        return "Choose a complete address from the Google suggestions."
    }
    return null
}
