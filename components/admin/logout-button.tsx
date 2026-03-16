"use client";

import { LogOut } from "lucide-react";
import { logoutAdmin } from "@/app/actions";

export function LogoutButton() {
    return (
        <button
            onClick={() => logoutAdmin()}
            className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
            title="Sign Out"
        >
            <LogOut className="w-4 h-4" />
        </button>
    );
}
