"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getMeetings({
    page = 1,
    limit = 10,
    search = ""
}: {
    page?: number;
    limit?: number;
    search?: string;
}) {
    try {
        const skip = (page - 1) * limit;

        const whereClause: any = search
            ? {
                  OR: [
                      { title: { contains: search } },
                      { attendees: { contains: search } },
                      { summary: { contains: search } }
                  ]
              }
            : {};

        const meetings = await prisma.meetingSummary.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit + 1
        });

        const hasNextPage = meetings.length > limit;
        if (hasNextPage) meetings.pop();

        return { success: true, meetings, hasNextPage };
    } catch (error: any) {
        console.error("Error fetching meetings:", error);
        return { success: false, error: "Failed to load meeting summaries." };
    }
}

export async function createMeeting({
    title,
    date,
    attendees,
    summary,
    source = "MANUAL"
}: {
    title: string;
    date: Date;
    attendees?: string;
    summary: string;
    source?: string;
}) {
    try {
        if (!title || !date || !summary) {
            throw new Error("Title, Date, and Summary are required.");
        }

        const meeting = await prisma.meetingSummary.create({
            data: {
                title,
                date: new Date(date),
                attendees,
                summary,
                source
            }
        });

        revalidatePath("/admin/meetings");
        return { success: true, meeting };
    } catch (error: any) {
        console.error("Error creating meeting:", error);
        return { success: false, error: error.message || "Failed to save meeting summary." };
    }
}

export async function deleteMeeting(id: string) {
    try {
        await prisma.meetingSummary.delete({
            where: { id }
        });

        revalidatePath("/admin/meetings");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting meeting:", error);
        return { success: false, error: "Failed to delete meeting summary." };
    }
}

export async function getStaff() {
    return await prisma.user.findMany({
        where: { role: { not: "ADMIN" } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, username: true, role: true }
    });
}
