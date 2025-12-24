import { Pipe, PipeTransform } from '@angular/core';

@Pipe({

    name: 'toPercentPipe'

})

export class ToPercentPipe implements PipeTransform {

    transform(value: any, ...args: any[]): any {

        if (typeof value != 'number') {
            return value
        }

        return `${Math.round(value * 10000) / 100}%`;

    }
}