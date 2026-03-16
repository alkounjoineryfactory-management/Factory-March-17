import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Correct type for Next.js 15
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, machineId, logs } = body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (machineId) updateData.machineId = machineId;

        // Use a transaction if we are updating logs simultaneously, but for now simple update
        const jobCard = await prisma.jobCard.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(jobCard);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update job card" }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const jobCard = await prisma.jobCard.findUnique({
            where: { id },
            include: {
                machine: true,
                logs: true
            }
        });

        if (!jobCard) {
            return NextResponse.json({ error: "Job card not found" }, { status: 404 });
        }

        return NextResponse.json(jobCard);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch job card" }, { status: 500 });
    }
}
