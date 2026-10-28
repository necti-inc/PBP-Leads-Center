import type { Lead } from "@/lib/types"

interface LeadPriceProps {
    lead: Lead
    variant?: "card" | "hero"
}

export default function LeadPrice({ lead, variant = "card" }: LeadPriceProps) {
    const amount = lead.estimate ?? lead.price
    if (amount == null || Number.isNaN(Number(amount))) {
        return (
            <span className={`lead-price__single lead-price__single--${variant}`}>
                —
            </span>
        )
    }

    return (
        <span className={`lead-price__single lead-price__single--${variant}`}>
            ${amount}
        </span>
    )
}
