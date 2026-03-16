import { NextResponse } from "next/server";
import { getConversations } from "@/app/actions";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminId = cookieStore.get("adminId")?.value;
        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await getConversations();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch conversations:", error);
        return NextResponse.json([], { status: 500 });
    }
}
