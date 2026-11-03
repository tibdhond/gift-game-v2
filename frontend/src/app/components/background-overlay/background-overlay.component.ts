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

  constructor() {}

  ngOnInit(): void {
    this.updateParticles();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateParticles();
  }

  private updateParticles(): void {
    const isDesktop = window.innerWidth >= 1024;
    const count = isDesktop ? 35 : 12;
    
    const newParticles: Particle[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      // Map to a 90% area to provide a consistent margin
      // If cols is 1 (count < 2), we default to 0 to avoid division by zero
      const xBase = cols > 1 ? (col / (cols - 1)) * 80 + 10 : 50;
      const yBase = cols > 1 ? (row / (cols - 1)) * 80 + 10 : 50;
      
      // Jitter allows for a natural, non-grid look while maintaining even spread
      const jitter = (100 / cols) * 0.6;
      
      newParticles.push({
        id: i,
        top: yBase + (Math.random() * jitter * 2 - jitter),
        left: xBase + (Math.random() * jitter * 2 - jitter),
        size: Math.floor(Math.random() * 20) + 5,
        color: this.getRandomColor(),
        duration: Math.floor(Math.random() * 15) + 15,
        delay: Math.floor(Math.random() * 20) - 10
      });
    }
    this.particles = newParticles;
  }

  private getRandomColor(): string {
    const colors = ['#d4af37', '#c0392b', '#f1c40f', '#2ecc71', '#9b59b6', '#3498db', '#e67e22', '#ecf0f1', '#f39c12', '#bdc3c7'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  setMode(mode: BackgroundType) {
    this.type = mode;
  }
}
