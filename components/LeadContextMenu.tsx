"use client"

import { useEffect, useRef } from "react"

interface LeadContextMenuProps {
    x: number
    y: number
    leadName: string
    onDelete: () => void
    onClose: () => void
}

export default function LeadContextMenu({
    x,
    y,
    leadName,
    onDelete,
    onClose,
}: LeadContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handlePointerDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }

        document.addEventListener("mousedown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)
        document.addEventListener("scroll", onClose, true)

        return () => {
            document.removeEventListener("mousedown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
            document.removeEventListener("scroll", onClose, true)
        }
    }, [onClose])

    useEffect(() => {
        const menu = menuRef.current
        if (!menu) return

        const rect = menu.getBoundingClientRect()
        const padding = 8
        let left = x
        let top = y

        if (left + rect.width > window.innerWidth - padding) {
            left = window.innerWidth - rect.width - padding
        }
        if (top + rect.height > window.innerHeight - padding) {
            top = window.innerHeight - rect.height - padding
        }

        menu.style.left = `${Math.max(padding, left)}px`
        menu.style.top = `${Math.max(padding, top)}px`
    }, [x, y])

    return (
        <div
            ref={menuRef}
            className="lead-context-menu"
            style={{ left: x, top: y }}
            role="menu"
            onContextMenu={(e) => e.preventDefault()}
        >
            <button
                type="button"
                className="lead-context-menu__item lead-context-menu__item--danger"
                role="menuitem"
                onClick={() => {
                    onClose()
                    onDelete()
                }}
            >
                Delete {leadName.split(" ")[0]}
            </button>
        </div>
    )
}
