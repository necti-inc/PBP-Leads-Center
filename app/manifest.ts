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
                src: "/apple-icon",
                sizes: "180x180",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icon",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    }
}
