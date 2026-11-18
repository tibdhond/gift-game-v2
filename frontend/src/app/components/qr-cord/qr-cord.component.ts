import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { combineLatest, map, Observable, shareReplay, take, tap } from 'rxjs';
import { gameIdService } from 'src/app/services/game-id.service';
import { UtilService } from 'src/app/services/util.service';
import { BANNER_SELECTOR } from '../banner/banner.component';

// ---------- Tunables ----------
const SEGMENTS = 16;              // points in the cord (the last one is the ring)
const CORD_LENGTH = 100;           // px from the fixed end to the ring's centre
const RING_RADIUS = 10;
const HOOK_TO_ANCHOR_X = 100;      // the cord's fixed end sits this far to the right of the hook
const MOUNT_DISTANCE = 23;        // a ring released within this distance of the hook hangs itself on it
const MAX_STRETCH = 1.12;         // the ring can be pulled to this multiple of the cord length (rubber-band feel)
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 380;
const PANEL_BUFFER = 24;
const PANEL_SHADOW_PAD = 24;      // extra clip room so the panel's shadow isn't cut off; keep in sync with the scss
const OPEN_FRACTION = 0.3;        // pull the panel out this far and let go: it opens
const CLOSE_PULL = 40;            // open panel: pull the ring this far past taut and let go: it closes
const PANEL_GIVE = 14;            // px the open panel is dragged further down while you pull the cord to close it
const PANEL_GIVE_SOFTNESS = 20;   // lower = the give saturates sooner, so the pull feels more resisted
const GRAVITY = 2200;             // px/s^2
const DAMPING = 0.992;            // velocity kept per physics step
const STEP = 1 / 120;             // physics step in seconds
const ITERATIONS = 10;            // constraint passes per step
const RING_INV_MASS = 0.5;       // the ring is 4x heavier than a cord segment
const VIEWPORT_MARGIN = 8;

interface Point {
    x: number;
    y: number;
    px: number;       // previous position; (x - px) is the velocity (Verlet integration)
    py: number;
    invMass: number;  // 0 = pinned
}

type PanelState = 'closed' | 'open';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

@Component({
    selector: 'app-qr-cord',
    templateUrl: './qr-cord.component.html',
    styleUrls: ['./qr-cord.component.scss'],
})
export class QrCordComponent implements AfterViewInit, OnInit, OnDestroy {
    @Input() code?: string | null;

    @ViewChild('overlay', { static: true }) private overlayRef!: ElementRef<HTMLElement>;
    @ViewChild('clip', { static: true }) private clipRef!: ElementRef<HTMLElement>;
    @ViewChild('panel', { static: true }) private panelRef!: ElementRef<HTMLElement>;
    @ViewChild('hook', { static: true }) private hookRef!: ElementRef<SVGPathElement>;
    @ViewChild('cordShadow', { static: true }) private cordShadowRef!: ElementRef<SVGPathElement>;
    @ViewChild('cord', { static: true }) private cordRef!: ElementRef<SVGPathElement>;
    @ViewChild('cordStrands', { static: true }) private strandsRef!: ElementRef<SVGPathElement>;
    @ViewChild('ring', { static: true }) private ringRef!: ElementRef<SVGCircleElement>;
    @ViewChild('ringHit', { static: true }) private ringHitRef!: ElementRef<SVGCircleElement>;

    // --- geometry, in viewport pixels ---
    private origin = { x: 0, y: 0 };       // the hook: a point on the banner's bottom edge
    private anchorX = 0;                   // x of the cord's fixed end (the middle of the panel)
    private mount = { x: 0, y: 0 };        // where the ring's centre sits when hung on the hook

    // --- state ---
    private points: Point[] = [];
    private state: PanelState = 'closed';
    private reveal = 0;                    // how far the panel is pulled out: 0..PANEL_HEIGHT
    private panelTarget: number | null = null;
    private closingFromOpen = false;
    private mounted = true;
    private dragging = false;
    private pointer = { x: 0, y: 0 };
    private pullExcess = 0;                // open panel: how far the pointer is beyond the taut cord

    // --- animation loop ---
    private raf = 0;
    private last = 0;
    private acc = 0;
    private rest = 0;

    private scale: number = 1;

    private resizeObserver?: ResizeObserver;

    public qrUrl$!: Observable<string>;

    constructor(private host: ElementRef<HTMLElement>, private zone: NgZone, private utilService: UtilService, private gameIdService: gameIdService) {
    }

    ngOnInit(): void {
        const gameId$: Observable<string> = this.gameIdService.getGameId();

        const host$: Observable<string> = this.utilService.getIp().pipe(
            tap(x => console.log('ip', x)),
            map(ip => `http://${ip}:5000`),
            take(1),
            shareReplay(1)
        );

        this.qrUrl$ = combineLatest([host$, gameId$.pipe(tap(x => console.log('gameId', x)))]).pipe(
            map(([host, gameId]) => `${host}?gameId=${gameId}`)
        );
    }

    ngAfterViewInit(): void {
        // Move the overlay to <body>: it is position: fixed and must not be affected by
        // transforms, filters or stacking contexts of the banner it is projected into
        document.body.appendChild(this.overlayRef.nativeElement);

        this.ringRef.nativeElement.setAttribute('r', String(RING_RADIUS));
        this.ringHitRef.nativeElement.setAttribute('r', String(RING_RADIUS + 12));
        this.setState('closed');

        this.zone.runOutsideAngular(() => {
            const hit = this.ringHitRef.nativeElement;
            hit.addEventListener('pointerdown', this.onPointerDown);
            hit.addEventListener('pointermove', this.onPointerMove);
            hit.addEventListener('pointerup', this.onPointerUp);
            hit.addEventListener('pointercancel', this.onPointerUp);
            hit.addEventListener('keydown', this.onKeyDown);
            window.addEventListener('resize', this.onViewportChange);
            window.addEventListener('scroll', this.onViewportChange, { passive: true, capture: true });

            this.resizeObserver = new ResizeObserver(() => this.measure());
            this.resizeObserver.observe(document.documentElement);   // root font size changes
            const banner: Element | null = this.host.nativeElement.closest(BANNER_SELECTOR);   // replace with your banner's selector
            if (banner) {
                this.resizeObserver.observe(banner);                    // the banner changing height is what caused the seam
            }
            document.fonts?.ready.then(() => this.measure());           // a late font swap changes text height

            this.measure();
        });
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.raf);
        const hit = this.ringHitRef.nativeElement;
        hit.removeEventListener('pointerdown', this.onPointerDown);
        hit.removeEventListener('pointermove', this.onPointerMove);
        hit.removeEventListener('pointerup', this.onPointerUp);
        hit.removeEventListener('pointercancel', this.onPointerUp);
        hit.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('resize', this.onViewportChange);
        window.removeEventListener('scroll', this.onViewportChange, true);
        this.overlayRef.nativeElement.remove();   // it was moved out of our own view, so Angular won't remove it
    }

    // ------------------------------------------------------------------
    // Layout
    // ------------------------------------------------------------------

    private onViewportChange = (): void => this.measure();

    /** Reads where the banner's hook slot is and positions everything relative to it. */
    private measure(): void {
        const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
        this.overlayRef.nativeElement.style.setProperty('--s', String(scale));

        const rect = this.host.nativeElement.getBoundingClientRect();
        const origin = { x: rect.left / scale, y: rect.top / scale };            // was rect.left, rect.top
        const half = PANEL_WIDTH / 2 + VIEWPORT_MARGIN;
        const anchorX = clamp(origin.x + HOOK_TO_ANCHOR_X, half, window.innerWidth / scale - half);

        const moved = Math.abs(origin.x - this.origin.x) > 0.5
            || Math.abs(origin.y - this.origin.y) > 0.5
            || Math.abs(anchorX - this.anchorX) > 0.5;
        if (!moved && this.points.length) {
            return;
        }

        this.origin = origin;
        this.anchorX = anchorX;
        this.mount = { x: origin.x - 5, y: origin.y + RING_RADIUS + 8 };

        const clip = this.clipRef.nativeElement;
        clip.style.left = `${anchorX - PANEL_WIDTH / 2 - PANEL_SHADOW_PAD}px`;
        clip.style.top = `${origin.y}px`;
        clip.style.width = `${PANEL_WIDTH + 2 * PANEL_SHADOW_PAD}px`;
        clip.style.height = `${PANEL_HEIGHT + 40}px`;

        const panel = this.panelRef.nativeElement;
        panel.style.left = `${PANEL_SHADOW_PAD}px`;
        panel.style.width = `${PANEL_WIDTH}px`;
        panel.style.height = `${PANEL_HEIGHT + PANEL_BUFFER}px`;
        panel.style.setProperty('--buffer', `${PANEL_BUFFER}px`);

        // a small J-shaped hook: down from the banner's edge, curling up
        this.hookRef.nativeElement.setAttribute('d', `M${origin.x} ${origin.y} v5 a5 5 0 0 1 -10 0 v-3`);

        this.resetCord();
    }

    /** Lays the cord out in a straight line and lets gravity settle it. */
    private resetCord(): void {
        const ax = this.anchorX;
        const ay = this.origin.y + this.reveal;
        const end = this.mounted ? this.mount : { x: ax, y: ay + CORD_LENGTH };

        this.points = Array.from({ length: SEGMENTS }, (_, i) => {
            const t = i / (SEGMENTS - 1);
            const x = ax + (end.x - ax) * t;
            const y = ay + (end.y - ay) * t;
            const invMass = i === 0 ? 0 : i === SEGMENTS - 1 ? RING_INV_MASS : 1;
            return { x, y, px: x, py: y, invMass };
        });
        this.wake();
    }

    // ------------------------------------------------------------------
    // Interaction
    // ------------------------------------------------------------------

    private onPointerDown = (ev: PointerEvent): void => {
        if (this.panelTarget !== null) {
            return;   // the panel is still moving
        }
        ev.preventDefault();
        this.ringHitRef.nativeElement.setPointerCapture(ev.pointerId);
        this.dragging = true;
        this.mounted = false;
        this.pullExcess = 0;
        this.pointer = { x: ev.clientX / this.scale, y: ev.clientY / this.scale };
        this.ringHitRef.nativeElement.style.cursor = 'grabbing';
        this.wake();
    };

    private onPointerMove = (ev: PointerEvent): void => {
        if (!this.dragging) {
            return;
        }
        this.pointer = { x: ev.clientX / this.scale, y: ev.clientY / this.scale };
        this.wake();
    };

    private onPointerUp = (): void => {
        if (!this.dragging) {
            return;
        }
        this.dragging = false;
        this.ringHitRef.nativeElement.style.cursor = 'grab';
        this.release();
        this.wake();
    };

    private onKeyDown = (ev: KeyboardEvent): void => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            this.toggle();
        }
    };

    /** Projector-screen behaviour: the screen decides what happens when you let go. */
    private release(): void {
        const ring = this.points[this.points.length - 1];

        if (this.state === 'closed') {
            if (this.reveal >= PANEL_HEIGHT * OPEN_FRACTION) {
                this.setState('open');
                this.panelTarget = PANEL_HEIGHT;
            } else {
                // not pulled far enough: the screen rolls back up
                this.panelTarget = 0;
                this.closingFromOpen = false;
                const toHook = Math.hypot(ring.x - this.mount.x, ring.y - this.mount.y);
                if (toHook < MOUNT_DISTANCE) {
                    this.mounted = true;
                }
            }
        } else if (this.pullExcess >= CLOSE_PULL) {
            // open and pulled down a bit again: the screen rolls up
            this.setState('closed');
            this.panelTarget = 0;
            this.closingFromOpen = true;
        } else {
            // open and not pulled far enough: the panel springs back up to its resting position
            this.panelTarget = PANEL_HEIGHT;
        }
        this.pullExcess = 0;
    }

    /** Keyboard fallback: opens or closes without dragging. */
    private toggle(): void {
        if (this.dragging || this.panelTarget !== null) {
            return;
        }
        if (this.state === 'closed') {
            this.mounted = false;
            this.setState('open');
            this.panelTarget = PANEL_HEIGHT;
        } else {
            this.setState('closed');
            this.panelTarget = 0;
            this.closingFromOpen = true;
        }
        this.wake();
    }

    private setState(state: PanelState): void {
        this.state = state;
        const open = state === 'open';
        this.ringHitRef.nativeElement.setAttribute('aria-expanded', String(open));
        this.panelRef.nativeElement.setAttribute('aria-hidden', String(!open));
    }

    // ------------------------------------------------------------------
    // Animation loop
    // ------------------------------------------------------------------

    private wake(): void {
        if (this.raf) {
            return;
        }
        this.rest = 0;
        this.acc = 0;
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.frame);
    }

    private frame = (time: number): void => {
        const dt = Math.min((time - this.last) / 1000, 0.05);
        this.last = time;
        this.acc += dt;

        while (this.acc >= STEP) {
            this.stepPanel(STEP);
            this.step(STEP);
            this.acc -= STEP;
        }

        this.render();
        this.raf = this.isSettled() ? 0 : requestAnimationFrame(this.frame);   // the loop sleeps when nothing moves
    };

    private isSettled(): boolean {
        if (this.dragging || this.panelTarget !== null) {
            this.rest = 0;
            return false;
        }
        let energy = 0;
        for (const p of this.points) {
            energy += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
        }
        this.rest = energy < 0.4 ? this.rest + 1 : 0;
        return this.rest > 20;
    }

    /** Moves the panel: follows the pointer while dragging, otherwise eases to where it should end up. */
    private stepPanel(dt: number): void {
        if (this.dragging) {
            if (this.state === 'closed') {
                // the cord is slack for its first CORD_LENGTH px; after that the panel is dragged down with it
                const desired = clamp(this.pointer.y - this.origin.y - CORD_LENGTH, 0, PANEL_HEIGHT);
                this.reveal += (desired - this.reveal) * 0.35;
            } else {
                // open: the panel is fully out, so pulling on the cord only gives it a little extra travel,
                // with growing resistance, like the spring-loaded roller of a projector screen
                this.pullExcess = Math.max(0, this.pointer.y - (this.origin.y + PANEL_HEIGHT + CORD_LENGTH));
                const give = PANEL_GIVE * (1 - Math.exp(-this.pullExcess / PANEL_GIVE_SOFTNESS));
                this.reveal += (PANEL_HEIGHT + give - this.reveal) * 0.35;
            }
        } else if (this.panelTarget !== null) {
            this.reveal += (this.panelTarget - this.reveal) * (1 - Math.exp(-dt * 10));
            if (Math.abs(this.panelTarget - this.reveal) < 0.4) {
                this.reveal = this.panelTarget;
                if (this.panelTarget === 0 && this.closingFromOpen) {
                    this.mounted = true;   // after closing, the ring goes back on its hook by itself
                }
                this.panelTarget = null;
                this.closingFromOpen = false;
            }
        }
    }

    // ------------------------------------------------------------------
    // Rope physics (Verlet integration + distance constraints)
    // ------------------------------------------------------------------

    private step(dt: number): void {
        const pts = this.points;
        const n = pts.length;
        const anchor = pts[0];
        const ring = pts[n - 1];
        const segment = CORD_LENGTH / (SEGMENTS - 1);

        // the fixed end travels with the panel's bottom edge
        anchor.x = anchor.px = this.anchorX;
        anchor.y = anchor.py = this.origin.y + this.reveal;

        // the ring is either on its hook, in the hand, or a free body
        if (this.mounted) {
            const k = 1 - Math.exp(-dt * 9);
            ring.invMass = 0;
            ring.px = ring.x;
            ring.py = ring.y;
            ring.x += (this.mount.x - ring.x) * k;
            ring.y += (this.mount.y - ring.y) * k;
        } else if (this.dragging) {
            ring.invMass = 0;
            let dx = this.pointer.x - anchor.x;
            let dy = this.pointer.y - anchor.y;
            const dist = Math.hypot(dx, dy);
            const max = CORD_LENGTH * MAX_STRETCH;
            if (dist > max) {
                dx *= max / dist;
                dy *= max / dist;
            }
            ring.px = ring.x;   // keeping px lets the ring keep its speed when released: a flick swings
            ring.py = ring.y;
            ring.x += (anchor.x + dx - ring.x) * 0.35;
            ring.y += (anchor.y + dy - ring.y) * 0.35;
        } else {
            ring.invMass = RING_INV_MASS;
        }

        // integrate the free points
        const g = GRAVITY * dt * dt;
        for (let i = 1; i < n; i++) {
            const p = pts[i];
            if (p.invMass === 0) {
                continue;
            }
            const vx = (p.x - p.px) * DAMPING;
            const vy = (p.y - p.py) * DAMPING;
            p.px = p.x;
            p.py = p.y;
            p.x += vx;
            p.y += vy + g;
        }

        // a rope resists stretching but not bending, so only constrain segments that are too long
        for (let it = 0; it < ITERATIONS; it++) {
            const forward = it % 2 === 0;
            for (let k = 0; k < n - 1; k++) {
                const i = forward ? k : n - 2 - k;
                const a = pts[i];
                const b = pts[i + 1];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy) || 0.0001;
                if (dist <= segment) {
                    continue;
                }
                const w = a.invMass + b.invMass;
                if (w === 0) {
                    continue;
                }
                const corr = (dist - segment) / dist / w;
                a.x += dx * corr * a.invMass;
                a.y += dy * corr * a.invMass;
                b.x -= dx * corr * b.invMass;
                b.y -= dy * corr * b.invMass;
            }
        }

        // keep loose bits on screen
        for (let i = 1; i < n; i++) {
            const p = pts[i];
            if (p.invMass === 0) {
                continue;
            }
            p.x = clamp(p.x, RING_RADIUS, window.innerWidth / this.scale - RING_RADIUS);
            p.y = clamp(p.y, 0, window.innerHeight / this.scale - RING_RADIUS - 4);
        }
    }

    // ------------------------------------------------------------------
    // Rendering: written straight to the DOM, so no change detection per frame
    // ------------------------------------------------------------------

    private render(): void {
        const pts = this.points;
        const n = pts.length;
        const ring = pts[n - 1];
        const prev = pts[n - 2];

        // the cord ends where it meets the ring's rim, not at its centre
        const ex = ring.x - prev.x;
        const ey = ring.y - prev.y;
        const len = Math.hypot(ex, ey) || 1;
        const tx = ring.x - (ex / len) * RING_RADIUS;
        const ty = ring.y - (ey / len) * RING_RADIUS;

        let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < n - 1; i++) {
            const mx = (pts[i].x + pts[i + 1].x) / 2;
            const my = (pts[i].y + pts[i + 1].y) / 2;
            d += ` Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
        }
        d += ` L${tx.toFixed(1)} ${ty.toFixed(1)}`;

        this.cordShadowRef.nativeElement.setAttribute('d', d);
        this.cordRef.nativeElement.setAttribute('d', d);
        this.strandsRef.nativeElement.setAttribute('d', d);

        for (const circle of [this.ringRef.nativeElement, this.ringHitRef.nativeElement]) {
            circle.setAttribute('cx', ring.x.toFixed(1));
            circle.setAttribute('cy', ring.y.toFixed(1));
        }

        this.panelRef.nativeElement.style.transform = `translateY(${(this.reveal - PANEL_HEIGHT - PANEL_BUFFER).toFixed(1)}px)`;
        this.clipRef.nativeElement.style.visibility = this.reveal > 0.5 ? 'visible' : 'hidden';
    }
}