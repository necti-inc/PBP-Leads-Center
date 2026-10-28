import type { Metadata, Viewport } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"

const montserrat = Montserrat({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-montserrat",
})

export const metadata: Metadata = {
    title: "Pools by Pros — Leads",
    description: "Lead management dashboard for Pools by Pros",
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/icon", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "PBP Leads",
    },
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#00adef",
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={montserrat.variable}>{children}</body>
        </html>
    )
}
