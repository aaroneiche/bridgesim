///<reference path="../../bower_components/babylonjs/dist/babylon.2.2.d.ts" />
///<reference path="../../core/ship.ts" />

namespace Bridgesim.Client.Renderer {
  export class Ship {
    public ship: Core.Ship;
    public mesh: BABYLON.Mesh;

    constructor(ship: Core.Ship, scene: BABYLON.Scene) {
      this.ship = ship;
      this.mesh = BABYLON.Mesh.CreateBox('box', 0.5, scene);
      this.mesh.scaling.y = 0.5;
      this.mesh.scaling.x = 0.5;
    }

    update(alpha: number) {
      const s = this.ship;
      const lerpX = s.prevX + (alpha * (s.x - s.prevX));
      const lerpY = s.prevY + (alpha * (s.y - s.prevY));
      this.mesh.position.x = lerpX;
      this.mesh.position.z = lerpY;
      this.mesh.rotation.y = -Math.PI/180 * s.heading;
    }
  }
}
