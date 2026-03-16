import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const machineId = searchParams.get("machineId");

        const where: any = {};
        if (status) where.status = status;
        if (machineId) where.machineId = machineId;

        const jobCards = await prisma.jobCard.findMany({
            where,
            include: {
                machine: true,
                logs: true,
            },
            orderBy: {
                targetDate: 'asc',
            },
        });

        return NextResponse.json(jobCards);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch job cards" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { projectId, sectionId, machineId, targetDate, description, targetHours } = body;

        if (!projectId || !sectionId || !targetDate || !description) {
            return NextResponse.json({ error: "Project ID, Section ID, Target Date, and Description are required" }, { status: 400 });
        }

        const jobCard = await prisma.jobCard.create({
            data: {
                projectId,
                sectionId,
                weeklyPlanId: body.weeklyPlanId || null,
                machineId: machineId || null,
                employeeId: body.employeeId || null, // Optional employee assignment
                targetDate: new Date(targetDate),
                description,
                targetHours: parseFloat(targetHours) || 0,
                status: "PENDING",
            },
        });

        return NextResponse.json(jobCard, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create job card" }, { status: 500 });
    }
}
