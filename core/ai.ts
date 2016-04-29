///<reference path="ship.ts" />
///<reference path="host.ts" />

namespace Bridgesim.Core {
  export class ShipAI implements Tickable {
    constructor(public ship: Ship, public friendliness: number, public ships: Ship[]) {
    }
    tick() {
      // basic swarm logic, move towards nearest ship.
      let nearest = null;
      let nearestDist = 0;
      for (let ship of this.ships) {
        if (ship === this.ship) {
          continue
        }
        const dist = Math.sqrt(Math.pow(ship.x-this.ship.x, 2) + Math.pow(ship.y-this.ship.y, 2));
        if (nearest === null || nearestDist > dist) {
          nearest = ship;
          nearestDist = dist;
        }
      }
      const theta_radians = Math.atan2(nearest.y - this.ship.y, nearest.x - this.ship.x);
      const theta_degrees = (theta_radians + Math.PI/2) * 360.0 / (2.0 * Math.PI);
      this.ship.heading = theta_degrees;
      this.ship.thrust = 0.1;
    }
  }
}
