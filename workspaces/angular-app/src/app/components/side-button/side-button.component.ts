import { CommonModule, JsonPipe } from '@angular/common';
import { Component, ElementRef, Renderer2, Signal, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { ButtonAction } from 'shared-lib/models/controller';
import { MidiEvent } from 'src/app/models/controller';
import { MidiService } from 'src/app/services/midi';

@Component({
  selector: 'app-side-button',
  standalone: true,
  imports: [CommonModule, JsonPipe, FormsModule],
  templateUrl: './side-button.component.html',
  styleUrl: './side-button.component.scss'
})
export class SideButtonComponent {
  mode = input<string>();
  button = input.required<ButtonAction>();
  side = input<'left' | 'right'>();
  activeBank = model<number>();
  message: MidiEvent;

  active = false;

  midi = inject(MidiService);
  renderer = inject(Renderer2);

  selected$: Signal<boolean> = signal<boolean>(false);

  constructor(private el: ElementRef) {
    this.midi.message$.pipe(
      filter((message): message is MidiEvent => !!message))
      .subscribe(message => {
          if (this.button().isShift && message.channel === 4 && message.cc === +this.button().cc && this.mode() === 'performance') {
            console.log('setting active: ', message);
            this.active = message.velocity > 0;
          }
      });

    // effect(() => {
    //   if (this.mode() === 'performance') {
    //     document.querySelectorAll('.button-container'.forEach(buttonContainer => {
    //       this.renderer.removeClass(buttonContainer, 'active');
    //     });
    //   }
    // });
  }

  setSelected(event: Event) {
    if (this.mode() === 'shift' && this.button().cc > 3) {
      this.button().isShift = !this.button().isShift;
    }
    else if (this.mode() !== 'performance') {
      if ((event.currentTarget as HTMLElement).classList.contains('prev') && this.activeBank()! > 0) {
        this.activeBank.set(this.activeBank()! - 1);
      } else if ((event.currentTarget as HTMLElement).classList.contains('next') && this.activeBank()! < 3) {
        this.activeBank.set(this.activeBank()! + 1);
      }
    }
  }
}
