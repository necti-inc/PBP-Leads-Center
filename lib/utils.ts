export function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

export function formatRelativeDate(date?: string | null) {
    if (!date) return "—"
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffHrs < 48) return "yesterday"
    const days = Math.floor(diffHrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function formatPhoneDisplay(phone: string) {
    const digits = phone.replace(/\D/g, "")
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
}
