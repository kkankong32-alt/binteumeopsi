import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Architectural opening geometry. UVs remain the original full 16:9 elevation;
 * cutting windows must never stretch or restart the student's pattern. */
export function facadeElevation() {
  const shape = new T.Shape();
  shape.moveTo(-5, 0); shape.lineTo(5, 0); shape.lineTo(5, 5.625);
  shape.lineTo(-5, 5.625); shape.closePath();
  for (const x of [-3.3, 0, 3.3]) {
    const hole = new T.Path();
    hole.moveTo(x - 1.08, .48); hole.lineTo(x - 1.08, 3.94);
    hole.lineTo(x + 1.08, 3.94); hole.lineTo(x + 1.08, .48);
    hole.closePath(); shape.holes.push(hole);
  }
  const geometry = new T.ShapeGeometry(shape);
  const position = geometry.getAttribute("position"), uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++)
    uv.setXY(i, (position.getX(i) + 5) / 10, position.getY(i) / 5.625);
  return geometry;
}

/** All objects share the engine's normal disposal traversal; no timers/loaders. */
export function buildFacade(pattern: T.Material, plaster: T.Material, paving: T.Material) {
  const group = new T.Group(); group.name = "Architectural facade";
  const metal = new T.MeshStandardMaterial({ color: "#494a43", metalness: .82, roughness: .3 });
  const trim = new T.MeshStandardMaterial({ color: "#a3957b", metalness: .65, roughness: .32 });
  const recess = new T.MeshStandardMaterial({ color: "#777568", roughness: .9 });
  const joint = new T.MeshStandardMaterial({ color: "#777970", roughness: 1 });
  const interior = new T.MeshStandardMaterial({ color: "#858b80", roughness: .92 });
  const glass = new T.MeshPhysicalMaterial({
    color: "#adc4c0", metalness: .05, roughness: .085, clearcoat: 1,
    transmission: .32, thickness: .035, ior: 1.5, envMapIntensity: 1.3,
  });
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number, m: T.Material, radius = .008) => {
    const mesh = new T.Mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w/4, h/4, d/4)), m);
    mesh.name = name; mesh.position.set(x,y,z); mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  };
  const elevation = new T.Mesh(facadeElevation(), pattern);
  elevation.name = "Continuous 16:9 cladding with real openings";
  elevation.position.set(0,.0075,-1.72); elevation.receiveShadow = true;
  group.add(elevation);
  // Solid masonry only between openings. The glass is genuinely recessed.
  box("Head masonry",0,4.79,-2.1,10,1.65,.72,plaster);
  box("Sill masonry",0,.24,-2.1,10,.465,.72,plaster);
  for (const [x,w] of [[-4.69,.62],[-1.65,1.14],[1.65,1.14],[4.69,.62]])
    box("Masonry pier",x,2.22,-2.1,w,3.48,.72,plaster);
  for (const x of [-5.22,5.22]) {
    box("Stucco return",x,2.84,-2.2,.38,5.68,1.28,plaster);
    box("Perimeter shadow reveal",x > 0 ? 5.015 : -5.015,2.82,-1.71,.035,5.625,.035,joint);
  }
  box("Parapet",0,5.71,-2.08,10.82,.15,1.42,plaster);
  box("Folded parapet coping",0,5.8,-2.08,10.88,.035,1.5,trim);
  for (const x of [-3.3,0,3.3]) {
    box("Window interior",x,2.2,-2.64,2.12,3.4,.035,interior);
    // Quiet vertical interior reveals, visible through insulating glazing.
    for (const dx of [-.65,.65]) box("Interior reveal",x+dx,2.2,-2.48,.025,3.3,.17,recess);
    for (const dx of [-1.055,1.055]) {
      box("Deep jamb",x+dx,2.22,-1.96,.05,3.48,.46,recess);
      box("Outer frame",x+dx,2.22,-1.73,.065,3.48,.07,trim);
      box("Recessed aluminium jamb",x+dx*.94,2.22,-1.94,.06,3.36,.15,metal);
    }
    for (const y of [.53,3.9]) {
      box("Head and sill reveal",x,y,-1.96,2.1,.055,.46,recess);
      box("Recessed aluminium rail",x,y,-1.94,2.03,.065,.15,metal);
    }
    const glazing=box("Recessed insulating glass",x,2.22,-1.985,1.94,3.27,.026,glass,.002);
    glazing.castShadow=false;
    box("Meeting stile",x,2.22,-1.87,.042,3.28,.09,metal);
    box("Transom",x,2.98,-1.87,1.98,.045,.09,metal);
    box("Stone sill",x,.46,-1.87,2.27,.095,.68,paving);
    box("Sill drip edge",x,.414,-1.54,2.2,.025,.025,trim);
  }
  // Folded metal fascia, recessed soffit and slender structural ribs.
  box("Canopy roof",0,4.31,-1.13,10.62,.055,1.45,metal);
  box("Canopy front fascia",0,4.25,-.4,10.62,.12,.035,trim);
  box("Recessed soffit",0,4.24,-1.15,10.44,.035,1.34,recess);
  for (let x=-4.95;x<=5;x+=.55)
    box("Canopy standing rib",x,4.19,-1.14,.035,.075,1.35,metal);
  for (const x of [-4.8,-1.65,1.65,4.8])
    box("Canopy structural arm",x,4.13,-1.22,.065,.12,1.15,trim);
  box("Base shadow reveal",0,.17,-1.68,10.7,.11,.12,joint);
  box("Threshold landing",0,.075,-1.1,10.8,.13,1.55,paving);
  // Shared geometry + material keep 66 individually bevelled slabs inexpensive.
  const slabGeometry=new RoundedBoxGeometry(1.17,.075,.97,1,.008);
  const slabs=new T.InstancedMesh(slabGeometry,paving,66);
  slabs.name="Porcelain slabs with recessed 30mm joints";
  const matrix=new T.Matrix4(); let i=0;
  for (let row=0;row<6;row++) for(let col=0;col<11;col++) {
    matrix.makeTranslation((col-5)*1.2,.0275,row-0.05);
    slabs.setMatrixAt(i,matrix);
    slabs.setColorAt(i,new T.Color().setScalar(.94+((row*7+col*3)%5)*.013)); i++;
  }
  slabs.castShadow=slabs.receiveShadow=true; group.add(slabs);
  box("Recessed paving bed",0,-.025,2.45,13.25,.035,6.1,joint);
  return group;
}
