import { CommonModule, JsonPipe } from '@angular/common';
import { Component, ElementRef, Renderer2, effect, inject, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { ButtonAction } from 'shared-lib/models/controller';
import { MidiEvent } from 'src/app/models/controller';
import { MidiService } from 'src/app/services/midi';

@Component({
  selector: 'app-side',
  standalone: true,
  imports: [CommonModule, JsonPipe, FormsModule],
  templateUrl: './side.component.html',
  styleUrl: './side.component.scss'
})
export class SideComponent {
  mode = input<string>();
  buttons = input<ButtonAction[]>();
  side = input<'left' | 'right'>();
  shiftActive = model<boolean>();
  activeBank = model<number>();
  message: MidiEvent;
  selectedButtons = model<ButtonAction[]>([]);

  midi = inject(MidiService);
  renderer = inject(Renderer2);

  constructor(private el: ElementRef) {
    this.midi.message$.pipe(
      filter((message): message is MidiEvent => !!message))
      .subscribe(message => {
        this.buttons()!.forEach(button => {
          if (button.isShift && message.channel === 4 && message.cc === +button.cc && this.mode() === 'performance') {
            console.log('setting active: ', message);
            const button = this.el.nativeElement.querySelector(`.cc${message.cc}`);
            message.velocity > 0 ? this.renderer.addClass(button, 'active') : this.renderer.removeClass(button, 'active');
          }
        });
      });

    effect(() => {
      if (this.mode() === 'performance') {
        document.querySelectorAll('.button-container').forEach(buttonContainer => {
          this.renderer.removeClass(buttonContainer, 'active');
        });
      }
    });
  }

  setSelected(event: Event, button: ButtonAction) {
    if (this.mode() === 'shift') {
      if (this.selectedButtons().includes(button)) {
        this.selectedButtons.set(this.selectedButtons().filter(selectedButton => selectedButton !== button));
      } else {
        this.selectedButtons.set([...this.selectedButtons(), button]);
      }
      (event.currentTarget as HTMLElement).classList.toggle('active');
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
