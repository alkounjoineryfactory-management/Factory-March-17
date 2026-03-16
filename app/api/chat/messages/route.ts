import { NextResponse } from "next/server";
import { getMessages, markMessagesAsRead } from "@/app/actions";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const contactId = url.searchParams.get("contactId");
        const contactType = url.searchParams.get("contactType");

        if (!contactId || !contactType) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const adminId = cookieStore.get("adminId")?.value;
        if (!adminId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messages = await getMessages(contactId, contactType as any);
        
        // Mark as read in the background without awaiting to speed up response
        markMessagesAsRead(contactId, contactType as any).catch(e => console.error("Failed to mark messages as read", e));

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Failed to fetch messages:", error);
        return NextResponse.json([], { status: 500 });
    }
}
