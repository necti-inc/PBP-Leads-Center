import { redirect } from "next/navigation"

type Props = {
    params: Promise<{ id: string }>
}

export default async function CustomerPage({ params }: Props) {
    const { id } = await params
    redirect(`/?view=customers&customer=${encodeURIComponent(id)}`)
}
