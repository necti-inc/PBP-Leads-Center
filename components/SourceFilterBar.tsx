"use client"

import type { SourceFilterOption } from "@/lib/sources"

interface SourceFilterBarProps {
    options: SourceFilterOption[]
    value: string
    onChange: (sourceId: string) => void
}

export default function SourceFilterBar({ options, value, onChange }: SourceFilterBarProps) {
    return (
        <div className="filter-section">
            <span className="filter-section__label">Source</span>
            <div className="filter-pills filter-pills--sources">
                {options.map((option) => {
                    const active = value === option.id
                    const theme = option.theme

                    return (
                        <button
                            key={option.id}
                            type="button"
                            className={`pill ${active ? "pill--active" : ""}`}
                            onClick={() => onChange(option.id)}
                            style={
                                active
                                    ? {
                                          background: theme.bg,
                                          color: theme.color,
                                          borderColor: theme.border,
                                      }
                                    : undefined
                            }
                        >
                            {option.label}
                            {option.count !== undefined ? ` ${option.count}` : ""}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
