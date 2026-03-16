"use client";

import { useEffect } from "react";

function hexToHSL(hex: string) {
    hex = hex.replace('#', '');
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;

    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;

    let h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return `${h} ${s}% ${l}%`;
}

export function ThemeColorInjector({ color }: { color?: string }) {
    useEffect(() => {
        if (!color) return;
        try {
            // Calculate luminance to determine foreground color
            let r = 0, g = 0, b = 0;
            const pureHex = color.replace('#', '');
            if (pureHex.length === 3) {
                r = parseInt(pureHex[0] + pureHex[0], 16);
                g = parseInt(pureHex[1] + pureHex[1], 16);
                b = parseInt(pureHex[2] + pureHex[2], 16);
            } else if (pureHex.length === 6) {
                r = parseInt(pureHex.substring(0, 2), 16);
                g = parseInt(pureHex.substring(2, 4), 16);
                b = parseInt(pureHex.substring(4, 6), 16);
            }

            // Relative luminance formula
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            // If background is light (luminance > 0.65), use dark text. Otherwise use light text.
            const foregroundHsl = luminance > 0.65 ? '240 5.9% 10%' : '0 0% 98%';

            const hsl = hexToHSL(color);
            document.documentElement.style.setProperty('--primary', hsl);
            document.documentElement.style.setProperty('--primary-foreground', foregroundHsl);
            document.documentElement.style.setProperty('--ring', hsl);
        } catch (e) {
            console.error("Failed to parse primary color:", color);
        }
    }, [color]);
    return null;
}
