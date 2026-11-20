import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';

export interface EyePost {
    id: string;
    waiting: boolean;   // true while this player still has to vote
}

type Mode = 'wander' | 'look' | 'lock';
type LockPhase = 'ramp' | 'hold';
interface Vec { x: number; y: number; }

// ---------- Tunables (seconds unless noted) ----------
const IDLE_MIN = 4;                 // between casual looks at a signpost
const IDLE_MAX = 9;
const LOOK_MIN = 1.8;               // how long a casual look lasts
const LOOK_MAX = 3.2;
const SACCADE_MIN = 0.5;            // between random glances while wandering
const SACCADE_MAX = 1.9;
const BLINK_MIN = 2;
const BLINK_MAX = 6;
const BLINK_DURATION = 0.18;

const PAUSE_MIN = 5;              // two or fewer left: pause between locks
const PAUSE_MAX = 11;
const RAMP_MIN = 5;                 // two or fewer left: how long a lock grows and shakes before letting go
const RAMP_MAX = 7;
const RAMP_LAST = 9;                // one left: how long the build-up to full size takes
const HOLD = 0.7;                   // at full size, before letting go
const RELEASE_TIME = 0.35;          // shrinking back to normal

const MAX_SCALE = 2;                // limit on the growth
const REACH = 0.6;                  // grown eyes reach at most this fraction of the way to the signpost
const MAX_SHAKE_REM = 0.35;
const MAX_ROTATE_DEG = 1.5;

const LOCK_CHANCE = 0.65;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const easeIn = (t: number) => t * t * t;

/**
 * Two eyes that look around, glance at signposts and, when only one or two players still
 * have to vote, lock on to those players' signposts, shaking and growing towards them.
 */
@Component({
    selector: 'app-animated-eyes',
    templateUrl: './animated-eyes.component.html',
    styleUrls: ['./animated-eyes.component.scss'],
})
export class AnimatedEyesComponent implements AfterViewInit, OnDestroy {
    /** Every signpost, and whether its player still has to vote. */
    @Input() posts: EyePost[] = [];

    /** Finds the element to look at for a post (the board of the signpost). */
    @Input() locate: (id: string) => HTMLElement | null = () => null;

    @ViewChild('eyes', { static: true }) private eyesRef!: ElementRef<HTMLElement>;
    @ViewChild('left', { static: true }) private leftRef!: ElementRef<HTMLElement>;
    @ViewChild('right', { static: true }) private rightRef!: ElementRef<HTMLElement>;

    // --- behaviour ---
    private mode: Mode = 'wander';
    private idle = 3;                     // wander: seconds until the next decision
    private timer = 0;                    // look: seconds left
    private targetId: string | null = null;
    private targetEl: HTMLElement | null = null;
    private lastLockId: string | null = null;
    private lockPhase: LockPhase = 'ramp';
    private lockElapsed = 0;
    private rampTime = RAMP_MIN;
    private holdTimer = 0;
    private lastWaiting = -1;

    // --- look and feel ---
    private pressure = 0;                 // 0..1: how hard the eyes are locked
    private maxScale = 1;
    private origin: Vec = { x: 50, y: 50 };   // transform origin in %, on the side away from the target
    private saccade = 0;
    private wander: Vec = { x: 0, y: 0 };
    private gazeL: Vec = { x: 0, y: 0 };
    private gazeR: Vec = { x: 0, y: 0 };
    private blinkTimer = rand(BLINK_MIN, BLINK_MAX);
    private blinkT = -1;                  // -1 = not blinking

    // --- measurements (px) ---
    private rem = 16;
    private hx = 0;
    private hy = 0;
    private eyeRadius = 0;
    private spacing = 0;

    private reduced = false;
    private raf = 0;
    private last = 0;

    constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) { }

    ngAfterViewInit(): void {
        this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        this.measure();
        this.zone.runOutsideAngular(() => {
            window.addEventListener('resize', this.measure);
            this.last = performance.now();
            this.raf = requestAnimationFrame(this.frame);
        });
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this.measure);
    }

    /** Sizes come from layout properties, which transforms (the growing) don't change. */
    private measure = (): void => {
        const eyes = this.eyesRef.nativeElement;
        const left = this.leftRef.nativeElement;
        const right = this.rightRef.nativeElement;
        this.rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        this.hx = eyes.offsetWidth / 2;
        this.hy = eyes.offsetHeight / 2;
        this.eyeRadius = left.offsetWidth / 2;
        this.spacing = right.offsetLeft - left.offsetLeft;   // centre to centre
    };

    private frame = (time: number): void => {
        const dt = Math.min((time - this.last) / 1000, 0.05);
        this.last = time;
        this.think(dt);
        this.animate(dt);
        this.raf = requestAnimationFrame(this.frame);
    };

    // ------------------------------------------------------------------
    // Decisions
    // ------------------------------------------------------------------

    private think(dt: number): void {
        const waiting = this.posts.filter(post => post.waiting);

        // The wait just got shorter: stop idling and get to work
        if (waiting.length !== this.lastWaiting) {
            if (this.lastWaiting !== -1 && waiting.length > 0 && waiting.length <= 2 && this.mode === 'wander') {
                this.idle = Math.min(this.idle, 3);
            }
            this.lastWaiting = waiting.length;
        }

        switch (this.mode) {
            case 'wander':
                this.idle -= dt;
                if (this.idle <= 0) {
                    this.decide(waiting);
                }
                break;
            case 'look':
                this.timer -= dt;
                if (this.timer <= 0) {
                    this.endSpell(waiting);
                }
                break;
            case 'lock':
                this.thinkLock(dt, waiting);
                break;
        }
    }

    private decide(waiting: EyePost[]): void {
        if (waiting.length === 0 || this.posts.length === 0) {
            this.idle = rand(IDLE_MIN, IDLE_MAX);
        } else if (waiting.length <= 2) {
            if (Math.random() < LOCK_CHANCE) {
                this.startLock(waiting);      // only ever the players who are still holding things up
            } else {
                this.idle = rand(PAUSE_MIN, PAUSE_MAX);   // not now: keep looking around a while longer
            }
        } else {
            const post = this.posts[Math.floor(Math.random() * this.posts.length)];
            this.mode = 'look';
            this.targetId = post.id;
            this.targetEl = null;
            this.timer = rand(LOOK_MIN, LOOK_MAX);
        }
    }

    private startLock(waiting: EyePost[]): void {
        // with two left, alternate between them
        const options = waiting.length > 1 ? waiting.filter(post => post.id !== this.lastLockId) : waiting;
        const post = options[Math.floor(Math.random() * options.length)];

        this.mode = 'lock';
        this.targetId = post.id;
        this.targetEl = null;
        this.lastLockId = post.id;
        this.lockPhase = 'ramp';
        this.lockElapsed = 0;
        this.rampTime = waiting.length === 1 ? RAMP_LAST : rand(RAMP_MIN, RAMP_MAX);
    }

    private thinkLock(dt: number, waiting: EyePost[]): void {
        if (!waiting.some(post => post.id === this.targetId)) {
            this.endSpell(waiting);      // that player just voted: let go
            return;
        }

        const forever = waiting.length === 1;   // the last one: never let go
        if (this.lockPhase === 'ramp') {
            this.lockElapsed += dt;
            this.pressure = easeIn(Math.min(1, this.lockElapsed / this.rampTime));
            if (this.lockElapsed >= this.rampTime) {
                this.lockPhase = 'hold';
                this.holdTimer = HOLD;
            }
        } else {
            this.pressure = 1;
            if (!forever) {
                this.holdTimer -= dt;
                if (this.holdTimer <= 0) {
                    this.endSpell(waiting);
                }
            }
        }
    }

    private endSpell(waiting: EyePost[]): void {
        this.mode = 'wander';
        this.targetId = null;
        this.targetEl = null;
        this.idle = waiting.length > 0 && waiting.length <= 2 ? rand(PAUSE_MIN, PAUSE_MAX) : rand(IDLE_MIN, IDLE_MAX);
    }

    // ------------------------------------------------------------------
    // Animation
    // ------------------------------------------------------------------

    private animate(dt: number): void {
        const host = this.host.nativeElement.getBoundingClientRect();
        const cx = host.left + host.width / 2;
        const cy = host.top + host.height / 2;
        const half = this.spacing / 2;

        // --- where to look ---
        let aimL = this.wander;
        let aimR = this.wander;

        if (this.mode !== 'wander' && this.targetId) {
            if (!this.targetEl || !this.targetEl.isConnected) {
                this.targetEl = this.locate(this.targetId);
            }
            if (this.targetEl) {
                const rect = this.targetEl.getBoundingClientRect();
                const tx = rect.left + rect.width / 2;
                const ty = rect.top + rect.height / 2;
                aimL = this.directionFrom(cx - half, cy, tx, ty);
                aimR = this.directionFrom(cx + half, cy, tx, ty);

                if (this.mode === 'lock') {
                    const dx = tx - cx;
                    const dy = ty - cy;
                    const dist = Math.hypot(dx, dy) || 1;
                    const ux = dx / dist;
                    const uy = dy / dist;

                    // How far the grown eyes may extend towards the post, without reaching it
                    const extent = this.hx * Math.abs(ux) + this.hy * Math.abs(uy);
                    this.maxScale = clamp(((REACH * dist) / extent + 1) / 2, 1, MAX_SCALE);

                    // Grow away from the far side, so the eyes push towards the post.
                    // Only updated while the eyes are still (almost) normal sized, so nothing jumps.
                    if (this.pressure < 0.02) {
                        this.origin = { x: 50 - ux * 50, y: 50 - uy * 50 };
                    }
                }
            }
        } else {
            this.saccade -= dt;
            if (this.saccade <= 0) {
                this.saccade = rand(SACCADE_MIN, SACCADE_MAX);
                if (Math.random() < 0.18) {
                    this.wander = { x: 0, y: 0 };   // now and then, look straight ahead
                } else {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = rand(0.35, 1);
                    this.wander = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
                }
            }
        }

        if (this.mode !== 'lock') {
            this.pressure = Math.max(0, this.pressure - dt / RELEASE_TIME);
        }

        const k = 1 - Math.exp(-dt * (this.mode === 'lock' ? 20 : 11));
        this.gazeL = { x: this.gazeL.x + (aimL.x - this.gazeL.x) * k, y: this.gazeL.y + (aimL.y - this.gazeL.y) * k };
        this.gazeR = { x: this.gazeR.x + (aimR.x - this.gazeR.x) * k, y: this.gazeR.y + (aimR.y - this.gazeR.y) * k };

        // --- blinking, squinting, frowning ---
        this.blinkTimer -= dt;
        if (this.blinkT < 0 && this.blinkTimer <= 0) {
            this.blinkT = 0;
            this.blinkTimer = rand(BLINK_MIN, BLINK_MAX);
        }
        let blink = 0;
        if (this.blinkT >= 0) {
            this.blinkT += dt;
            blink = Math.sin(Math.PI * Math.min(1, this.blinkT / BLINK_DURATION));
            if (this.blinkT >= BLINK_DURATION) {
                this.blinkT = -1;
            }
        }
        const base = 0.06 + 0.3 * this.pressure;
        const lid = Math.min(1, base + blink * (1 - base));

        // --- write to the DOM ---
        const eyes = this.eyesRef.nativeElement;
        const scale = this.reduced ? 1 : 1 + (this.maxScale - 1) * this.pressure;
        const shake = this.reduced ? 0 : this.pressure * MAX_SHAKE_REM * this.rem;
        const sx = (Math.random() - 0.5) * 2 * shake;
        const sy = (Math.random() - 0.5) * 2 * shake;
        const rot = this.reduced ? 0 : (Math.random() - 0.5) * 2 * this.pressure * MAX_ROTATE_DEG;

        eyes.style.transformOrigin = `${this.origin.x.toFixed(1)}% ${this.origin.y.toFixed(1)}%`;
        eyes.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        eyes.style.setProperty('--lid', lid.toFixed(3));
        eyes.style.setProperty('--frown', this.pressure.toFixed(3));   // was: --brow, an angle
        eyes.style.setProperty('--pupil', (1 - 0.25 * this.pressure).toFixed(3));

        const left = this.leftRef.nativeElement.style;
        left.setProperty('--gx', this.gazeL.x.toFixed(3));
        left.setProperty('--gy', this.gazeL.y.toFixed(3));
        const right = this.rightRef.nativeElement.style;
        right.setProperty('--gx', this.gazeR.x.toFixed(3));
        right.setProperty('--gy', this.gazeR.y.toFixed(3));
    }

    /** Gaze vector (length 0..1) from an eye towards a point: nearby points don't use the full range. */
    private directionFrom(ex: number, ey: number, tx: number, ty: number): Vec {
        const dx = tx - ex;
        const dy = ty - ey;
        const len = Math.hypot(dx, dy) || 1;
        const strength = Math.min(1, len / (this.eyeRadius * 4 || 1));
        return { x: (dx / len) * strength, y: (dy / len) * strength };
    }
}