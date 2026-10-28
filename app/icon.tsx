import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 512, height: 512 }
export const contentType = "image/png"

function BrandMark({ canvasSize }: { canvasSize: number }) {
    const iconSize = Math.round(canvasSize * 0.56)

    return (
        <div
            style={{
                width: canvasSize,
                height: canvasSize,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#00adef",
                borderRadius: Math.round(canvasSize * 0.22),
            }}
        >
            <svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"
                />
                <path
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"
                />
                <path
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"
                />
            </svg>
        </div>
    )
}

export default function Icon() {
    return new ImageResponse(<BrandMark canvasSize={512} />, {
        width: 512,
        height: 512,
    })
}
