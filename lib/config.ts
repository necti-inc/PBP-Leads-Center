export const config = {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Pools by Pros",
    appSubtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE || "Leads Center",
    apiUrl:
        process.env.NEXT_PUBLIC_API_URL ||
        "https://us-central1-pools-by-pros.cloudfunctions.net/leadsApi",
    storageKey: process.env.NEXT_PUBLIC_STORAGE_KEY || "pbp_api_key",
    /** Human team password shown on the login screen. */
    teamPassword: process.env.NEXT_PUBLIC_TEAM_PASSWORD || "poolpros",
    /** Real API key sent to Cloud Functions after a successful team login. */
    dashboardApiKey: process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || "",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
}
