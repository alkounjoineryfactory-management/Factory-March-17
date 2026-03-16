import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminId = cookieStore.get("adminId")?.value;
        
        if (!adminId) {
            return NextResponse.json({ count: 0 });
        }

        const count = await prisma.message.count({
            where: {
                receiverAdminId: adminId,
                read: false
            }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Failed to fetch unread count:", error);
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}
