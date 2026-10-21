import * as T from "three";
import { buildFacade } from "./facade";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Project } from "./model";
import { surfaceAlbedo } from "./surface";
import {
  RoomAssets,
  type PBRSet,
  type RoomAssetState,
  disposeModel,
} from "./roomAssets";

export const materialProfiles = {
  ceramic: {
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.08,
    transmission: 0,
    bumpScale: 0.025,
    anisotropy: 0,
  },
  gloss: {
    roughness: 0.075,
    metalness: 0,
    clearcoat: 1,
    transmission: 0,
    bumpScale: 0.008,
    anisotropy: 0,
  },
  stone: {
    roughness: 0.94,
    metalness: 0,
    clearcoat: 0,
    transmission: 0,
    bumpScale: 0.12,
    anisotropy: 0,
  },
  wood: {
    roughness: 0.6,
    metalness: 0,
    clearcoat: 0.12,
    transmission: 0,
    bumpScale: 0.065,
    anisotropy: 0.15,
  },
  metal: {
    roughness: 0.27,
    metalness: 0.92,
    clearcoat: 0.12,
    transmission: 0,
    bumpScale: 0.016,
    anisotropy: 0.85,
  },
  glass: {
    roughness: 0.045,
    metalness: 0,
    clearcoat: 1,
    transmission: 0.62,
    bumpScale: 0.006,
    anisotropy: 0,
  },
};
type MaterialKey = keyof typeof materialProfiles;
type Settings = Project["showroom"];
let generation = 0;
// Retain photographic microstructure while art-directing the architectural palette.
function neutralMap(material: T.MeshStandardMaterial, detail: number) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      T.ShaderChunk.map_fragment.replace(
        "diffuseColor *= sampledDiffuseColor;",
        `float tone = dot(sampledDiffuseColor.rgb, vec3(.2126,.7152,.0722));
      sampledDiffuseColor.rgb = vec3(mix(1.0, tone, ${detail.toFixed(3)}));
      diffuseColor *= sampledDiffuseColor;`,
      ),
    );
  };
  material.customProgramCacheKey = () => `neutral-map-${detail}`;
  material.needsUpdate = true;
}

/** One renderer/context/environment for the entire mounted showroom.
 * All three architectural sets are built once. Settings only mutate objects.
 * RAF draws on demand; there is no idle animation loop. */
export class RoomEngine {
  readonly renderer: T.WebGLRenderer;
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(39, 16 / 9, 0.1, 80);
  readonly material = new T.MeshPhysicalMaterial({
    side: T.DoubleSide,
    thickness: 0.26,
    ior: 1.48,
  });
  readonly id = ++generation;
  private env: T.WebGLRenderTarget;
  private groups: Record<string, T.Group> = {};
  private textures: Record<
    string,
    { bump: T.CanvasTexture; rough: T.CanvasTexture }
  > = {};
  private pattern = new T.CanvasTexture(document.createElement("canvas"));
  private source: HTMLCanvasElement | null = null;
  private currentMaterial = "";
  private disposed = false;
  private frame = 0;
  private ro: ResizeObserver;
  private sun = new T.DirectionalLight(0xffe7c8, 2.5);
  private key = new T.SpotLight(0xffefdb, 36, 30, Math.PI / 4, 0.7, 1);
  private settings: Settings | null = null;
  private assets = new RoomAssets();
  private retiredMaterials = new Set<T.Material>();
  private physical: Partial<Record<string, PBRSet>> = {};
  private facadePaving = new T.MeshStandardMaterial({ color: "#c7c5b8", roughness: .78 });
  private architecture = {
    plaster: new T.MeshStandardMaterial({ color: "#ded6c7", roughness: 0.9 }),
    wood: new T.MeshStandardMaterial({ color: "#b9a186", roughness: 0.55 }),
    marble: new T.MeshStandardMaterial({ color: "#e4dbc9", roughness: 0.32 }),
    pavement: new T.MeshStandardMaterial({ color: "#c9bdab", roughness: 0.85 }),
  };
  constructor(
    private host: HTMLDivElement,
    private onAssets?: (state: RoomAssetState) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.domElement.dataset.rendererId = String(this.id);
    this.host.dataset.rendererId = String(this.id);
    this.host.dataset.environmentBuilds = "1";
    this.host.dataset.sceneBuilds = "3";
    this.host.replaceChildren(this.renderer.domElement);
    this.scene.background = new T.Color("#d4cec0");
    const generator = new T.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    for (const x of [-3.8, 2.8]) {
      const window = new T.Mesh(
        new T.PlaneGeometry(2.2, 5.4),
        new T.MeshBasicMaterial({ color: new T.Color(4, 3.7, 3.1) }),
      );
      window.position.set(x, 3.2, 7);
      window.lookAt(0, 2, 0);
      room.add(window);
    }
    // Low studio softboxes sit in the reflected viewing direction of a
    // vertical tile wall. Tall lights alone miss the wall at child eye level.
    for (const x of [-3.4, -1.7]) {
      const softbox = new T.Mesh(
        new T.PlaneGeometry(0.32, 2.5),
        new T.MeshBasicMaterial({ color: new T.Color(4, 3.9, 3.7) }),
      );
      softbox.position.set(x, -0.1, 4);
      softbox.lookAt(0, 0, 0);
      room.add(softbox);
    }
    this.env = generator.fromScene(room, 0.025);
    room.dispose();
    generator.dispose();
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = 0.58;
    this.scene.add(new T.HemisphereLight(0xe9f1ef, 0x77705d, 0.95));
    this.sun.position.set(-5, 8, 6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -9,
      right: 9,
      top: 9,
      bottom: -9,
      near: 0.1,
      far: 35,
    });
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.025;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    this.key.position.set(4, 6, 5);
    this.key.target.position.set(0, 2, -2);
    this.scene.add(this.key, this.key.target);
    this.pattern.colorSpace = T.SRGBColorSpace;
    this.pattern.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.material.map = this.pattern;
    for (const name of Object.keys(materialProfiles))
      this.textures[name] = this.makeSurface(name as MaterialKey);
    for (const name of ["wall", "floor", "facade"]) {
      const group = this.build(name);
      this.groups[name] = group;
      this.scene.add(group);
    }
    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(host);
    this.host.dataset.assetState = "loading";
    void this.loadAssets();
  }
  private async loadAssets() {
    const tasks: Promise<unknown>[] = [];
    tasks.push(
      this.assets.environment().then((hdr) => {
        if (this.disposed) {
          hdr.dispose();
          return;
        }
        const generator = new T.PMREMGenerator(this.renderer);
        hdr.mapping = T.EquirectangularReflectionMapping;
        const reflectionStudio = new T.Scene();
        reflectionStudio.background = hdr;
        for (const x of [-3.4, -1.7]) {
          const light = new T.Mesh(
            new T.PlaneGeometry(0.32, 2.5),
            new T.MeshBasicMaterial({ color: new T.Color(5, 4.8, 4.4) }),
          );
          light.position.set(x, -0.1, 4);
          light.lookAt(0, 0, 0);
          reflectionStudio.add(light);
        }
        const env = generator.fromScene(reflectionStudio, 0.025);
        reflectionStudio.children.forEach((o) => {
          if (o instanceof T.Mesh) {
            o.geometry.dispose();
            (o.material as T.Material).dispose();
          }
        });
        generator.dispose();
        hdr.dispose();
        this.env.dispose();
        this.env = env;
        this.scene.environment = env.texture;
        this.scene.environmentIntensity = 0.55;
        this.host.dataset.environmentBuilds = "2";
        this.schedule();
      }),
    );
    for (const [key, name, material] of [
      ["stone", "marble_01", this.architecture.marble],
      ["wood", "wood_table_001", this.architecture.wood],
      ["plaster", "grey_plaster", this.architecture.plaster],
      ["pavement", "sandstone_cracks", this.architecture.pavement],
    ] as const) {
      tasks.push(
        this.assets.pbr(name).then((set) => {
          if (this.disposed) return;
          this.physical[key] = set;
          for (const t of Object.values(set)) {
            t.repeat.set(key === "wood" ? 3 : 2, 2);
            t.anisotropy = Math.min(
              8,
              this.renderer.capabilities.getMaxAnisotropy(),
            );
          }
          material.map = set.color;
          neutralMap(
            material,
            key === "plaster" ? 0.12 : key === "pavement" ? 0.22 : 0.48,
          );
          material.normalMap = set.normal;
          material.roughnessMap = set.roughness;
          material.normalScale.set(
            key === "plaster" ? 0.08 : 0.22,
            key === "plaster" ? 0.08 : 0.22,
          );
          material.needsUpdate = true;
          if (key === "plaster") {
            this.facadePaving.map = set.color;
            this.facadePaving.normalMap = set.normal;
            this.facadePaving.roughnessMap = set.roughness;
            this.facadePaving.normalScale.set(.12, .12);
            neutralMap(this.facadePaving, .16);
          }
          this.applySurface();
          if (this.source) this.setPattern(this.source);
          this.schedule();
        }),
      );
    }
    tasks.push(
      this.assets.chair().then((model) => {
        if (this.disposed) {
          disposeModel(model);
          return;
        }
        model.traverse((o) => {
          if (!(o instanceof T.Mesh)) return;
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            if (
              m instanceof T.MeshStandardMaterial &&
              m.name.toLowerCase().includes("fabric")
            ) {
              m.color.set("#8b9184");
              neutralMap(m, 0.38);
            }
          }
        });
        for (const scene of ["wall", "floor"]) {
          const g = this.groups[scene];
          const obsolete = g.children.filter(
            (o) => o.userData.furniturePlaceholder,
          );
          for (const o of obsolete) {
            g.remove(o);
            if (o instanceof T.Mesh) {
              o.geometry.dispose();
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m) => this.retiredMaterials.add(m),
              );
            }
          }
          const locations =
            scene === "wall"
              ? [[-1.2, 1.2, -0.35]]
              : [
                  [1.9, -0.6, -0.12],
                  [3.8, -0.5, -0.45],
                ];
          for (const [x, z, rotation] of locations) {
            const chair = model.clone(true);
            chair.scale.setScalar(1.65);
            chair.position.set(x, 0.008, z);
            chair.rotation.y = rotation;
            chair.name = "CC0 Sheen Chair";
            g.add(chair);
          }
        }
        this.host.dataset.modelLoaded = "true";
        this.schedule();
      }),
    );
    tasks.push(
      this.assets.chair("potted-plant-02.glb").then((model) => {
        if (this.disposed) {
          disposeModel(model);
          return;
        }
        for (const [name, locations] of Object.entries({
          wall: [[3.9, 0.2, 2]],
          floor: [[-3.5, -0.3, 1.8]],
        })) {
          const g = this.groups[name];
          for (const o of g.children.filter(
            (o) => o.userData.plantPlaceholder,
          )) {
            g.remove(o);
            if (o instanceof T.Mesh) {
              o.geometry.dispose();
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m) => this.retiredMaterials.add(m),
              );
            }
          }
          for (const [x, z, scale] of locations) {
            const plant = model.clone(true);
            plant.scale.setScalar(scale);
            plant.position.set(x, 0, z);
            plant.name = "CC0 Potted Plant";
            g.add(plant);
          }
        }
        this.host.dataset.plantLoaded = "true";
        this.schedule();
      }),
    );
    await Promise.allSettled(tasks);
    if (this.disposed) return;
    const state = this.assets.failures.length ? "degraded" : "ready";
    this.host.dataset.assetState = state;
    this.host.dataset.assetFailures = JSON.stringify(this.assets.failures);
    this.onAssets?.(state);
    this.schedule();
  }
  private applySurface() {
    const set = this.physical[this.currentMaterial];
    this.material.normalMap = set?.normal ?? null;
    this.material.normalScale.set(
      this.currentMaterial === "stone" ? 0.2 : 0.32,
      this.currentMaterial === "stone" ? 0.2 : 0.32,
    );
    this.material.roughnessMap =
      set?.roughness ?? this.textures[this.currentMaterial]?.rough ?? null;
    this.material.needsUpdate = true;
  }
  private makeSurface(name: MaterialKey) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d")!,
      im = ctx.createImageData(512, 512);
    let seed = 9871;
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 512; x++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const noise = (seed % 256) / 255;
        const grain = Math.sin(
          x * 0.19 + Math.sin(y * 0.018) * 3 + Math.sin(y * 0.044) * 0.6,
        );
        let n =
          name === "wood"
            ? 125 + grain * 45 + Math.sin(x * 0.73) * 13
            : name === "metal"
              ? 130 + Math.sin(y * 2.7) * 22 + noise * 8
              : name === "stone"
                ? 90 + noise * 100 + Math.sin(x * 0.04 + y * 0.03) * 24
                : name === "ceramic"
                  ? 135 + noise * 25
                  : 145 + noise * 6;
        const i = (y * 512 + x) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = n;
        im.data[i + 3] = 255;
      }
    ctx.putImageData(im, 0, 0);
    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = roughCanvas.height = 512;
    const rc = roughCanvas.getContext("2d")!;
    rc.drawImage(canvas, 0, 0);
    rc.fillStyle =
      name === "stone"
        ? "#ffffff80"
        : name === "wood"
          ? "#ffffff50"
          : "#ffffffb0";
    rc.fillRect(0, 0, 512, 512);
    const bump = new T.CanvasTexture(canvas),
      rough = new T.CanvasTexture(roughCanvas);
    for (const t of [bump, rough]) {
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.repeat.set(
        name === "stone" ? 2 : name === "wood" ? 5 : 9,
        name === "stone" ? 2 : name === "metal" ? 12 : 5,
      );
    }
    return { bump, rough };
  }
  private build(name: string) {
    const g = new T.Group();
    const standard = (color: string, roughness = 0.78) =>
      new T.MeshStandardMaterial({ color, roughness });
    const plaster = this.architecture.plaster,
      dark = standard("#283b35"),
      brass = new T.MeshStandardMaterial({
        color: "#a58a59",
        metalness: 0.7,
        roughness: 0.3,
      }),
      wood = this.architecture.wood;
    const add = (
      geo: T.BufferGeometry,
      mat: T.Material,
      x: number,
      y: number,
      z: number,
    ) => {
      const o = new T.Mesh(geo, mat);
      o.position.set(x, y, z);
      o.castShadow = o.receiveShadow = true;
      g.add(o);
      return o;
    };
    const box = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      mat: T.Material,
      r = 0.02,
    ) =>
      add(
        new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 4, h / 4, d / 4)),
        mat,
        x,
        y,
        z,
      );
    const cyl = (
      x: number,
      y: number,
      z: number,
      r: number,
      h: number,
      mat: T.Material,
      top = r,
    ) => add(new T.CylinderGeometry(top, r, h, 48), mat, x, y, z);
    const plant = (x: number, y: number, z: number, s = 1) => {
      const first = g.children.length;
      cyl(
        x,
        y + 0.28 * s,
        z,
        0.29 * s,
        0.56 * s,
        standard("#9b8c74"),
        0.37 * s,
      );
      for (let i = 0; i < 8; i++) {
        const a = i * 2.399,
          radius = (0.18 + i * 0.04) * s;
        const leaf = add(
          new T.SphereGeometry(1, 16, 10),
          standard(i % 2 ? "#46644b" : "#627953"),
          x + Math.sin(a) * radius,
          y + 0.9 * s + i * 0.075 * s,
          z + Math.cos(a) * radius,
        );
        leaf.scale.set(0.12 * s, 0.42 * s, 0.07 * s);
        leaf.rotation.z = Math.sin(a) * 0.8;
        leaf.rotation.y = a;
        const stem = cyl(
          x + (Math.sin(a) * radius) / 2,
          y + 0.66 * s + i * 0.035 * s,
          z + (Math.cos(a) * radius) / 2,
          0.009 * s,
          0.75 * s,
          dark,
        );
        stem.rotation.z = -Math.sin(a) * 0.25;
      }
      g.children.slice(first).forEach((o) => {
        o.userData.plantPlaceholder = true;
      });
    };
    const chair = (x: number, z: number) => {
      const first = g.children.length;
      cyl(x, 0.51, z, 0.35, 0.08, wood);
      for (const dx of [-0.23, 0.23])
        for (const dz of [-0.23, 0.23]) {
          const leg = cyl(x + dx, 0.25, z + dz, 0.022, 0.5, dark);
          leg.rotation.z = -dx * 0.3;
        }
      const back = box(x, 0.85, z - 0.26, 0.65, 0.4, 0.06, wood, 0.04);
      back.rotation.x = -0.1;
      for (const dx of [-0.25, 0.25])
        cyl(x + dx, 0.67, z - 0.26, 0.018, 0.38, dark);
      g.children.slice(first).forEach((o) => {
        o.userData.furniturePlaceholder = true;
      });
    };
    box(0, -0.12, 0, 13, 0.22, 11, this.architecture.pavement);
    if (name !== "facade") {
      box(0, 2.7, -2.35, 11, 5.4, 0.22, plaster);
      box(-5.45, 0.18, 0.3, 0.28, 0.36, 5.3, plaster);
      box(-5.45, 5.14, 0.3, 0.32, 0.5, 5.3, plaster);
      for (const z of [-2.2, 2.8]) box(-5.45, 2.7, z, 0.38, 5.4, 0.28, plaster);
      const window = add(
        new T.PlaneGeometry(5.0, 4.7),
        new T.MeshBasicMaterial({ color: "#d9e1d8", side: T.DoubleSide }),
        -5.55,
        2.65,
        0.3,
      );
      window.rotation.y = Math.PI / 2;
      window.castShadow = false;
      box(0, 5.3, -1.9, 11.2, 0.26, 0.9, plaster);
      box(
        0,
        5.13,
        -2.1,
        10.7,
        0.045,
        0.15,
        new T.MeshStandardMaterial({
          color: "#ffe5ba",
          emissive: "#ffd89b",
          emissiveIntensity: 1.5,
        }),
      );
      // Tall window reveals cast long, directional architectural shadows.
      for (const z of [-0.7, 1.5]) box(-5.3, 2.6, z, 0.16, 4.8, 0.1, dark);
      box(-5.3, 2.7, 0.4, 0.16, 0.08, 4.4, dark);
      box(-5.3, 0.2, 0.4, 0.4, 0.24, 4.6, wood);
      box(0, 0.12, -2.16, 10.7, 0.18, 0.12, standard("#9f927b"));
      if (name === "wall") {
        box(0.1, 2.6, -2.12, 8.6, 4.6, 0.12, brass);
        const art = add(
          new T.PlaneGeometry(8.4, 4.725),
          this.material,
          0.1,
          2.65,
          -2.02,
        );
        art.castShadow = false;
        // Slatted oak bench, rounded stone table, turned timber legs.
        box(0.35, 0.47, -1.1, 4.9, 0.32, 0.82, standard("#ada18c"), 0.12);
        for (let x = -2; x < 2.7; x += 0.16)
          box(x, 0.69, -1.1, 0.12, 0.09, 0.78, wood, 0.02);
        cyl(-1.9, 0.48, 0.5, 0.69, 0.08, this.architecture.marble);
        cyl(-1.9, 0.23, 0.5, 0.16, 0.44, brass);
        cyl(-1.9, 0.025, 0.5, 0.4, 0.05, dark);
        chair(-1.15, 1.05);
        // Ceramic cup and vase give scale without blocking the pattern.
        cyl(-2.05, 0.58, 0.48, 0.07, 0.12, standard("#eee3ce"));
        cyl(-1.65, 0.64, 0.47, 0.065, 0.24, standard("#6c735a"), 0.04);
        for (const x of [-2.4, 2.1]) {
          cyl(x, 4.65, 0.3, 0.012, 1.4, dark);
          const shade = add(
            new T.ConeGeometry(0.32, 0.25, 64, 1, true),
            brass,
            x,
            3.85,
            0.3,
          );
          shade.material.side = T.DoubleSide;
          cyl(
            x,
            3.74,
            0.3,
            0.24,
            0.025,
            new T.MeshStandardMaterial({
              color: "#ffe5ae",
              emissive: "#e6b65e",
              emissiveIntensity: 0.8,
            }),
          );
        }
        plant(3.9, 0, 0.2, 1.25);
      } else {
        // Quiet reading gallery: the open floor is the largest surface.
        const art = add(
          new T.PlaneGeometry(10.6, 5.9625),
          this.material,
          0,
          0.009,
          0.8,
        );
        art.rotation.x = -Math.PI / 2;
        art.castShadow = false;
        for (const o of [
          box(2.5, 0.42, -1.25, 3.1, 0.52, 1.1, standard("#bcb4a4"), 0.14),
          box(2.5, 0.77, -1.65, 3.1, 0.6, 0.28, standard("#bab19f"), 0.12),
          box(2.5, 0.72, -1.2, 2.9, 0.14, 0.92, standard("#ddd3be"), 0.08),
        ])
          o.userData.furniturePlaceholder = true;
        for (let i = 0; i < 7; i++)
          box(-3.7 + i * 0.23, 1.9, -2.05, 0.1, 2.8, 0.12, wood);
        box(-3, 1.3, -1.6, 2.1, 0.13, 0.6, wood);
        plant(-3.5, 0, -0.3, 1.2);
        cyl(0.1, 0.22, -0.2, 0.5, 0.35, standard("#7d7968"));
        cyl(0.1, 0.41, -0.2, 0.58, 0.05, this.architecture.marble);
        box(2.7, 2.85, -2.15, 1.55, 1.9, 0.08, dark);
        box(2.7, 2.85, -2.09, 1.35, 1.7, 0.03, standard("#a5ad98"));
      }
    } else {
      g.add(buildFacade(this.material, plaster, this.facadePaving));
    }
    return g;
  }
  update(s: Settings) {
    this.settings = s;
    for (const [name, g] of Object.entries(this.groups))
      g.visible = name === s.scene;
    const floor = s.scene === "floor",
      facade = s.scene === "facade";
    const views = floor
      ? [
          [7.5, 8.5, 10.5],
          [0, 9.2, 10.6],
          [-7.5, 8.5, 10.5],
        ]
      : facade
        ? [
            [8, 4.9, 12],
            [0, 3.8, 13],
            [-8, 4.9, 12],
          ]
        : [
            [6.6, 4.2, 10.5],
            [0, 3.1, 11.8],
            [-6.6, 4.2, 10.5],
          ];
    this.camera.position.fromArray(views[s.camera]);
    this.camera.lookAt(0, floor ? 0.4 : 2, facade ? -1 : 0);
    this.sun.intensity = 2.1 * (s.lighting ?? 1);
    this.key.intensity = 24 * (s.lighting ?? 1);
    if (this.currentMaterial !== s.material) {
      this.currentMaterial = s.material;
      Object.assign(this.material, materialProfiles[s.material as MaterialKey]);
      this.material.bumpMap = this.textures[s.material].bump;
      this.applySurface();
      this.material.envMapIntensity =
        s.material === "metal"
          ? 1.6
          : s.material === "glass"
            ? 1.25
            : s.material === "gloss"
              ? 1.4
              : 0.8;
      this.material.clearcoatRoughness = s.material === "gloss" ? 0.045 : 0.12;
      this.material.anisotropyRotation = Math.PI / 2;
      this.material.needsUpdate = true;
      if (this.source) this.setPattern(this.source);
    }
    this.schedule();
  }
  setPattern(canvas: HTMLCanvasElement) {
    this.source = canvas;
    this.host.dataset.textureSize = `${canvas.width}x${canvas.height}`;
    // WebGL immutable texture storage cannot change dimensions after upload.
    // Reallocate only this texture when export resolution changes; never the
    // renderer, context, environment or scene.
    if (
      this.pattern.image.width !== canvas.width ||
      this.pattern.image.height !== canvas.height
    ) {
      this.pattern.dispose();
      this.pattern = new T.CanvasTexture(canvas);
      this.pattern.colorSpace = T.SRGBColorSpace;
      this.pattern.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.material.map = this.pattern;
      this.material.needsUpdate = true;
    }
    this.pattern.image = surfaceAlbedo(
      canvas,
      this.currentMaterial,
      this.physical[this.currentMaterial]?.color.image,
    );
    this.pattern.needsUpdate = true;
    this.schedule();
  }
  schedule() {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }
  private draw() {
    if (this.disposed) return;
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Preserve the horizontal composition on portrait previews instead of
    // cropping off the facade. Export retains its fixed 16:9 lens below.
    this.camera.fov = T.MathUtils.radToDeg(2 * Math.atan(
      Math.tan(T.MathUtils.degToRad(39 / 2)) * Math.max(1, (16 / 9) / this.camera.aspect),
    ));
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    this.host.dataset.draws = String(+(this.host.dataset.draws || 0) + 1);
  }
  async capture(width: number, highResolutionPattern: HTMLCanvasElement) {
    const oldSource = this.source;
    this.setPattern(highResolutionPattern);
    const ratio = this.renderer.getPixelRatio();
    try {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, (width * 9) / 16, false);
      this.camera.aspect = 16 / 9;
      this.camera.fov = 39;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
      return await new Promise<Blob>((resolve, reject) =>
        this.renderer.domElement.toBlob(
          (b) => (b ? resolve(b) : reject(Error("쇼룸 저장 실패"))),
          "image/png",
        ),
      );
    } finally {
      this.renderer.setPixelRatio(ratio);
      if (oldSource) this.setPattern(oldSource);
      this.draw();
    }
  }
  dispose() {
    this.disposed = true;
    this.assets.dispose();
    cancelAnimationFrame(this.frame);
    this.ro.disconnect();
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        if (o instanceof T.InstancedMesh) o.dispose();
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    this.retiredMaterials.forEach((m) => materials.add(m));
    materials.forEach((m) => m.dispose());
    Object.values(this.textures).forEach((t) => {
      t.bump.dispose();
      t.rough.dispose();
    });
    this.pattern.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
