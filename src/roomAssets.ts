import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export const showroomAssetURL = (name: string) =>
  `${import.meta.env.BASE_URL}assets/showroom/${name}`;
export type PBRSet = {
  color: T.Texture;
  normal: T.Texture;
  roughness: T.Texture;
};
export type RoomAssetState = "loading" | "ready" | "degraded";

/** Assets belong to one mounted engine, not module globals. Browser HTTP cache
 * handles repeat downloads; GPU resources are explicitly released on unmount. */
export class RoomAssets {
  readonly textures = new Set<T.Texture>();
  readonly failures: string[] = [];
  disposed = false;
  async texture(name: string, color = false) {
    try {
      const texture = await new T.TextureLoader().loadAsync(
        showroomAssetURL(name),
      );
      if (this.disposed) {
        texture.dispose();
        throw Error("disposed");
      }
      texture.colorSpace = color ? T.SRGBColorSpace : T.NoColorSpace;
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      this.textures.add(texture);
      return texture;
    } catch (e) {
      if (!this.disposed) this.failures.push(name);
      throw e;
    }
  }
  async pbr(name: string): Promise<PBRSet> {
    const [color, normal, roughness] = await Promise.all([
      this.texture(`${name}-color.jpg`, true),
      this.texture(`${name}-normal.jpg`),
      this.texture(`${name}-roughness.jpg`),
    ]);
    if (name === "marble_01") {
      // Use the interior of one slab: source masonry joints must never create
      // false boundaries inside the student's polygon. Identical crop for PBR maps.
      for (const texture of [color, normal, roughness]) {
        const c = document.createElement("canvas");
        c.width = 290;
        c.height = 205;
        c.getContext("2d")!.drawImage(
          texture.image,
          720,
          232,
          290,
          205,
          0,
          0,
          290,
          205,
        );
        texture.image = c;
        texture.wrapS = texture.wrapT = T.MirroredRepeatWrapping;
        texture.needsUpdate = true;
      }
    }
    return { color, normal, roughness };
  }
  async chair(name = "sheen-chair.glb") {
    try {
      const { scene } = await new GLTFLoader().loadAsync(
        showroomAssetURL(name),
      );
      if (this.disposed) {
        disposeModel(scene);
        throw Error("disposed");
      }
      scene.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        o.castShadow = o.receiveShadow = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          for (const value of Object.values(m))
            if (value instanceof T.Texture) this.textures.add(value);
      });
      return scene;
    } catch (e) {
      if (!this.disposed) this.failures.push(name);
      throw e;
    }
  }
  async environment() {
    try {
      const hdr = await new RGBELoader().loadAsync(
        showroomAssetURL("studio-small-09.hdr"),
      );
      if (this.disposed) {
        hdr.dispose();
        throw Error("disposed");
      }
      return hdr;
    } catch (e) {
      if (!this.disposed) this.failures.push("studio-small-09.hdr");
      throw e;
    }
  }
  dispose() {
    this.disposed = true;
    this.textures.forEach((t) => t.dispose());
    this.textures.clear();
  }
}
export function disposeModel(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    geometries.add(o.geometry);
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
      materials.add(m),
    );
  });
  materials.forEach((m) => {
    Object.values(m).forEach((v) => {
      if (v instanceof T.Texture) textures.add(v);
    });
    m.dispose();
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
}
