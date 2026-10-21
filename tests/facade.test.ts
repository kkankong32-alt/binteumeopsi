import { describe, it, expect } from "vitest";
import * as T from "three";
import { facadeElevation, buildFacade } from "../src/facade";

describe("facade architectural geometry", () => {
  it("cuts exactly three window openings while retaining continuous 16:9 UVs", () => {
    const g = facadeElevation(), p = g.getAttribute("position"), uv = g.getAttribute("uv"), indices = g.index!;
    let area = 0;
    for (let i=0;i<indices.count;i+=3) {
      const [a,b,c]=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];
      area+=Math.abs((p.getX(b)-p.getX(a))*(p.getY(c)-p.getY(a))-(p.getY(b)-p.getY(a))*(p.getX(c)-p.getX(a)))/2;
      const cx=(p.getX(a)+p.getX(b)+p.getX(c))/3, cy=(p.getY(a)+p.getY(b)+p.getY(c))/3;
      expect([-3.3,0,3.3].some(x=>Math.abs(cx-x)<1.08 && cy>.48 && cy<3.94)).toBe(false);
    }
    expect(area).toBeCloseTo(10*5.625-3*2.16*3.46,4);
    for(let i=0;i<p.count;i++) {
      expect(uv.getX(i)).toBeCloseTo((p.getX(i)+5)/10,6);
      expect(uv.getY(i)).toBeCloseTo(p.getY(i)/5.625,6);
    }
    g.dispose();
  });
  it("uses inset glazing, one instanced paving mesh and no plant props", () => {
    const m=new T.MeshStandardMaterial(), g=buildFacade(m,m,m);
    const glass=g.children.filter(o=>o.name==="Recessed insulating glass");
    expect(glass).toHaveLength(3);
    expect(glass.every(o=>o.position.z < -1.72-.2)).toBe(true);
    const slabs=g.children.find(o=>o instanceof T.InstancedMesh) as T.InstancedMesh;
    expect(slabs.count).toBe(66);
    expect(g.children.some(o=>/plant|pot/i.test(o.name))).toBe(false);
    g.traverse(o=>{if(o instanceof T.Mesh) o.geometry.dispose();});m.dispose();
  });
});
