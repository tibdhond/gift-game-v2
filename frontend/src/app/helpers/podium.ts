import { PodiumSlot } from "../entities/entities";

export interface PodiumLayout<T> {
    firsts: T[];
    seconds: T[];
    third?: T;
    rest: T[];
}

export function rankPodium<T>(sorted: T[], score: (item: T) => number): PodiumLayout<T> {
    if (sorted.length === 0) {
        return { firsts: [], seconds: [], rest: [] };
    }

    const firsts = sorted.filter(item => score(item) === score(sorted[0]));

    const runnerUp = sorted[1];
    const seconds = firsts.length > 1 || !runnerUp || score(runnerUp) <= 0
        ? []
        : sorted.filter(item => score(item) === score(runnerUp)).slice(0, 2);

    const candidate = sorted[2];
    const third = firsts.length > 1 || seconds.length > 1 || !candidate || score(candidate) <= 0
        ? undefined
        : candidate;

    return {
        firsts, seconds, third,
        rest: sorted.slice(firsts.length + seconds.length + (third ? 1 : 0)),
    };
}

type SlotContent = Pick<PodiumSlot, 'key' | 'name' | 'avatarPath' | 'stat' | 'statLabel'>;

export function buildPodiumSlots<T>(
    layout: PodiumLayout<T>,
    toSlot: (item: T) => SlotContent,
    { start = 0.3, step = 0.8 } = {}
): PodiumSlot[] {
    // Reveal order 3rd -> 2nd -> 1st; empty tiers are skipped
    const tiers = [
        { place: 3 as const, label: '3de Plaats', items: layout.third ? [layout.third] : [] },
        { place: 2 as const, label: '2de Plaats', items: layout.seconds },
        { place: 1 as const, label: '1ste Plaats', items: layout.firsts },
    ].filter(tier => tier.items.length > 0);

    const byPlace = new Map<number, PodiumSlot[]>();
    tiers.forEach((tier, index) => {
        byPlace.set(tier.place, tier.items.map(item => ({
            ...toSlot(item), place: tier.place, label: tier.label, delay: start + index * step,
        })));
    });

    const firsts = byPlace.get(1) ?? [];
    const seconds = byPlace.get(2) ?? [];
    const thirds = byPlace.get(3) ?? [];

    // Display order 2nd, 1st, 3rd; a tied 2nd flanks the winner
    const half = Math.ceil(seconds.length / 2);
    return [...seconds.slice(0, half), ...firsts, ...seconds.slice(half), ...thirds];
}