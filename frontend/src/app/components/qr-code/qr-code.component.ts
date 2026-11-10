import { Component, AfterViewInit, OnChanges, Input, ViewChild, ElementRef } from '@angular/core';
import QRCodeStyling from 'qr-code-styling';

@Component({
    selector: 'app-styled-qr',
    template: '<div #target></div>',
    styles: [':host { display: block; line-height: 0; border-radius: 16px; overflow: hidden; }'],
})
export class StyledQrComponent implements AfterViewInit, OnChanges {
    @Input() data = '';
    @Input() size = 260;

    @ViewChild('target', { static: true }) target!: ElementRef<HTMLElement>;
    private qr?: QRCodeStyling;

    ngAfterViewInit(): void {
        this.qr = new QRCodeStyling({
            type: 'svg',
            width: this.size,
            height: this.size,
            data: this.data,
            margin: 16,   // quiet zone: scanners need an empty border
            qrOptions: { errorCorrectionLevel: 'Q' },
            backgroundOptions: { color: '#f7f4ee' },
            dotsOptions: {
                type: 'dots',   // round dots; also try 'rounded' or 'classy-rounded'
                gradient: {
                    type: 'linear',
                    rotation: Math.PI / 4,
                    colorStops: [
                        { offset: 0, color: '#1b4332' },   // spruce green
                        { offset: 1, color: '#a4262c' },   // cranberry
                    ],
                },
            },
            cornersSquareOptions: { type: 'extra-rounded', color: '#a4262c' },
            cornersDotOptions: { type: 'dot', color: '#a4262c' },
        });
        this.qr.append(this.target.nativeElement);
    }

    ngOnChanges(): void {
        this.qr?.update({ data: this.data, width: this.size, height: this.size });
    }
}