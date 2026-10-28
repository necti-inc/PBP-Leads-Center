"use client"

import Image from "next/image"
import { useState } from "react"
import { login, verifyApiKey } from "@/lib/api"
import { config } from "@/lib/config"

interface LoginProps {
    onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!password.trim()) return

        setLoading(true)
        setError("")

        try {
            const entered = password.trim()
            const apiKey =
                entered === config.teamPassword && config.dashboardApiKey
                    ? config.dashboardApiKey
                    : entered

            const valid = await verifyApiKey(apiKey)
            if (!valid) throw new Error()
            login(apiKey)
            onLogin()
        } catch {
            setError("Incorrect password. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-brand">
                <div className="auth-brand__logo">
                    <Image
                        src="/logo-transparent.png"
                        alt={config.appName}
                        fill
                        style={{ objectFit: "contain", objectPosition: "left center" }}
                        sizes="210px"
                        priority
                    />
                </div>
                <p>
                    Lead management for Pools by Pros. Track website and Facebook quote
                    requests, update pipeline status, and follow up — all in one place.
                </p>
                <ul className="auth-features">
                    <li>Website & Facebook lead pipeline</li>
                    <li>One-tap call & text</li>
                    <li>Quotes, notes & follow-ups</li>
                </ul>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-form__header">
                    <h2>Welcome back</h2>
                    <p>Sign in to {config.appSubtitle}</p>
                </div>

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter team password"
                    autoComplete="current-password"
                    autoFocus
                />

                {error && <p className="auth-error">{error}</p>}

                <button
                    type="submit"
                    className="btn btn-primary btn-full btn-lg"
                    disabled={loading || !password.trim()}
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </div>
    )
}
