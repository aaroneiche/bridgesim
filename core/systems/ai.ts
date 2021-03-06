import {Point, Position} from '../components';
import {Db} from '../entity/db';
import {randPoint} from '../galaxy';
import {dist, heading, headingToRadians} from '../math';
import {Pathfinder} from '../pathfinding';
import {every} from '../util';
import {WeaponType, fireWeapon} from '../weapon';

import {Collision} from './collision';

// closeDistance is the distance ships try to get to their target.
const closeDistance = 5000;

export class Ai {
  private previousPaths: {[id: string]: Point[]} = {};
  private newPaths: {[id: string]: Point[]} = {};

  constructor(
      private db: Db, private galaxySize: number,
      private collision: Collision) {}

  public tick() {
    this.tickMotion();
    this.tickTargetting();
  };

  private tickTargetting = every(0.5, () => {
    for (let id in this.db.ais) {
      const ai = this.db.ais[id];
      const {x, y, yaw} = this.db.positions[id];
      const health = this.db.healths[id];
      let maxRangeWeapon = 0;
      for (let weapon of health.weapons) {
        if (weapon.range > maxRangeWeapon) {
          maxRangeWeapon = weapon.range;
        }
      }

      // Find all ships and stations within the maximum possible range.
      const nearby = this.collision.quadtree.retrieve(
          x, y, x + maxRangeWeapon * 2, y + maxRangeWeapon * 2, true);
      const candidates = nearby.filter((targetID: string): boolean => {
        if (!(this.db.ships[targetID] || this.db.stations[targetID])) {
          return false;
        }
        return this.hostility(id, targetID) > 1;
      });

      // Attempt to fire each weapon at nearby targets.
      const pos = this.db.positions[id];
      for (let weapon of health.weapons) {
        // Fire missiles once every 5 seconds.
        if (weapon.type == WeaponType.Missile && Math.random() > 1 / 10) {
          continue;
        }

        for (let cid of candidates) {
          // Make sure they're in range.
          if (dist(pos, this.db.positions[cid]) > weapon.range) {
            continue;
          }

          const h = heading(this.db.positions[cid], this.db.positions[id]);
          if (fireWeapon(this.db, id, weapon, h)) {
            break;
          }
        }
      }
    }
  });

  private hostility(a: string, b: string): number {
    return Math.abs(this.factionScore(a) - this.factionScore(b));
  }

  private factionScore(id: string): number {
    const ai = this.db.ais[id];
    if (ai) {
      return ai.friendliness;
    }
    return 1;
  }

  // tickMotion will run every second.
  private tickMotion = every(1, () => {
    this.newPaths = {};
    const finder = new Pathfinder(this.db, this.galaxySize);
    for (let id in this.db.ais) {
      if (!this.db.motion[id]) {
        continue;
      }
      this.tickMotionOne(id, finder);
    }
    this.previousPaths = this.newPaths;
  });

  private tickMotionOne(id: string, finder: Pathfinder): void {
    const thisPos = this.db.positions[id];
    const ai = this.db.ais[id];
    let {targetPos, targetID} = ai;
    if (!targetPos || dist(thisPos, targetPos) < closeDistance) {
      // Try to attack the nearest enemy, or just aimlessly wander.
      const newTargetID = this.nearestEnemy(id);
      let newTarget: Point = this.db.positions[newTargetID];
      if (newTargetID === id) {
        newTarget = randPoint(this.galaxySize);
      }

      // If the new target is also too close just sit tight.
      if (dist(thisPos, newTarget) < closeDistance) {
        this.stopShip(id);
        return;
      }

      // Make sure there is a valid path.
      const path = finder.find(thisPos, newTarget, [id, newTargetID]);
      if (path.length > 0) {
        ai.targetID = newTargetID;
        ai.targetPos = targetPos = newTarget;
        this.previousPaths[id] = path;
      }
      return;
    }

    const path =
        finder.find(thisPos, targetPos, [id, targetID], this.previousPaths[id]);
    this.newPaths[id] = path;
    if (path.length == 0) {
      this.stopShip(id);
      return;
    }

    let targetIdx = Math.min(2, path.length - 1);
    const localTarget = path[targetIdx];
    thisPos.yaw = heading(localTarget, thisPos);

    // TODO(d4l3k): AIs don't know how to turn and thrust. They just directly
    // set their velocity vector.
    const rads = headingToRadians(thisPos.yaw);
    const velocity = 20;
    const mot = this.db.motion[id];
    mot.velocityX = Math.cos(rads) * velocity;
    mot.velocityY = Math.sin(rads) * velocity;
  }

  private stopShip(id: string) {
    const mot = this.db.motion[id];
    mot.velocityX = 0;
    mot.velocityY = 0;
  }

  private nearestEnemy(id: string): string {
    const pos = this.db.positions[id];
    const animateIDs =
        Object.keys(this.db.ships).concat(Object.keys(this.db.stations));
    let nearest = id;
    let nearestDist = -1;
    for (let aid of animateIDs) {
      if (aid === id || this.hostility(id, aid) <= 1) {
        continue;
      }
      const apos = this.db.positions[aid];
      const adist = dist(apos, pos);
      if (nearestDist < 0 || adist < nearestDist) {
        nearest = aid;
        nearestDist = adist;
      }
    }
    return nearest;
  }
}
