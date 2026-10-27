import * as THREE from "three";

import { CustomGData } from "../../GDataContext";
import { ParsedMap } from "../types";
import { makeLabelSprite } from "../sceneOverlays";
import { findPlanObject } from "./planDocument";
import { ellipseRadiusForRangeDisc } from "./planRange";
import { PlanDocument, PlanGhostObject, PlanObject, PlanPoint } from "./types";

export const PLAN_LAYER_NAME = "planLayer";
const PLAN_LIFT = 16;

function parseColor(color: string): number {
  const cleaned = color.replace("#", "");
  const value = Number.parseInt(
    cleaned.length === 3 ? cleaned.replace(/(.)/g, "$1$1") : cleaned,
    16,
  );
  return Number.isFinite(value) ? value : 0xffffff;
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const { material } = object as THREE.Mesh;
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.dispose();
      }
    } else if (material) {
      const { map } = material as THREE.MeshBasicMaterial;
      if (map) {
        map.dispose();
      }
      material.dispose();
    }
  });
}

function lineFromPoints(
  points: PlanPoint[],
  color: number,
  lift: number,
  closed: boolean,
): THREE.Object3D | null {
  if (points.length < 2) {
    return null;
  }
  const positions: number[] = [];
  for (const point of points) {
    positions.push(point.x, lift, point.y);
  }
  if (closed) {
    positions.push(points[0].x, lift, points[0].y);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
  const line = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
  line.renderOrder = lift + 1;
  return line;
}

function fillMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    fog: false,
  });
}

function layFlat(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  return geometry.rotateX(-Math.PI / 2);
}

function markPlanPick(object: THREE.Object3D, planObjectId: string, mapId: string): void {
  object.userData.planObjectId = planObjectId;
  object.userData.mapId = mapId;
  object.userData.pick = { kind: "plan", mapId, planObjectId };
}

function buildObjectMesh(args: {
  object: PlanObject;
  mapId: string;
  doc: PlanDocument;
  G: CustomGData | null;
  packCenters: ReadonlyMap<number, PlanPoint>;
  selected: boolean;
  playbackGhost?: PlanPoint | null;
}): THREE.Object3D | null {
  const { object, mapId, selected } = args;
  const color = parseColor(object.color);
  const group = new THREE.Group();
  markPlanPick(group, object.id, mapId);
  const lift = PLAN_LIFT + (selected ? 0.4 : 0);

  switch (object.kind) {
    case "path": {
      const line = lineFromPoints(object.points, color, lift, Boolean(object.closed));
      if (line) {
        group.add(line);
      }
      break;
    }
    case "arrow": {
      const line = lineFromPoints([object.from, object.to], color, lift, false);
      if (line) {
        group.add(line);
      }
      const angle = Math.atan2(object.to.y - object.from.y, object.to.x - object.from.x);
      const head = new THREE.Mesh(
        layFlat(new THREE.CircleGeometry(4, 3)),
        fillMaterial(color, 0.95),
      );
      head.position.set(object.to.x, lift + 0.1, object.to.y);
      head.rotation.y = -angle;
      group.add(head);
      break;
    }
    case "rect": {
      const mesh = new THREE.Mesh(
        layFlat(
          new THREE.PlaneGeometry(
            Math.max(Math.abs(object.width), 2),
            Math.max(Math.abs(object.height), 2),
          ),
        ),
        fillMaterial(color, object.role === "zone" ? 0.28 : 0.18),
      );
      mesh.position.set(object.x, lift, object.y);
      group.add(mesh);
      break;
    }
    case "ellipse": {
      let radiusX = Math.max(Math.abs(object.radiusX), 1);
      let radiusY = Math.max(Math.abs(object.radiusY), 1);
      if (object.role === "range" && args.G) {
        const ghost = object.ghostId
          ? (findPlanObject(args.doc, object.ghostId) as PlanGhostObject | undefined)
          : undefined;
        const radius = ellipseRadiusForRangeDisc(
          object,
          ghost?.kind === "ghost" ? ghost : undefined,
          args.G,
        );
        radiusX = radius;
        radiusY = radius;
      }
      const mesh = new THREE.Mesh(
        layFlat(new THREE.CircleGeometry(1, 28)),
        fillMaterial(color, object.role === "range" ? 0.2 : 0.18),
      );
      mesh.scale.set(radiusX, 1, radiusY);
      mesh.position.set(object.x, lift, object.y);
      group.add(mesh);
      break;
    }
    case "polygon": {
      if (object.points.length >= 3) {
        const shape = new THREE.Shape();
        shape.moveTo(object.points[0].x, -object.points[0].y);
        for (let i = 1; i < object.points.length; i += 1) {
          shape.lineTo(object.points[i].x, -object.points[i].y);
        }
        shape.closePath();
        const mesh = new THREE.Mesh(
          layFlat(new THREE.ShapeGeometry(shape)),
          fillMaterial(color, 0.22),
        );
        mesh.position.y = lift;
        group.add(mesh);
      }
      break;
    }
    case "text":
    case "pin": {
      const label = makeLabelSprite(
        object.kind === "text" ? object.text : object.text || object.label || "Note",
      );
      label.position.set(object.x, lift + 8, object.y);
      group.add(label);
      break;
    }
    case "stamp": {
      const glyph = object.stamp === "x" ? "✕" : object.stamp === "star" ? "★" : "⚑";
      const label = makeLabelSprite(glyph);
      label.scale.set(60, 40, 1);
      label.position.set(object.x, lift + 6, object.y);
      group.add(label);
      break;
    }
    case "ghost": {
      const disc = new THREE.Mesh(
        layFlat(new THREE.CircleGeometry(8, 16)),
        fillMaterial(color, 0.85),
      );
      disc.position.set(object.x, lift, object.y);
      group.add(disc);
      const label = makeLabelSprite(object.name || object.classKey);
      label.position.set(object.x, lift + 14, object.y);
      group.add(label);
      break;
    }
    case "route": {
      const line = lineFromPoints(object.waypoints, color, lift, object.loop);
      if (line) {
        group.add(line);
      }
      for (const waypoint of object.waypoints) {
        const dot = new THREE.Mesh(
          layFlat(new THREE.CircleGeometry(3, 10)),
          fillMaterial(color, 0.95),
        );
        dot.position.set(waypoint.x, lift + 0.2, waypoint.y);
        group.add(dot);
      }
      if (args.playbackGhost) {
        const ghost = new THREE.Mesh(
          layFlat(new THREE.CircleGeometry(6, 12)),
          fillMaterial(0xffffff, 0.95),
        );
        ghost.position.set(args.playbackGhost.x, lift + 0.5, args.playbackGhost.y);
        group.add(ghost);
      }
      break;
    }
    case "packMarker": {
      const center = args.packCenters.get(object.packIndex);
      if (!center) {
        return null;
      }
      const badge = makeLabelSprite(`${object.order}. ${object.label || "Pack"}`);
      badge.position.set(center.x, lift + 18, center.y);
      group.add(badge);
      break;
    }
    default: {
      const exhaustive: never = object;
      return exhaustive;
    }
  }

  if (
    object.label &&
    object.kind !== "packMarker" &&
    object.kind !== "text" &&
    object.kind !== "pin"
  ) {
    const label = makeLabelSprite(object.label);
    const anchor =
      "x" in object && "y" in object && typeof object.x === "number"
        ? { x: object.x, y: object.y }
        : null;
    if (anchor) {
      label.position.set(anchor.x, lift + 12, anchor.y);
      group.add(label);
    }
  }

  return group;
}

export function packCentersFromMap(map: ParsedMap | undefined): Map<number, PlanPoint> {
  const centers = new Map<number, PlanPoint>();
  if (!map) {
    return centers;
  }
  for (let i = 0; i < map.monsters.length; i += 1) {
    const monster = map.monsters[i];
    centers.set(i, { x: monster.x, y: monster.y });
  }
  return centers;
}

export function syncPlanLayer(args: {
  mapGroup: THREE.Group;
  mapId: string;
  doc: PlanDocument | null;
  G: CustomGData | null;
  selectedIds: ReadonlySet<string>;
  packCenters: ReadonlyMap<number, PlanPoint>;
  playback?: { routeId: string; point: PlanPoint } | null;
}): void {
  let layer = args.mapGroup.getObjectByName(PLAN_LAYER_NAME) as THREE.Group | undefined;
  if (layer) {
    args.mapGroup.remove(layer);
    disposeObject3D(layer);
  }
  if (!args.doc || args.doc.mapKey !== args.mapId) {
    return;
  }
  layer = new THREE.Group();
  layer.name = PLAN_LAYER_NAME;
  for (const object of args.doc.objects) {
    const mesh = buildObjectMesh({
      object,
      mapId: args.mapId,
      doc: args.doc,
      G: args.G,
      packCenters: args.packCenters,
      selected: args.selectedIds.has(object.id),
      playbackGhost:
        args.playback && args.playback.routeId === object.id ? args.playback.point : null,
    });
    if (mesh) {
      layer.add(mesh);
    }
  }
  args.mapGroup.add(layer);
}
