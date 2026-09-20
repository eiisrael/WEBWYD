import * as THREE from "three";

export interface ClassicMonsterStatusSprite {
  readonly sprite: THREE.Sprite;
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.SpriteMaterial;
}

export function createClassicMonsterStatusSprite(
  name: string,
  maximumHp: number,
  model: THREE.Object3D,
  scale: number,
): ClassicMonsterStatusSprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  drawClassicMonsterStatusCanvas(canvas, name, maximumHp, maximumHp);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });

  const sprite = new THREE.Sprite(material);
  sprite.name = "monster-name-and-hp";
  sprite.scale.set(4, 1, 1);
  sprite.renderOrder = 1_000;

  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const modelTop = Number.isFinite(bounds.max.y) ? bounds.max.y : 2.2 * scale;
  sprite.position.y = Math.max(1.5, Math.min(10, modelTop + 0.55));

  return { sprite, texture, material };
}

export function updateClassicMonsterStatusSprite(
  texture: THREE.CanvasTexture,
  name: string,
  hp: number,
  maximumHp: number,
): void {
  const canvas = texture.image as HTMLCanvasElement | undefined;
  if (!canvas || typeof canvas.getContext !== "function") return;
  drawClassicMonsterStatusCanvas(canvas, name, hp, maximumHp);
  texture.needsUpdate = true;
}

export function disposeClassicMonsterStatusSprite(
  texture: THREE.CanvasTexture,
  material: THREE.SpriteMaterial,
): void {
  material.dispose();
  texture.dispose();
}

function drawClassicMonsterStatusCanvas(
  canvas: HTMLCanvasElement,
  name: string,
  hp: number,
  maximumHp: number,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "600 18px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 4;
  context.strokeStyle = "rgba(0, 0, 0, .9)";
  context.strokeText(name, 128, 18, 238);
  context.fillStyle = "#f6f1dc";
  context.fillText(name, 128, 18, 238);

  const safeMaximumHp = Math.max(1, maximumHp);
  const safeHp = Math.max(0, Math.min(safeMaximumHp, hp));
  const width = 148;
  const x = (canvas.width - width) / 2;
  context.fillStyle = "rgba(4, 6, 5, .88)";
  context.fillRect(x - 2, 37, width + 4, 12);
  context.fillStyle = "#2b5434";
  context.fillRect(x, 39, width, 8);
  context.fillStyle = "#39df64";
  context.fillRect(x, 39, width * (safeHp / safeMaximumHp), 8);
}
