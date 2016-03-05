///<reference path="../bower_components/polymer-ts/polymer-ts.d.ts" />
///<reference path="../engine/const.ts" />
///<reference path="../engine/util.ts" />
///<reference path="../engine/ship.ts" />

// TODO: Key codes are kind of a mess. This should work for Chrome at least.
// See http://unixpapa.com/js/key.html

const KEY_ARROW_L = 37;
const KEY_ARROW_U = 38;
const KEY_ARROW_R = 39;
const KEY_ARROW_D = 40;
const KEY_K = 'K'.charCodeAt(0);
const KEY_L = 'L'.charCodeAt(0);
const KEY_O = 'O'.charCodeAt(0);
const KEY_P = 'P'.charCodeAt(0);
const KEY_S = 'S'.charCodeAt(0);
const KEY_W = 'W'.charCodeAt(0);

@component('bridgesim-input')
class BridgesimInput extends polymer.Base {
  @property({type: Object}) ship: Ship;

  private keyPressed: {[key: number]: number} = {};
  private keyBindings: {[key: number]: (tick: number) => void} = {
    [KEY_ARROW_L]: this.turnLeft.bind(this),
    [KEY_ARROW_R]: this.turnRight.bind(this),
    [KEY_ARROW_U]: this.thrustUp.bind(this),
    [KEY_ARROW_D]: this.thrustDown.bind(this),
    [KEY_O]: this.prevShip.bind(this),
    [KEY_P]: this.nextShip.bind(this),
    [KEY_K]: this.prevSubsystem.bind(this),
    [KEY_L]: this.nextSubsystem.bind(this),
    [KEY_W]: this.powerUp.bind(this),
    [KEY_S]: this.powerDown.bind(this),
  };

  ready(): void {
    addEventListener('keydown', this.onKeydown.bind(this));
    addEventListener('keyup', this.onKeyup.bind(this));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }
    this.keyPressed[event.keyCode] = 0;
    console.log('key down', event.keyCode);
  }

  onKeyup(event: KeyboardEvent): void { delete this.keyPressed[event.keyCode]; }

  process(): void {
    for (let key in this.keyPressed) {
      let fn = this.keyBindings[key];
      if (fn) {
        fn(this.keyPressed[key]);
      }
      this.keyPressed[key]++;
    }
  }

  turnLeft(): void { this.ship.turnLeft(); }

  turnRight(): void { this.ship.turnRight(); }

  thrustUp(): void { this.ship.thrustUp(); }

  thrustDown(): void { this.ship.thrustDown(); }

  nextShip(tick: number): void {
    if (tick > 0) {
      return;
    }
    this.fire('next-ship');
  }

  prevShip(tick: number): void {
    if (tick > 0) {
      return;
    }
    this.fire('prev-ship');
  }

  nextSubsystem(tick: number): void {
    if (tick > 0) {
      return;
    }
    if (this.ship.curSubsystem == this.ship.subsystems.length - 1) {
      this.ship.curSubsystem = 0;
    } else {
      this.ship.curSubsystem++;
    }
  }

  prevSubsystem(tick: number): void {
    if (tick > 0) {
      return;
    }
    if (this.ship.curSubsystem == 0) {
      this.ship.curSubsystem = this.ship.subsystems.length - 1;
    } else {
      this.ship.curSubsystem--;
    }
  }

  powerUp(tick: number): void { this.ship.powerUp(); }

  powerDown(tick: number): void { this.ship.powerDown(); }
}
BridgesimInput.register();
