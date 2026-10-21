import { useEffect, useRef } from "react";
import type { Project } from "./model";
import { svgArt } from "./render";
export function LivePattern({ p }: { p: Project }) {
  const img = useRef<HTMLImageElement>(null),
    stopped = useRef(false);
  const original = svgArt(p, 960, 540);
  useEffect(() => {
    stopped.current = false;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      p.vertices.length !== 4 ||
      !p.repeat
    )
      return;
    let t = 0;
    const id = setInterval(() => {
      if (stopped.current || document.hidden) return;
      t += 0.035;
      const q = structuredClone(p);
      q.vertices[0][0] += Math.sin(t) * 12;
      q.vertices[0][1] += Math.sin(t * 0.7) * 9;
      try {
        if (img.current)
          img.current.src =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(svgArt(q, 960, 540));
      } catch {}
    }, 60);
    return () => clearInterval(id);
  }, [p]);
  return (
    <img
      ref={img}
      alt="실제 사각형 엔진으로 움직이는 테셀레이션"
      src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(original)}
      onPointerLeave={() => {
        stopped.current = false;
      }}
      onPointerEnter={() => {
        stopped.current = true;
        if (img.current)
          img.current.src =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(original);
      }}
    />
  );
}
