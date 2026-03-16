import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const machines = await prisma.machine.findMany({
            include: {
                section: true,
            },
        });
        return NextResponse.json(machines);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch machines" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, sectionId } = body;

        if (!name || !sectionId) {
            return NextResponse.json({ error: "Name and Section ID are required" }, { status: 400 });
        }

        const machine = await prisma.machine.create({
            data: {
                name,
                sectionId,
            },
        });

        return NextResponse.json(machine, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create machine" }, { status: 500 });
    }
}
