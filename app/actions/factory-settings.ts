"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Sections ---

export async function getFactorySections() {
    return await prisma.section.findMany({
        include: { 
            subSections: true,
            incharges: true,
            foremen: true
        },
        orderBy: { name: 'asc' },
    });
}

export async function createFactorySection(formData: FormData) {
    const name = formData.get("name") as string;
    
    // Parse JSON arrays for multiple selections
    const inchargeStr = formData.get("inchargeIds") as string;
    const foremanStr = formData.get("foremanIds") as string;
    
    const inchargeIds: string[] = inchargeStr ? JSON.parse(inchargeStr) : [];
    const foremanIds: string[] = foremanStr ? JSON.parse(foremanStr) : [];

    if (!name) throw new Error("Section name is required");

    await prisma.section.create({
        data: { 
            name, 
            incharges: { connect: inchargeIds.map(id => ({ id })) },
            foremen: { connect: foremanIds.map(id => ({ id })) }
        }
    });
    revalidatePath("/admin/factory-settings");
}

export async function updateFactorySection(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    // Parse JSON arrays for multiple selections
    const inchargeStr = formData.get("inchargeIds") as string;
    const foremanStr = formData.get("foremanIds") as string;
    
    const inchargeIds: string[] = inchargeStr ? JSON.parse(inchargeStr) : [];
    const foremanIds: string[] = foremanStr ? JSON.parse(foremanStr) : [];

    if (!name) throw new Error("Section name is required");

    await prisma.section.update({
        where: { id },
        data: { 
            name, 
            incharges: { set: inchargeIds.map(id => ({ id })) },
            foremen: { set: foremanIds.map(id => ({ id })) }
        }
    });
    revalidatePath("/admin/factory-settings");
}

export async function deleteFactorySection(id: string) {
    // Check for linked machines/employees first? Assuming cascading or restricting.
    await prisma.section.delete({ where: { id } });
    revalidatePath("/admin/factory-settings");
}

// --- Sub-Sections ---

export async function createFactorySubSection(formData: FormData) {
    const name = formData.get("name") as string;
    const sectionId = formData.get("sectionId") as string;

    if (!name || !sectionId) throw new Error("Sub-Section name and parent section are required");

    await prisma.subSection.create({
        data: { name, sectionId }
    });
    revalidatePath("/admin/factory-settings");
}

export async function updateFactorySubSection(id: string, formData: FormData) {
    const name = formData.get("name") as string;

    if (!name) throw new Error("Sub-Section name is required");

    await prisma.subSection.update({
        where: { id },
        data: { name }
    });
    revalidatePath("/admin/factory-settings");
}

export async function deleteFactorySubSection(id: string) {
    await prisma.subSection.delete({ where: { id } });
    revalidatePath("/admin/factory-settings");
}

// --- Machines ---

export async function getFactoryMachines() {
    return await prisma.machine.findMany({
        include: { section: true, subSection: true },
        orderBy: { name: 'asc' },
    });
}

export async function createFactoryMachine(formData: FormData) {
    const sectionId = formData.get("sectionId") as string;
    const subSectionId = formData.get("subSectionId") as string | null;
    const name = formData.get("name") as string;
    const machineNumber = formData.get("machineNumber") as string | null;
    const operatorName = formData.get("operatorName") as string | null;

    if (!name || !sectionId) throw new Error("Machine name and section are required");

    await prisma.machine.create({
        data: { name, sectionId, subSectionId: subSectionId || null, machineNumber, operatorName }
    });
    revalidatePath("/admin/factory-settings");
}

export async function updateFactoryMachine(id: string, formData: FormData) {
    const sectionId = formData.get("sectionId") as string;
    const subSectionId = formData.get("subSectionId") as string | null;
    const name = formData.get("name") as string;
    const machineNumber = formData.get("machineNumber") as string | null;
    const operatorName = formData.get("operatorName") as string | null;

    if (!name || !sectionId) throw new Error("Machine name and section are required");

    await prisma.machine.update({
        where: { id },
        data: { name, sectionId, subSectionId: subSectionId || null, machineNumber, operatorName }
    });
    revalidatePath("/admin/factory-settings");
}

export async function deleteFactoryMachine(id: string) {
    await prisma.machine.delete({ where: { id } });
    revalidatePath("/admin/factory-settings");
}

// --- Employees ---

export async function getFactoryEmployees() {
    return await prisma.employee.findMany({
        include: { section: true, subSection: true, assignedMachine: true },
        orderBy: { name: 'asc' },
    });
}

export async function createFactoryEmployee(formData: FormData) {
    const name = formData.get("name") as string;
    const employeeCode = formData.get("employeeCode") as string | null;
    const sectionId = formData.get("sectionId") as string;
    const subSectionId = formData.get("subSectionId") as string | null;
    const assignedMachineId = formData.get("assignedMachineId") as string | null;
    const phoneNumber = formData.get("phoneNumber") as string | null;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!name || !sectionId || !username || !password) throw new Error("Required fields missing");

    await prisma.employee.create({
        data: {
            name,
            employeeCode: employeeCode || null,
            role: "Operator", // Default role
            sectionId,
            subSectionId: subSectionId || null,
            assignedMachineId: assignedMachineId === "none" ? null : assignedMachineId,
            phoneNumber,
            username,
            password
        }
    });
    revalidatePath("/admin/factory-settings");
}

export async function updateFactoryEmployee(id: string, formData: FormData) {
    const name = formData.get("name") as string;
    const employeeCode = formData.get("employeeCode") as string | null;
    const sectionId = formData.get("sectionId") as string;
    const subSectionId = formData.get("subSectionId") as string | null;
    const assignedMachineId = formData.get("assignedMachineId") as string | null;
    const phoneNumber = formData.get("phoneNumber") as string | null;
    const username = formData.get("username") as string;

    // Optional password update
    const password = formData.get("password") as string | null;

    if (!name || !sectionId || !username) throw new Error("Required fields missing");

    const data: any = {
        name,
        employeeCode: employeeCode || null,
        sectionId,
        subSectionId: subSectionId || null,
        assignedMachineId: assignedMachineId === "none" ? null : assignedMachineId,
        phoneNumber,
        username
    };

    if (password) data.password = password;

    await prisma.employee.update({
        where: { id },
        data
    });
    revalidatePath("/admin/factory-settings");
}

export async function deleteFactoryEmployee(id: string) {
    await prisma.employee.delete({ where: { id } });
    revalidatePath("/admin/factory-settings");
}
