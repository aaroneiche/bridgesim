///<reference path="../bower_components/polymer-ts/polymer-ts.d.ts" />

import * as Net from '../net/message';

export interface ChatEvent { text: string }

const TOGGLE_KEY = 192;  // backquote

@component('bridgesim-chat')
export class Chat extends polymer.Base {
  @property({type: Boolean, value: false}) noInput;

  private text: string = '';
  private log: Net.ReceiveChat[];

  ready(): void {
    this.log = [];
    this.listen(window, 'keydown', 'open');
  }

  detached(): void { this.unlisten(window, 'keydown', 'open'); }

  private send(): void {
    if (!this.text.trim()) {
      return;
    }
    this.fire('net-send', <Net.Message>{
      sendChat: {
        text: this.text,
      },
    });
    this.text = '';
  }

  receiveMsg(chat: Net.ReceiveChat): void { this.unshift('log', chat); }

  private open(ev: KeyboardEvent): void {
    if (this.noInput) {
      return;
    }
    if (ev.keyCode === TOGGLE_KEY) {
      this.toggle();
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  @listen('keydown')
  private swallowOrClose(ev: KeyboardEvent): void {
    if (this.noInput) {
      return;
    }
    if (ev.keyCode === TOGGLE_KEY && !ev.repeat) {
      this.toggle();
      ev.preventDefault();
    }
    ev.stopPropagation();
  }

  private toggle(): void {
    this.hidden = !this.hidden;
    if (!this.hidden) {
      this.$.input.focus();
    }
  }

  private formatTimestamp(millis: number): string {
    const d = new Date(millis);
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' +
        pad(d.getSeconds());
  }
}
Chat.register();

function pad(val: number): string {
  return ('0' + val).substr(-2);
}
