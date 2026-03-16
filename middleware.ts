import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Check if it's an admin route
    if (request.nextUrl.pathname.startsWith("/admin")) {
        // Exclude the login page itself
        if (request.nextUrl.pathname === "/admin/login") {
            return NextResponse.next();
        }

        // Check for adminId cookie
        const adminId = request.cookies.get("adminId")?.value;

        if (!adminId) {
            // Redirect to login if not authenticated
            const loginUrl = new URL("/admin/login", request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
