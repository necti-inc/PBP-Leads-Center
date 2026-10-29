import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Pools by Pros Leads",
        short_name: "PBP Leads",
        description: "Lead management dashboard for Pools by Pros",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#00adef",
        icons: [
            {
                src: "/icons/apple-touch-icon.png",
                sizes: "180x180",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    }
}
