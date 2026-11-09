import { Component, Input, OnInit, HostListener } from '@angular/core';

export type BackgroundType = 'FLOATING' | 'TEXTURE' | 'PARALLAX' | 'BOKEH';

interface Particle {
    id: number;
    top: number;
    left: number;
    size: number;
    color: string;
    duration: number;
    delay: number;
}

@Component({
    selector: 'app-background-overlay',
    templateUrl: './background-overlay.component.html',
    styleUrls: ['./background-overlay.component.scss']
})
export class BackgroundOverlayComponent implements OnInit {
    @Input() type: BackgroundType = 'BOKEH';

    particles: Particle[] = [];

    constructor() { }

    ngOnInit(): void {
        this.updateParticles();
    }

    private lastWidth = window.innerWidth;

    @HostListener('window:resize')
    onResize(): void {
        if (window.innerWidth === this.lastWidth) {
            return; // only the height changed, e.g. the mobile toolbar collapsing
        }
        this.lastWidth = window.innerWidth;
        this.updateParticles();
    }

    private updateParticles(): void {
        const count = window.innerWidth >= 1024 ? 35 : 20;
        const aspect = window.innerWidth / window.innerHeight; // positions are in %, so scale x to compare real distances
        const candidatesPerPoint = 12;   // higher = more even, lower = more random
        const margin = 3;                // keep particle origins inside 3%..97%

        const points: { x: number; y: number }[] = [];

        for (let i = 0; i < count; i++) {
            let best = { x: 50, y: 50 };
            let bestDistance = -1;

            const tries = i === 0 ? 1 : candidatesPerPoint;
            for (let c = 0; c < tries; c++) {
                const candidate = {
                    x: margin + Math.random() * (100 - 2 * margin),
                    y: margin + Math.random() * (100 - 2 * margin),
                };

                // squared distance to the nearest existing particle
                const nearest = points.reduce((min, p) => {
                    const dx = (candidate.x - p.x) * aspect;
                    const dy = candidate.y - p.y;
                    return Math.min(min, dx * dx + dy * dy);
                }, Infinity);

                if (nearest > bestDistance) {
                    bestDistance = nearest;
                    best = candidate;
                }
            }
            points.push(best);
        }

        this.particles = points.map((point, i) => ({
            id: i,
            top: point.y,
            left: point.x,
            size: Math.floor(Math.random() * 20) + 5,
            color: this.getRandomColor(),
            duration: Math.floor(Math.random() * 15) + 15,
            delay: Math.floor(Math.random() * 20) - 10,
        }));
    }

    private getRandomColor(): string {
        const colors = ['#d4af37', '#c0392b', '#f1c40f', '#2ecc71', '#9b59b6', '#3498db', '#e67e22', '#ecf0f1', '#f39c12', '#bdc3c7'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    setMode(mode: BackgroundType) {
        this.type = mode;
    }
}
