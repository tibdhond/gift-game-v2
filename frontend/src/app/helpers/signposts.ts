import { Player } from "../entities/entities";

export type EdgeName = 'bottom' | 'left' | 'right' | 'top';

export interface SignpostSlot {
    player: Player;
    gridColumn?: string;   // bottom and top edges
    gridRow?: string;      // left and right edges
    k: number;             // lean: -1..1, multiplied by the maximum lean in the stylesheet
    t: number;             // pop distance: 0..1, mapped onto the 5-8rem range in the stylesheet
    shape: number;         // which of the irregular board outlines to use
    snowSize: number;      // 0..1: variation in the size of the snow pile
    snowShift: number;     // 0..1: variation in its sideways position
    swayPeriod: number;    // 0..1: mapped to 4-6s in the stylesheet
    swayPhase: number;     // 0..1: staggers when the sway starts
}

export interface SignpostEdge {
    name: EdgeName;
    cells: number;         // grid cells on this edge: twice its capacity (a post spans 2)
    slots: SignpostSlot[];
}

export interface SignpostLayout {
    horizontal: number;    // capacity of the top and bottom edges
    vertical: number;      // capacity of the left and right edges (one less)
    edges: SignpostEdge[];
}

const BASE_CAPACITY = 4;
const SHAPES = 3;

/**
 * Hands the players out over the four edges:
 *   1. bottom first, up to the edge's capacity (centred when not full)
 *   2. then left and right alternately, both filling from the bottom up
 *   3. top last (centred)
 * Capacity grows past 4 only when there are more than 16 players, so everything fits.
 *
 * `salt` varies the random lean and pop per round (e.g. the gift's name). The randomness is
 * derived from salt + player id, so it is stable while the same round is on screen.
 */
export function layoutSignposts(players: Player[], salt: string): SignpostLayout {
    const total = players.length;

    // Top and bottom hold one more than left and right: 4 and 3 until there are more than 14 players
    const horizontal = Math.max(BASE_CAPACITY, Math.ceil((total + 2) / 4));
    const vertical = horizontal - 1;

    const bottomCount = Math.min(total, horizontal);
    const sideTotal = Math.min(total - bottomCount, vertical * 2);
    const topCount = total - bottomCount - sideTotal;

    let next = 0;
    const take = (count: number) => players.slice(next, (next += count));

    const bottom = take(bottomCount);
    const left: Player[] = [];
    const right: Player[] = [];
    take(sideTotal).forEach((player, i) => (i % 2 === 0 ? left : right).push(player));
    const top = take(topCount);

    // Positions are in half-cells (an edge has capacity * 2 cells, a signpost spans 2),
    // which is what makes a partly filled edge centre itself.
    const centred = (count: number, i: number) => `${1 + (horizontal - count) + 2 * i} / span 2`;
    const fromBottom = (i: number) => `${2 * vertical - 2 * i - 1} / span 2`;

    const slot = (player: Player, position: Partial<SignpostSlot>): SignpostSlot => {
        const rand = random(hash(`${salt}|${player.id}`));
        const direction = rand() < 0.5 ? -1 : 1;
        return {
            player,
            k: direction * (0.4 + 0.6 * rand()),   // never close to 0, so every lean is visible
            t: rand(),
            shape: Math.floor(rand() * SHAPES),
            ...position,
            snowSize: rand(),
            snowShift: rand(),
            swayPeriod: rand(),
            swayPhase: rand(),
        };
    };

    const edges: SignpostEdge[] = [
        { name: 'bottom', cells: horizontal * 2, slots: bottom.map((p, i) => slot(p, { gridColumn: centred(bottom.length, i) })) },
        { name: 'left', cells: vertical * 2, slots: left.map((p, i) => slot(p, { gridRow: fromBottom(i) })) },
        { name: 'right', cells: vertical * 2, slots: right.map((p, i) => slot(p, { gridRow: fromBottom(i) })) },
        { name: 'top', cells: horizontal * 2, slots: top.map((p, i) => slot(p, { gridColumn: centred(top.length, i) })) },
    ];

    return { horizontal, vertical, edges: edges.filter(edge => edge.slots.length > 0) };
}

// ---------- small deterministic random helpers ----------

function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** mulberry32: a tiny seeded generator that returns numbers in [0, 1). */
function random(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}