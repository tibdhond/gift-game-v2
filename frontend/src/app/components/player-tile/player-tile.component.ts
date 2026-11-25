import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
    selector: 'app-player-tile',
    templateUrl: './player-tile.component.html',
    styleUrls: ['./player-tile.component.scss']
})
export class PlayerTileComponent {
    @Input() avatarPath?: string;
    @Input() isProcessing: boolean = false;
    @Input() highlight: boolean = false;
    @Input() badge: boolean = false;
    @Input() badgeMessage: string = "";
    @Input() name: string = "";
    @Input() deleteIcon: boolean = false;
    @Input() infoText?: string;
    @Input() clickable: boolean = false
    @Input() selected: boolean = false

    @Output() onTileClicked: EventEmitter<void> = new EventEmitter();
    @Output() onDeleteClicked: EventEmitter<void> = new EventEmitter();

    @ViewChild('wrap') wrap!: ElementRef<HTMLElement>;
    @ViewChild('card') card!: ElementRef<HTMLElement>;
    @ViewChild('front') front!: ElementRef<HTMLElement>;
    @ViewChild('flap') flap!: ElementRef<HTMLElement>;
    @ViewChild('slot') slot!: ElementRef<HTMLElement>;
    @ViewChild('flapLayer') flapLayer!: ElementRef<HTMLElement>;
    @ViewChild('aboveLayer') aboveLayer!: ElementRef<HTMLElement>;

    private anims: Animation[] = [];

    private run(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation {
        const anim = el.animate(keyframes, { fill: 'both', ...options });
        this.anims.push(anim);
        return anim;
    }

    async pack(): Promise<void> {
        const card = this.card.nativeElement;
        const front = this.front.nativeElement;
        const flap = this.flap.nativeElement;

        const SCALE = 0.87;           // tile shrinks by 13%
        const TILT = 'rotate(-2deg)'; // same tilt as the envelope layers
        const V_DEPTH = 0.55;         // must match the 55% in .env-front's clip-path

        // Measure before anything moves
        const c = card.getBoundingClientRect();
        const f = front.getBoundingClientRect();
        const cardCenterY = c.top + c.height / 2;
        const envCenterY = f.top + f.height / 2;

        // Rise until the shrunken tile's bottom edge clears the top of the envelope.
        // The -4 is the selected state's translateY(-4px) the animation starts from.
        const rise = f.top - 8 - (cardCenterY + (c.height * SCALE) / 2);
        const start = 'translateY(-4px) scale(1) rotate(0deg)';
        const raised = `translateY(${-4 + rise}px) scale(${SCALE}) ${TILT}`;
        const inside = `translateY(${-4 + (envCenterY - cardCenterY)}px) scale(${SCALE}) ${TILT}`;

        // 3a) tile moves up and shrinks
        await this.run(card, [{ transform: start }, { transform: raised }],
            { duration: 400, easing: 'ease-out' }).finished;

        // 3b) pocket appears in front of the tile (they don't overlap yet, so no visible pop),
        //     and the slot starts clipping everything below the envelope's bottom edge
        await this.run(front, [{ opacity: 0 }, { opacity: 1 }], { duration: 1 }).finished;
        this.aboveLayer.nativeElement.style.zIndex = '2';
        this.slot.nativeElement.style.clipPath = 'inset(-2000px -2000px -4px -2000px)';

        // 3c) tile slides down into the envelope, behind the pocket
        await this.run(card, [{ transform: raised }, { transform: inside }],
            { duration: 550, delay: 100, easing: 'ease-in-out' }).finished;

        // 4) the flap jumps above the pocket and folds shut
        this.flapLayer.nativeElement.style.zIndex = '3';
        const k = (front.offsetHeight * V_DEPTH) / flap.offsetHeight;
        await this.run(flap, [
            { transform: 'perspective(800px) rotateX(0deg) scaleY(1)', background: '#e3d2ad' },
            { transform: `perspective(800px) rotateX(180deg) scaleY(${k})`, background: '#eadbb8' },
        ], { duration: 500, easing: 'ease-in-out' }).finished;
    }

    /** Step 5: the closed envelope leaves to the right */
    async flyAway(): Promise<void> {
        const el = this.wrapEl;
        const rect = el.getBoundingClientRect(); // measured before anything moves
        const dx = window.innerWidth - rect.left + 80;
        const duration = 900;

        this.spawnDust(rect);

        // Speed builds up for 70% of the time, then stays constant.
        // Distance covered in the acceleration phase = 0.35v, in the constant phase = 0.3v,
        // so the acceleration phase ends at 0.35 / 0.65 = ~54% of the total distance.
        const accelEnd = 0.7;
        const distAtAccelEnd = (accelEnd / 2) / (accelEnd / 2 + (1 - accelEnd));

        // cubic-bezier(1/3, 0, 2/3, 1/3) is an exact t² curve: constant acceleration
        const move = this.run(el, [
            { translate: '0px', offset: 0, easing: 'cubic-bezier(0.333, 0, 0.667, 0.333)' },
            { translate: `${dx * distAtAccelEnd}px`, offset: accelEnd, easing: 'linear' },
            { translate: `${dx}px`, offset: 1 },
        ], { duration });

        // The "g-force": the top lags behind, the body gets stretched and flattened.
        // It peaks right after launch and has relaxed by the time acceleration stops.
        const squash = 'skewX(12deg) scale(1.1, 0.93)';
        const deform = this.run(el, [
            { transform: 'none', offset: 0 },
            { transform: squash, offset: 0.2, easing: 'ease-in-out' },
            { transform: 'none', offset: 0.85 },
            { transform: 'none', offset: 1 },
        ], { duration });

        await Promise.all([move.finished, deform.finished]);
    }

    /** If the request fails: play everything backwards */
    async unpack(): Promise<void> {
        for (const anim of [...this.anims].reverse()) {
            anim.reverse();
            await anim.finished;
        }
        this.anims.forEach(a => a.cancel());
        this.anims = [];
        this.slot.nativeElement.style.clipPath = '';
        this.flapLayer.nativeElement.style.zIndex = '';
        this.aboveLayer.nativeElement.style.zIndex = '';
    }

    private spawnDust(rect: DOMRect): void {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        // Circles of one cloud: cx, cy, r (in a 100x70 box). Drawn twice: first fat with a stroke
        // (that becomes the outline), then plain on top (that hides the outline between the circles).
        const circles = [[28, 44, 20], [52, 34, 26], [76, 45, 19], [50, 52, 20]];
        const outline = circles.map(([x, y, r]) =>
            `<circle cx="${x}" cy="${y}" r="${r}" fill="#9fb3c8" stroke="#9fb3c8" stroke-width="9"/>`).join('');
        const fill = circles.map(([x, y, r]) =>
            `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff"/>`).join('');
        const cloud = `<svg viewBox="-6 -6 112 82" width="100%" height="100%" aria-hidden="true">${outline}${fill}</svg>`;

        const COUNT = 9;
        for (let i = 0; i < COUNT; i++) {
            const w = 44 + Math.random() * 40;
            const puff = document.createElement('div');
            puff.innerHTML = cloud;

            Object.assign(puff.style, {
                position: 'fixed',
                left: `${rect.left + Math.random() * 30 - w / 2}px`,
                top: `${rect.top + rect.height * (0.7 + Math.random() * 0.2)}px`,
                width: `${w}px`,
                height: `${w * 0.73}px`,
                pointerEvents: 'none',
                zIndex: '1000',
            });
            document.body.appendChild(puff);

            const rot = (Math.random() - 0.5) * 30;
            const driftX = -(60 + Math.random() * 100);
            const driftY = -(Math.random() * 50);

            const anim = puff.animate([
                { transform: `translate(0, 0) scale(0) rotate(${rot}deg)`, easing: 'ease-out' },
                {
                    transform: `translate(${driftX * 0.2}px, ${driftY * 0.2}px) scale(1.2) rotate(${rot}deg)`,
                    offset: 0.18, easing: 'ease-in-out'
                },                       // pop, overshooting
                {
                    transform: `translate(${driftX * 0.4}px, ${driftY * 0.4}px) scale(1) rotate(${rot}deg)`,
                    offset: 0.32, easing: 'ease-in'
                },                           // settle
                { transform: `translate(${driftX}px, ${driftY}px) scale(0) rotate(${rot * 1.5}deg)` },
            ], {
                duration: 550 + Math.random() * 250,
                delay: Math.random() * 120,
                fill: 'both',
            });

            anim.onfinish = anim.oncancel = () => puff.remove();
        }
    }

    public onClick(): void {
        this.onTileClicked.emit();
    }

    public onDeleteClick(): void {
        this.onDeleteClicked.emit();
    }


    get wrapEl(): HTMLElement { return this.wrap.nativeElement; }
}
