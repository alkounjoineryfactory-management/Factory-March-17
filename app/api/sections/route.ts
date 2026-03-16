import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const sections = await prisma.section.findMany({
            include: {
                machines: true,
            },
        });
        return NextResponse.json(sections);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const section = await prisma.section.create({
            data: {
                name,
            },
        });

        return NextResponse.json(section, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
    }
}
