"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginEmployee(formData: FormData) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
        return { error: "Username and Password required" };
    }

    const employee = await prisma.employee.findUnique({
        where: { username }
    });

    if (!employee || employee.password !== password) {
        return { error: "Invalid credentials" };
    }

    // Set cookie
    (await cookies()).set("employeeId", employee.id, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    redirect("/kiosk");
}

export async function logoutEmployee() {
    (await cookies()).delete("employeeId");
    redirect("/kiosk/login");
}
