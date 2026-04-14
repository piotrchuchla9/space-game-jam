// src/game/ui/colors.ts
// Shared cartoon-cosmic palette. Keep in sync with spec 2026-04-14-scenes-redesign-design.md.

export const COLORS = {
    bgDeep: 0x0a0e27,
    bgMid: 0x1f1547,
    bgNear: 0x2a4b6e,
    accentWarm: 0xffcc00,
    accentPink: 0xff5fa2,
    accentCyan: 0x4ad8ff,
    accentLilac: 0xb79dff,
    ink: 0x0a0a1e,
    paper: 0xffffff,
} as const;

export const HEX = {
    bgDeep: '#0a0e27',
    bgMid: '#1f1547',
    bgNear: '#2a4b6e',
    accentWarm: '#ffcc00',
    accentPink: '#ff5fa2',
    accentCyan: '#4ad8ff',
    accentLilac: '#b79dff',
    ink: '#0a0a1e',
    paper: '#ffffff',
} as const;
