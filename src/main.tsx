import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Save,
  Layers,
  ScanEye,
  Maximize,
  Minus,
  Plus,
  Move,
  MousePointer2,
  Copy,
  RotateCw,
  FlipHorizontal,
  Trash2,
  Magnet,
  Grid2X2,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  Check,
  HelpCircle,
} from "lucide-react";
import {
  fresh,
  shapes,
  palettes,
  paletteNames,
  parseProject,
  serialize,
  saveLocal,
  listLocal,
  deleteLocal,
  levels,
  projectLevel,
  scatter,
  parseMission,
  validateMission,
  type Project,
} from "./model";
import {
  valid,
  regular,
  escher,
  diagonals,
  isRegular,
  angles,
  center,
  transform,
  move,
  dist,
  inside,
  snap,
  coverage,
  boxPoly,
  multi,
  bounds,
  union,
  type V,
  type Poly,
} from "./geometry";
import { svgArt, viewBox, sceneTiles, path, download, png } from "./render";
const Showroom = lazy(() =>
  import("./Showroom").then((m) => ({ default: m.Showroom })),
);
import { Learning } from "./Learning";
import { questNotes } from "./quests";
import { createExamples, exampleDescriptions } from "./examples";
import "./style.css";
import "./launch.css";
import { LivePattern } from "./LivePattern";
import { LaunchHero } from "./LaunchHero";
import { ReleaseFooter, manualURL, manualsAvailable } from "./ReleaseFooter";
const clone = <T,>(p: T): T => structuredClone(p);
const logo = (
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <path d="M3 7H23L16 20L23 33H3L10 20Z" fill="currentColor" />
    <path d="M26 7H37L30 20L37 33H26L19 20Z" fill="#9bbaa8" />
  </svg>
);
const dataSVG = (s: string) =>
  "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
function App() {
  const [examples] = useState(() =>
    createExamples().map((p) => ({ p, preview: dataSVG(svgArt(p, 480, 270)) })),
  );
  const [p, setP] = useState<Project>(fresh),
    ref = useRef(p),
    [mode, setMode] = useState("home"),
    [tab, setTab] = useState("shape"),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(""),
    [pending, setPending] = useState<Project | null>(null),
    [status, setStatus] = useState<any>(null),
    [lens, setLens] = useState(false),
    [grid, setGrid] = useState(false),
    [magnet, setMagnet] = useState(true),
    [tool, setTool] = useState("edit"),
    [selected, setSelected] = useState<string[]>([]),
    [selectedDecoration, setSelectedDecoration] = useState<string | null>(null),
    [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [board, setBoard] = useState(false),
    [focusCamera, setFocusCamera] = useState<Project["camera"] | null>(null),
    [puzzleCamera, setPuzzleCamera] = useState({ x: 240, y: 40, zoom: 1 }),
    [canvasSize, setCanvasSize] = useState({ w: 960, h: 540 }),
    [scope, setScope] = useState("selected"),
    [width, setWidth] = useState(1920),
    [transparent, setTransparent] = useState(false),
    [grout, setGrout] = useState(true),
    [gallery, setGallery] = useState<Awaited<ReturnType<typeof listLocal>>>([]),
    [saved, setSaved] = useState("저장 준비"),
    [hint, setHint] = useState(0),
    [puzzleResult, setPuzzleResult] = useState<any>(null),
    [guide, setGuide] = useState(-1),
    [tileHint, setTileHint] = useState(() => {
      try { return localStorage.getItem("binteumeopsi-tile-hint-v1") !== "done"; } catch { return true; }
    }),
    [dirty, setDirty] = useState(false),
    [hasSession, setHasSession] = useState(false),
    [multiSelect, setMultiSelect] = useState(false),
    [rename, setRename] = useState(""),
    [, setHistoryVersion] = useState(0);
  const past = useRef<Project[]>([]),
    future = useRef<Project[]>([]),
    input = useRef<HTMLInputElement>(null),
    svg = useRef<SVGSVGElement>(null),
    worker = useRef<Worker | null>(null),
    requestId = useRef(0),
    drag = useRef<any>(null),
    pointers = useRef(new Map<number, V>()),
    pinch = useRef<any>(null),
    space = useRef(false),
    hydrated = useRef(false),
    moveFrame = useRef(0),
    queuedMove = useRef<React.PointerEvent | null>(null),
    focusRef = useRef(focusCamera);
  const puzzleCameraRef = useRef(puzzleCamera);
  puzzleCameraRef.current = puzzleCamera;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressedSave = useRef<string | null>(null);
  const editedProjects = useRef(new Set<string>());
  focusRef.current = focusCamera;
  ref.current = p;
  const notify = (s: string) => setToast(s);
  const commit = (next: Project, history = true) => {
    suppressedSave.current = null;
    editedProjects.current.add(next.id);
    if (history) {
      past.current.push(clone(ref.current));
      if (past.current.length > 120) past.current.shift();
      future.current = [];
      setHistoryVersion((v) => v + 1);
    }
    next.modified = new Date().toISOString();
    ref.current = next;
    setP(next);
    setDirty(true);
  };
  const edit = (fn: (q: Project) => void) => {
    const q = clone(ref.current);
    fn(q);
    commit(q);
  };
  const undo = () => {
    const prev = past.current.pop();
    if (prev) {
      setPuzzleResult(null);
      setSelectedDecoration(null);
      future.current.push(clone(ref.current));
      ref.current = prev;
      setP(prev);
      setDirty(true);
      setHistoryVersion((v) => v + 1);
    }
  };
  const redo = () => {
    const next = future.current.pop();
    if (next) {
      setPuzzleResult(null);
      setSelectedDecoration(null);
      past.current.push(clone(ref.current));
      ref.current = next;
      setP(next);
      setDirty(true);
      setHistoryVersion((v) => v + 1);
    }
  };
  const refreshGallery = () =>
    listLocal()
      .then(setGallery)
      .catch(() => notify("작품 목록을 읽지 못했어요. 파일로 저장해 주세요."));
  const changeMode = (m: string) => {
    setMode(m);
    setFocusCamera(null);
    setPuzzleCamera({ x: 240, y: 40, zoom: 1 });
    if (["studio", "puzzle", "showroom", "learn"].includes(m)) {
      setHasSession(true);
      const q = {
        ...ref.current,
        mode: m as Project["mode"],
        modified: new Date().toISOString(),
      };
      ref.current = q;
      setP(q);
    }
    setSelected([]);
    setHint(0);
    setPuzzleResult(null);
    if (m === "gallery") refreshGallery();
    if (m === "puzzle" && !ref.current.puzzle.pieces.length)
      edit((q) => (q.puzzle.pieces = scatter(q.puzzle.level, projectLevel(q))));
  };
  useEffect(() => {
    listLocal()
      .then((items) => {
        const last = items.find(
          (i) => i.id === localStorage.getItem("binteumeopsi-last"),
        );
        const journal = localStorage.getItem("binteumeopsi-recovery");
        let recovery: Project | null = null;
        try {
          if (journal) recovery = parseProject(journal);
        } catch {}
        const latest =
          recovery && (!last || recovery.modified > last.project.modified)
            ? recovery
            : last?.project;
        if (latest) {
          const r = parseProject(serialize(latest));
          setP(r);
          ref.current = r;
        }
        localStorage.removeItem("binteumeopsi-recovery");
        setGallery(items);
      })
      .catch(() => {})
      .finally(() => (hydrated.current = true));
    worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current.onmessage = ({ data }) => {
      if (data.id === requestId.current)
        setStatus(data.error ? { error: data.error } : data.result);
    };
    return () => worker.current?.terminate();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const b = useMemo(
    () =>
      mode === "puzzle"
        ? {
            x: puzzleCamera.x - 480 / puzzleCamera.zoom,
            y: puzzleCamera.y - 270 / puzzleCamera.zoom,
            w: 960 / puzzleCamera.zoom,
            h: 540 / puzzleCamera.zoom,
          }
        : focusCamera
          ? {
              x: focusCamera.x - 180 / focusCamera.zoom,
              y: focusCamera.y - 220 / focusCamera.zoom,
              w: 360 / focusCamera.zoom,
              h: 440 / focusCamera.zoom,
            }
          : viewBox(p),
    [p.camera, focusCamera, mode, puzzleCamera],
  );
  const bRef = useRef(b);
  bRef.current = b;
  const handleUnit = Math.max(b.w / canvasSize.w, b.h / canvasSize.h);
  useLayoutEffect(() => {
    if (!svg.current) return;
    const rect = svg.current.getBoundingClientRect();
    setCanvasSize({ w: rect.width, h: rect.height });
    const observer = new ResizeObserver(([entry]) =>
      setCanvasSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      }),
    );
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, [mode, !!focusCamera]);
  useEffect(() => () => cancelAnimationFrame(moveFrame.current), []);
  function toggleFocus() {
    if (focusCamera) {
      setFocusCamera(null);
      return;
    }
    const chosen = p.repeat
      ? base
      : p.pieces.filter((s) => selected.includes(s.id)).flatMap((s) => s.p);
    const bound = bounds(chosen.length ? chosen : p.vertices);
    setFocusCamera({
      x: bound.x + bound.w / 2,
      y: bound.y + bound.h / 2,
      zoom: Math.min(2.2, Math.max(0.4, 210 / Math.max(bound.w, bound.h))),
    });
    setTool("edit");
  }
  useEffect(() => {
    setStatus(null);
    const id = ++requestId.current;
    const t = setTimeout(
      () => worker.current?.postMessage({ id, p, box: b }),
      200,
    );
    return () => clearTimeout(t);
  }, [
    p.vertices,
    p.kind,
    p.repeat,
    p.pieces,
    p.style.scale,
    p.style.rotation,
    b,
  ]);
  useEffect(() => {
    if (!hydrated.current || suppressedSave.current === p.id) return;
    setSaved("변경 사항 저장 중");
    const t = setTimeout(() => {
      if (suppressedSave.current === p.id) return;
      let thumbnail = "";
      try {
        thumbnail = dataSVG(svgArt(p, 320, 180));
      } catch {}
      saveLocal(p, thumbnail)
        .then(() => setSaved("이 기기에 자동저장됨"))
        .catch(() => setSaved("자동저장 불가 · 파일로 보관하세요"));
    }, 700);
    autoSaveTimer.current = t;
    return () => clearTimeout(t);
  }, [p]);
  useEffect(() => {
    const flush = () => {
      if (suppressedSave.current === ref.current.id) return;
      try {
        localStorage.setItem(
          "binteumeopsi-recovery",
          serialize(drag.current?.before || ref.current),
        );
      } catch {}
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const el = document.querySelector(".modal") as HTMLElement;
    const focusables = () =>
      Array.from(
        el?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,select,[tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const all = focusables(),
        first = all[0],
        last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal]);
  const getPieces = () =>
    mode === "puzzle" ? ref.current.puzzle.pieces : ref.current.pieces;
  function selectionTransform(angle = 0, scale = 1, flip = false) {
    if (p.repeat && mode !== "puzzle") {
      edit((q) => {
        if (q.kind === "escher" || q.kind.startsWith("mixed")) {
          q.style.rotation = (q.style.rotation + angle) % 360;
          q.style.scale = Math.max(0.3, Math.min(3, q.style.scale * scale));
          if (flip && q.kind === "escher") {
            q.escher.top = q.escher.top
              .slice()
              .reverse()
              .map((v) => [120 - v[0], v[1]]);
            q.escher.left = q.escher.left.map((v) => [-v[0], v[1]]);
            q.vertices = escher(
              q.escher.top,
              q.escher.left,
              120,
              q.escher.curved,
            );
            q.decorations = q.decorations.map((d) => ({
              ...d,
              x: 120 - d.x,
              rotation: -d.rotation,
            }));
          } else if (flip) q.style.rotation = -q.style.rotation;
        } else q.vertices = transform(q.vertices, angle, scale, flip);
      });
      return;
    }
    const chosen = getPieces().filter((s) => selected.includes(s.id));
    if (!chosen.length) {
      notify("먼저 조각을 선택해 주세요.");
      return;
    }
    const c = center(chosen.flatMap((s) => s.p));
    const q = clone(p);
    (mode === "puzzle" ? q.puzzle.pieces : q.pieces).forEach((s) => {
      if (selected.includes(s.id)) s.p = transform(s.p, angle, scale, flip, c);
    });
    if (mode !== "puzzle") {
      const result = coverage(
        q.pieces.map((s) => s.p),
        multi(boxPoly(bounds(q.pieces.flatMap((s) => s.p)))),
      );
      if (result.overlapArea > result.tol) {
        notify("다른 조각과 겹치는 회전·대칭은 적용하지 않아요.");
        return;
      }
    }
    commit(q);
    setPuzzleResult(null);
  }
  function remove() {
    if (mode === "puzzle" || p.repeat) {
      notify("조각 모드에서 선택한 도형을 삭제할 수 있어요.");
      return;
    }
    edit((q) => (q.pieces = q.pieces.filter((s) => !selected.includes(s.id))));
    setSelected([]);
  }
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "Escape") {
        setModal("");
        setBoard(false);
        setSelected([]);
        if (document.fullscreenElement)
          document.exitFullscreen().catch(() => {});
      }
      if (e.code === "Space") {
        space.current = true;
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Delete" && document.activeElement === svg.current)
        remove();
      if (
        (e.key === "+" || e.key === "-") &&
        document.activeElement === svg.current
      )
        zoom(e.key === "+" ? 1.2 : 1 / 1.2);
    };
    const up = () => (space.current = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [p, mode, selected]);
  const renderKey = JSON.stringify([
    p.vertices,
    p.kind,
    p.repeat,
    p.pieces,
    p.style,
    p.escher,
    p.decorations,
    p.layers,
    b,
  ]);
  const { art, tiles, renderError } = useMemo(() => {
    try {
      const tiles = sceneTiles(p, b);
      return {
        art: svgArt(p, b.w, b.h, false, true, b, tiles),
        tiles,
        renderError: "",
      };
    } catch (e) {
      return {
        art: "",
        tiles: [] as ReturnType<typeof sceneTiles>,
        renderError: String(e),
      };
    }
  }, [renderKey]);
  const artURL = useMemo(() => dataSVG(art), [art]);
  const base = transform(
    p.vertices,
    p.style.rotation,
    p.style.scale,
    false,
    [0, 0],
  );
  const puzzle = projectLevel(p);
  const curveArt = p.kind === "escher" && p.escher.curved;
  const activeDecoration = p.decorations.find(
    (d) => d.id === selectedDecoration,
  );
  function finishTileHint() {
    setTileHint(false);
    try { localStorage.setItem("binteumeopsi-tile-hint-v1", "done"); } catch { /* Optional preference. */ }
  }
  function nudgeVertex(i: number, dx: number, dy: number) {
    const q = clone(p);
    if (q.locked && q.kind !== "escher") {
      notify("도형 성질 유지를 먼저 해제해 주세요.");
      return;
    }
    if (q.kind === "escher") {
      const a = i < q.escher.top.length ? q.escher.top : q.escher.left;
      const k = i < q.escher.top.length ? i : i - q.escher.top.length;
      a[k] = [a[k][0] + dx, a[k][1] + dy];
      q.escher.top = q.escher.top.map((v) => [
        Math.max(-120, Math.min(240, v[0])),
        Math.max(-120, Math.min(240, v[1])),
      ]);
      q.escher.left = q.escher.left.map((v) => [
        Math.max(-120, Math.min(240, v[0])),
        Math.max(-120, Math.min(240, v[1])),
      ]);
      q.vertices = escher(q.escher.top, q.escher.left, 120, q.escher.curved);
    } else q.vertices[i] = [q.vertices[i][0] + dx, q.vertices[i][1] + dy];
    if (!valid(q.vertices)) {
      notify("교차하는 변형은 적용하지 않아요.");
      return;
    }
    if (
      q.kind === "escher" &&
      !coverage(
        sceneTiles(q, viewBox(q)).map((t) => t.p),
        multi(boxPoly(viewBox(q))),
      ).ok
    ) {
      notify("이웃 타일과 겹치는 변형이에요.");
      return;
    }
    commit(q);
    if (q.kind === "escher") finishTileHint();
  }

  function choose(key: string) {
    const s = shapes[key];
    edit((q) => {
      q.kind = s.kind;
      q.vertices = clone(s.p);
      q.repeat = true;
      q.locked = key === "hex" || key.startsWith("mixed");
      q.style.scale = 1;
      q.style.rotation = 0;
      q.camera = { x: 0, y: 0, zoom: 1 };
      q.style.colors = {};
      q.style.typeColors = {};
    });
    setSelected([]);
  }
  function startEscher() {
    setTool("edit");
    setFocusCamera(null);
    setSelectedDecoration(null);
    edit((q) => {
      q.kind = "escher";
      q.mode = "studio";
      q.escher.top = q.escher.top.map((v) => [
        Math.max(-120, Math.min(240, v[0])),
        Math.max(-120, Math.min(240, v[1])),
      ]);
      q.escher.left = q.escher.left.map((v) => [
        Math.max(-120, Math.min(240, v[0])),
        Math.max(-120, Math.min(240, v[1])),
      ]);
      q.vertices = escher(q.escher.top, q.escher.left, 120, q.escher.curved);
      q.repeat = true;
      q.style.scale = 1;
      q.style.rotation = 0;
      q.camera = { x: 60, y: 60, zoom: 1 };
    });
    setMode("studio");
    setTab("shape");
  }
  function zoom(f: number) {
    if (mode === "puzzle") {
      setPuzzleCamera((c) => ({
        ...c,
        zoom: Math.max(0.5, Math.min(4, c.zoom * f)),
      }));
      return;
    }
    if (focusRef.current) {
      setFocusCamera({
        ...focusRef.current,
        zoom: Math.max(0.3, Math.min(4, focusRef.current.zoom * f)),
      });
      return;
    }
    edit(
      (q) => (q.camera.zoom = Math.max(0.3, Math.min(4, q.camera.zoom * f))),
    );
  }
  function fitView() {
    if (mode === "puzzle") {
      setPuzzleCamera({ x: 240, y: 40, zoom: 1 });
      return;
    }
    if (focusRef.current) {
      const chosen = p.repeat
        ? base
        : p.pieces.filter((s) => selected.includes(s.id)).flatMap((s) => s.p);
      const bound = bounds(chosen.length ? chosen : p.vertices);
      setFocusCamera({
        x: bound.x + bound.w / 2,
        y: bound.y + bound.h / 2,
        zoom: Math.min(2.2, Math.max(0.4, 210 / Math.max(bound.w, bound.h))),
      });
      return;
    }
    edit((q) => {
      q.camera = {
        x: q.kind === "escher" ? 60 : 0,
        y: q.kind === "escher" ? 60 : 0,
        zoom: 1,
      };
    });
  }
  function world(e: { clientX: number; clientY: number }): V {
    const rect = svg.current!.getBoundingClientRect(),
      vb = bRef.current;
    const scale = Math.min(rect.width / vb.w, rect.height / vb.h),
      offX = (rect.width - vb.w * scale) / 2,
      offY = (rect.height - vb.h * scale) / 2;
    return [
      (e.clientX - rect.left - offX) / scale + vb.x,
      (e.clientY - rect.top - offY) / scale + vb.y,
    ];
  }
  function pointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    svg.current?.focus();
    svg.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.current.size === 2) {
      const a = [...pointers.current.values()];
      pinch.current = {
        d: dist(a[0], a[1]),
        p: clone(ref.current),
        camera: {
          ...(mode === "puzzle"
            ? puzzleCameraRef.current
            : focusRef.current || ref.current.camera),
        },
        box: { ...bRef.current },
        mid: [(a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2],
      };
      drag.current = null;
      return;
    }
    let w = world(e);
    const before = clone(ref.current);
    const rect = svg.current!.getBoundingClientRect();
    const radius = 22 * Math.max(b.w / rect.width, b.h / rect.height);
    const nearest = (points: V[]) =>
      points
        .map((v, i) => ({ i, d: dist(v, w) }))
        .filter((v) => v.d < radius)
        .sort((a, b) => a.d - b.d)[0]?.i ?? -1;
    if (tool === "pan" || space.current) {
      drag.current = {
        kind: "pan",
        start: [e.clientX, e.clientY],
        before,
        focus: focusRef.current,
        puzzleCamera: mode === "puzzle" ? puzzleCameraRef.current : null,
      };
      return;
    }
    if (
      p.kind === "escher" &&
      p.repeat &&
      p.layers.includes("decoration") &&
      tool === "edit" &&
      mode !== "puzzle"
    ) {
      const local = transform(
        [w],
        -p.style.rotation,
        1 / p.style.scale,
        false,
        [0, 0],
      )[0];
      const idx =
        [...p.decorations.keys()]
          .reverse()
          .find(
            (i) =>
              dist([p.decorations[i].x, p.decorations[i].y], local) <
              p.decorations[i].size + 4,
          ) ?? -1;
      if (idx >= 0) {
        setSelectedDecoration(p.decorations[idx].id);
        drag.current = { kind: "decoration", idx, start: local, before };
        return;
      }
      setSelectedDecoration(null);
    }
    if (mode === "puzzle" || !p.repeat) {
      const arr = getPieces(),
        hit =
          [...arr].reverse().find((s) => inside(w, s.p)) ||
          (e.pointerType === "touch"
            ? arr
                .map((s) => ({ s, d: dist(w, center(s.p)) }))
                .filter((a) => a.d < radius)
                .sort((a, b) => a.d - b.d)[0]?.s
            : undefined);
      if (hit) {
        let ids = hit.group
          ? arr.filter((s) => s.group === hit.group).map((s) => s.id)
          : [hit.id];
        if (e.shiftKey || multiSelect)
          ids = [...new Set([...selected, ...ids])];
        else if (selected.includes(hit.id)) ids = selected;
        setSelected(ids);
        drag.current = { kind: "pieces", start: w, before, ids };
      } else setSelected([]);
      return;
    }
    if (tool === "edit") {
      if (p.kind === "escher") {
        const idx = nearest(
          transform(
            [...p.escher.top, ...p.escher.left],
            p.style.rotation,
            p.style.scale,
            false,
            [0, 0],
          ),
        );
        if (idx >= 0) {
          drag.current = { kind: "escher", idx, start: w, before };
          return;
        }
      } else {
        const idx = nearest(base);
        if (idx >= 0) {
          if (p.locked || p.kind.startsWith("mixed")) {
            notify("도형 성질 유지를 해제하면 점을 편집할 수 있어요.");
            return;
          }
          drag.current = { kind: "vertex", idx, start: w, before };
          return;
        }
      }
    }
    const hit = [...tiles].reverse().find((t) => inside(w, t.p));
    if (hit)
      setSelected(
        e.shiftKey || multiSelect
          ? [...new Set([...selected, hit.id])]
          : [hit.id],
      );
  }
  function pointerMove(e: React.PointerEvent) {
    // Capture every pointer before merging visual updates into one RAF.
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    queuedMove.current = e;
    if (moveFrame.current) return;
    moveFrame.current = requestAnimationFrame(() => {
      moveFrame.current = 0;
      const event = queuedMove.current;
      queuedMove.current = null;
      if (event) processPointerMove(event);
    });
  }
  function processPointerMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch.current && pointers.current.size === 2) {
      const arr = [...pointers.current.values()],
        x = clone(pinch.current.p) as Project;
      x.camera = { ...pinch.current.camera };
      x.camera.zoom = Math.max(
        0.3,
        Math.min(
          4,
          (pinch.current.camera.zoom * dist(arr[0], arr[1])) / pinch.current.d,
        ),
      );
      const rect = svg.current!.getBoundingClientRect();
      const oldUnit = Math.max(
          pinch.current.box.w / rect.width,
          pinch.current.box.h / rect.height,
        ),
        newUnit = (oldUnit * pinch.current.camera.zoom) / x.camera.zoom;
      const mid = [(arr[0][0] + arr[1][0]) / 2, (arr[0][1] + arr[1][1]) / 2],
        screenCenter = [rect.left + rect.width / 2, rect.top + rect.height / 2];
      x.camera.x +=
        (pinch.current.mid[0] - screenCenter[0]) * oldUnit -
        (mid[0] - screenCenter[0]) * newUnit;
      x.camera.y +=
        (pinch.current.mid[1] - screenCenter[1]) * oldUnit -
        (mid[1] - screenCenter[1]) * newUnit;
      if (mode === "puzzle") {
        setPuzzleCamera(x.camera);
        return;
      }
      if (focusRef.current) {
        setFocusCamera(x.camera);
        return;
      }
      commit(x, false);
      return;
    }
    const d = drag.current;
    if (!d) return;
    const w = world(e),
      q = clone(d.before) as Project;
    if (d.kind === "pan" && d.puzzleCamera) {
      const scale = Math.max(b.w / canvasSize.w, b.h / canvasSize.h);
      setPuzzleCamera({
        ...d.puzzleCamera,
        x: d.puzzleCamera.x - (e.clientX - d.start[0]) * scale,
        y: d.puzzleCamera.y - (e.clientY - d.start[1]) * scale,
      });
      return;
    }
    if (d.kind === "pan" && d.focus) {
      const scale = Math.max(b.w / canvasSize.w, b.h / canvasSize.h);
      setFocusCamera({
        ...d.focus,
        x: d.focus.x - (e.clientX - d.start[0]) * scale,
        y: d.focus.y - (e.clientY - d.start[1]) * scale,
      });
      return;
    }
    if (d.kind === "pan") {
      const scale =
        960 / svg.current!.getBoundingClientRect().width / q.camera.zoom;
      q.camera.x -= (e.clientX - d.start[0]) * scale;
      q.camera.y -= (e.clientY - d.start[1]) * scale;
    } else if (d.kind === "decoration") {
      const local = transform(
          [w],
          -q.style.rotation,
          1 / q.style.scale,
          false,
          [0, 0],
        )[0],
        deco = q.decorations[d.idx];
      deco.x = Math.max(-120, Math.min(240, deco.x + local[0] - d.start[0]));
      deco.y = Math.max(-120, Math.min(240, deco.y + local[1] - d.start[1]));
    } else if (d.kind === "vertex") {
      q.vertices[d.idx] = transform(
        [w],
        -q.style.rotation,
        1 / q.style.scale,
        false,
        [0, 0],
      )[0];
      if (!valid(q.vertices)) {
        notify("변이 교차하거나 너무 납작해요. 마지막 올바른 모양을 유지해요.");
        return;
      }
    } else if (d.kind === "escher") {
      const arr = d.idx < q.escher.top.length ? q.escher.top : q.escher.left,
        idx = d.idx < q.escher.top.length ? d.idx : d.idx - q.escher.top.length;
      arr[idx] = transform(
        [w],
        -q.style.rotation,
        1 / q.style.scale,
        false,
        [0, 0],
      )[0];
      q.escher.top = q.escher.top.map((v) => [
        Math.max(-120, Math.min(240, v[0])),
        Math.max(-120, Math.min(240, v[1])),
      ]);
      q.escher.left = q.escher.left.map((v) => [
        Math.max(-120, Math.min(240, v[0])),
        Math.max(-120, Math.min(240, v[1])),
      ]);
      q.vertices = escher(q.escher.top, q.escher.left, 120, q.escher.curved);
      if (!valid(q.vertices)) {
        notify("대응하는 변이 교차해요. 점을 안쪽으로 옮겨 주세요.");
        return;
      }
    } else if (d.kind === "pieces") {
      (mode === "puzzle" ? q.puzzle.pieces : q.pieces).forEach((s) => {
        if (d.ids.includes(s.id))
          s.p = move(s.p, [w[0] - d.start[0], w[1] - d.start[1]]);
      });
      setPuzzleResult(null);
    }
    commit(q, false);
  }
  function pointerUp(e: React.PointerEvent) {
    if (queuedMove.current) {
      cancelAnimationFrame(moveFrame.current);
      moveFrame.current = 0;
      const event = queuedMove.current;
      queuedMove.current = null;
      processPointerMove(event);
    }
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size === 0) {
        if (!focusRef.current && mode !== "puzzle")
          past.current.push(pinch.current.p);
        future.current = [];
        pinch.current = null;
        setHistoryVersion((v) => v + 1);
      }
      return;
    }
    const d = drag.current;
    if (!d) return;
    if (d.kind === "escher" && JSON.stringify(d.before.escher) !== JSON.stringify(ref.current.escher)) finishTileHint();
    if (guide === 0 && (d.kind === "vertex" || d.kind === "escher"))
      setGuide(1);
    let q = clone(ref.current);
    if (d.kind === "pieces" && magnet) {
      const arr = mode === "puzzle" ? q.puzzle.pieces : q.pieces,
        moving = arr.filter((s) => d.ids.includes(s.id)),
        fixed = arr.filter((s) => !d.ids.includes(s.id));
      let result = snap(
        moving.map((s) => s.p),
        fixed.map((s) => s.p),
        (14 * b.w) / svg.current!.getBoundingClientRect().width,
      );
      if (mode === "puzzle" && !result.snapped) {
        for (let k = 0; k < moving.length; k++) {
          const target = puzzle.solution.find(
            (s) =>
              dist(center(s), center(moving[k].p)) < 18 &&
              s.length === moving[k].p.length,
          );
          if (target) {
            const offset = [
                center(target)[0] - center(moving[k].p)[0],
                center(target)[1] - center(moving[k].p)[1],
              ] as V,
              candidates = moving.map((s) => move(s.p, offset));
            const r = coverage(
              [...fixed.map((s) => s.p), ...candidates],
              puzzle.target,
            );
            if (r.overlapArea < r.tol) {
              result = { polys: candidates, snapped: true };
              break;
            }
          }
        }
      }
      moving.forEach((s, i) => (s.p = result.polys[i]));
      if (result.snapped) notify("자석 정렬 · 변이 정확하게 만났어요.");
      commit(q, false);
    }
    if (d.kind === "escher") {
      try {
        const r = coverage(
          sceneTiles(q, viewBox(q)).map((t) => t.p),
          multi(boxPoly(viewBox(q))),
        );
        if (!r.ok) throw Error("경계가 이웃 타일과 겹쳐요.");
      } catch {
        commit(clone(d.before), false);
        drag.current = null;
        notify("이웃 타일과 겹치는 변형을 취소했어요.");
        return;
      }
    }
    if (d.kind === "pieces" && mode !== "puzzle") {
      const r = coverage(
        q.pieces.map((s) => s.p),
        multi(boxPoly(bounds(q.pieces.flatMap((s) => s.p)))),
      );
      if (r.overlapArea > r.tol) {
        commit(clone(d.before), false);
        drag.current = null;
        notify("다른 조각과 겹쳐서 이동을 취소했어요. 빈 곳에 놓아 주세요.");
        return;
      }
    }
    if (JSON.stringify(d.before) !== JSON.stringify(q)) {
      past.current.push(d.before);
      if (past.current.length > 120) past.current.shift();
      future.current = [];
      setHistoryVersion((v) => v + 1);
    }
    drag.current = null;
  }
  function changeColor(color: string) {
    edit((q) => {
      if (scope === "all") {
        q.style.palette = [color, color, color, color];
        q.style.colors = {};
        q.style.typeColors = {};
      } else if (scope === "kind") {
        const tile = tiles.find((t) => selected.includes(t.id));
        q.style.typeColors[String(tile?.p.length || q.vertices.length)] = color;
      } else if (selected.length)
        selected.forEach((id) => (q.style.colors[id] = color));
      else q.style.palette[0] = color;
      q.style.recent = [
        color,
        ...q.style.recent.filter((c) => c !== color),
      ].slice(0, 8);
    });
  }
  async function saveFile() {
    download(
      new Blob([serialize(p)], { type: "application/json" }),
      `빈틈없이_${p.title}.binteum.json`,
    );
    setDirty(false);
    notify("편집 가능한 프로젝트 파일을 저장했어요.");
  }
  async function readFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw Error("파일은 2MB 이하로 골라 주세요.");
      const text = await file.text();
      let q: Project;
      if (JSON.parse(text)?.format === "binteumeopsi-mission") {
        const m = parseMission(text);
        q = fresh();
        q.title = m.name;
        q.mode = "puzzle";
        q.puzzle.custom = m;
        q.puzzle.pieces = scatter(0, m);
      } else q = parseProject(text);
      if (dirty) {
        setPending(q);
        setModal("import");
      } else applyImport(q);
    } catch (e) {
      notify("불러오기 실패: " + (e as Error).message);
    }
  }
  async function preserveCurrent() {
    // A downloaded edit still needs local preservation; the untouched startup
    // placeholder does not become a spurious gallery item on file import.
    if (!dirty && !editedProjects.current.has(ref.current.id)) return true;
    if (suppressedSave.current === ref.current.id) return true;
    try {
      const current = ref.current;
      let thumbnail = "";
      try {
        thumbnail = dataSVG(svgArt(current, 320, 180));
      } catch {}
      await saveLocal(current, thumbnail);
      return true;
    } catch {
      if (dirty) {
        notify(
          "현재 작품을 자동저장하지 못했어요. 프로젝트 파일로 먼저 보관해 주세요.",
        );
        return false;
      }
      return true;
    }
  }
  async function applyImport(q: Project) {
    if (!(await preserveCurrent())) return;
    commit(q);
    setPending(null);
    setModal("");
    setMode(q.puzzle.custom ? "puzzle" : q.mode);
    setSelected([]);
    setSelectedDecoration(null);
    setFocusCamera(null);
    setPuzzleCamera({ x: 240, y: 40, zoom: 1 });
    setPuzzleResult(null);
    setHint(0);
    past.current = [];
    future.current = [];
    notify("작품을 불러왔어요. 꼭짓점과 색을 다시 편집할 수 있어요.");
  }
  function togglePieces() {
    edit((q) => {
      if (q.repeat) {
        q.pieces = [{ id: crypto.randomUUID(), p: clone(q.vertices) }];
        q.repeat = false;
        q.style.scale = 1;
        q.style.rotation = 0;
      } else {
        q.repeat = true;
        if (q.pieces[0] && [3, 4, 6].includes(q.pieces[0].p.length)) {
          q.vertices = clone(q.pieces[0].p);
          q.kind =
            q.vertices.length === 6
              ? "hex"
              : q.vertices.length === 3
                ? "triangle"
                : "quad";
        }
      }
    });
    setSelected([]);
  }
  function duplicate() {
    if (p.repeat) {
      notify("먼저 조각 모드로 전환해 주세요.");
      return;
    }
    edit((q) => {
      const arr = q.pieces.filter((s) => selected.includes(s.id));
      if (!arr.length) arr.push({ id: "", p: clone(q.vertices) });
      const next = arr.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        group: undefined,
        p: move(s.p, [35, 35]),
      }));
      next.forEach((copy, i) => {
        if (q.style.colors[arr[i].id])
          q.style.colors[copy.id] = q.style.colors[arr[i].id];
      });
      q.pieces.push(...next);
      setSelected(next.map((s) => s.id));
    });
  }
  function group(un = false) {
    if (p.repeat || (selected.length < 2 && !un)) {
      notify("조각 모드에서 Shift + 클릭으로 여러 조각을 선택하세요.");
      return;
    }
    edit((q) => {
      const id = crypto.randomUUID();
      q.pieces.forEach((s) => {
        if (selected.includes(s.id)) s.group = un ? undefined : id;
      });
    });
  }
  function checkPuzzle() {
    try {
      const r = coverage(
        p.puzzle.pieces.map((s) => s.p),
        puzzle.target,
      );
      setPuzzleResult({ ...r, ok: r.ok && r.outsideArea <= r.tol });
      if (r.ok && r.outsideArea <= r.tol) {
        if (!p.puzzle.custom)
          edit(
            (q) =>
              (q.puzzle.completed = [
                ...new Set([...q.puzzle.completed, q.puzzle.level]),
              ]),
          );
        notify("빈틈없이 완성했어요! 다른 방법으로도 채울 수 있어요.");
      }
    } catch (e) {
      notify(String(e));
    }
  }
  const stylePanel = (
    <>
      <span className="eyebrow">COLOR & TEXTURE</span>
      <h2>색으로 완성하기</h2>
      <div className="button-row" aria-label="미리보기 배율">
        {[0.5, 1, 2].map((z) => (
          <button key={z} onClick={() => edit((q) => (q.camera.zoom = z))}>
            {z * 100}%
          </button>
        ))}
      </div>
      <p className="muted">자연에서 찾은 여덟 가지 팔레트</p>
      <div className="palettes">
        {palettes.map((colors, i) => (
          <button
            className={p.style.palette.join() === colors.join() ? "active" : ""}
            title={paletteNames[i]}
            aria-label={paletteNames[i]}
            key={i}
            onClick={() =>
              edit((q) => {
                q.style.palette = [...colors];
                q.style.colors = {};
                q.style.typeColors = {};
              })
            }
          >
            <span className="palette-swatches">
              {colors.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
            <span className="palette-name">{paletteNames[i]}</span>
          </button>
        ))}
      </div>
      <label>
        색을 바꿀 곳
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="selected">선택한 타일 · 그룹</option>
          <option value="kind">같은 종류</option>
          <option value="all">전체 패턴</option>
        </select>
      </label>
      <div className="color-row">
        <label>
          직접 고르기
          <input
            aria-label="타일 색"
            type="color"
            value={p.style.palette[0]}
            onChange={(e) => changeColor(e.target.value)}
          />
        </label>
        <code>{p.style.palette[0].toUpperCase()}</code>
      </div>
      {p.style.recent.length > 0 && (
        <div className="recent">
          {p.style.recent.map((c) => (
            <button
              key={c}
              title={c}
              style={{ background: c }}
              onClick={() => changeColor(c)}
            />
          ))}
        </div>
      )}
      <div className="pattern-choices" aria-label="무늬 미리보기">
        {Object.entries({
          solid: "단색",
          stripe: "줄무늬",
          dot: "도트",
          checker: "체커",
          line: "가는 선",
          gradient: "그라디언트",
          decal: "기하",
        }).map(([key, name]) => (
          <button
            key={key}
            title={`${name} 무늬 적용`}
            className={p.style.decoration === key ? "active" : ""}
            onClick={() => edit((q) => (q.style.decoration = key))}
          >
            <i className={"pattern-chip " + key} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <label>
        타일 속 무늬
        <select
          aria-label="타일 속 무늬"
          value={p.style.decoration}
          onChange={(e) => edit((q) => (q.style.decoration = e.target.value))}
        >
          {Object.entries({
            solid: "단색",
            stripe: "스트라이프",
            dot: "작은 도트",
            checker: "체커",
            line: "미세한 선",
            gradient: "두 색 그라디언트",
            decal: "기하 데칼",
          }).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label>
        색 반복 주기 · {p.style.period}색
        <input
          type="range"
          min="1"
          max="4"
          value={p.style.period}
          onChange={(e) => edit((q) => (q.style.period = +e.target.value))}
        />
      </label>
      <div className="color-row">
        <label>
          윤곽선
          <input
            type="color"
            aria-label="윤곽선 색"
            value={p.style.stroke}
            onChange={(e) => edit((q) => (q.style.stroke = e.target.value))}
          />
        </label>
        <label>
          바탕색
          <input
            type="color"
            aria-label="바탕색"
            value={p.style.background}
            onChange={(e) => edit((q) => (q.style.background = e.target.value))}
          />
        </label>
      </div>
      <label>
        윤곽선 굵기 · {p.style.line}
        <input
          type="range"
          min="0"
          max="5"
          step=".1"
          value={p.style.line}
          onChange={(e) => edit((q) => (q.style.line = +e.target.value))}
        />
      </label>
      <label>
        모서리 표현
        <select
          value={p.style.join}
          onChange={(e) => edit((q) => (q.style.join = e.target.value))}
        >
          <option value="round">부드러운 모서리</option>
          <option value="miter">뾰족한 모서리</option>
          <option value="bevel">잘린 모서리</option>
        </select>
      </label>
      <label>
        시각적 줄눈 · {p.style.grout}
        <input
          type="range"
          min="0"
          max="8"
          step=".5"
          value={p.style.grout}
          onChange={(e) => edit((q) => (q.style.grout = +e.target.value))}
        />
      </label>
      <p className="note">
        줄눈은 표면 표현이에요. 수학적 빈틈에는 포함하지 않아요.
      </p>
    </>
  );
  const shapePanel = (
    <>
      <span className="eyebrow">01 / SHAPE</span>
      <h2>한 조각의 시작</h2>
      <p className="muted">점을 움직이면 패턴도 달라져요.</p>
      <div className="shape-grid">
        {Object.entries(shapes).map(([key, s]) => (
          <button
            key={key}
            onClick={() => choose(key)}
            className={
              JSON.stringify(p.vertices) === JSON.stringify(s.p) ? "active" : ""
            }
          >
            <svg viewBox="-100 -95 200 190">
              <path d={path(s.p)} />
            </svg>
            {s.label}
          </button>
        ))}
      </div>
      <label>
        정다각형 · 변의 수
        <select
          aria-label="정다각형 변의 수"
          value={
            p.kind === "regular" || p.locked ? String(p.vertices.length) : ""
          }
          onChange={(e) => {
            if (!e.target.value) return;
            const n = +e.target.value;
            edit((q) => {
              q.kind =
                n === 3
                  ? "triangle"
                  : n === 4
                    ? "quad"
                    : n === 6
                      ? "hex"
                      : "regular";
              q.vertices = regular(n);
              q.locked = true;
              q.repeat = true;
              q.style.rotation = 0;
              q.style.scale = 1;
            });
          }}
        >
          <option value="">변의 수 고르기</option>
          {Array.from({ length: 10 }, (_, i) => i + 3).map((n) => (
            <option key={n} value={n}>
              {n}개의 변 · 정{n}각형
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={p.locked}
          onChange={(e) => edit((q) => (q.locked = e.target.checked))}
        />
        도형 성질 유지
      </label>
      <button className="wide soft" onClick={startEscher}>
        <Layers size={18} />
        맞물리는 타일 만들기
        <ChevronRight size={17} />
      </button>
      {p.kind === "escher" && (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={p.escher.curved}
              onChange={(e) => {
                const q = clone(p);
                q.escher.curved = e.target.checked;
                q.vertices = escher(
                  q.escher.top,
                  q.escher.left,
                  120,
                  q.escher.curved,
                );
                if (!valid(q.vertices)) {
                  notify("현재 제어점은 곡선으로 연결하면 교차해요.");
                  return;
                }
                commit(q);
              }}
            />
            자유 아트 · 곡선
          </label>
          {p.escher.curved && (
            <p className="note">
              곡선이 포함되어 수학적 다각형은 아니에요. 같은 베지어 경로를
              반대편에 정확히 옮겨요.
            </p>
          )}
          <p className="note">
            위·왼쪽 점을 움직이면 반대쪽 변도 같이 움직여요.
          </p>
          <button
            disabled={p.escher.top.length >= 12}
            onClick={() =>
              edit((q) => {
                q.escher.top.splice(1, 0, [60, 0]);
                q.escher.top = q.escher.top.map((v) => [
                  Math.max(-120, Math.min(240, v[0])),
                  Math.max(-120, Math.min(240, v[1])),
                ]);
                q.escher.left = q.escher.left.map((v) => [
                  Math.max(-120, Math.min(240, v[0])),
                  Math.max(-120, Math.min(240, v[1])),
                ]);
                q.vertices = escher(
                  q.escher.top,
                  q.escher.left,
                  120,
                  q.escher.curved,
                );
                if (!valid(q.vertices)) {
                  q.escher.top.splice(1, 1);
                  q.escher.top = q.escher.top.map((v) => [
                    Math.max(-120, Math.min(240, v[0])),
                    Math.max(-120, Math.min(240, v[1])),
                  ]);
                  q.escher.left = q.escher.left.map((v) => [
                    Math.max(-120, Math.min(240, v[0])),
                    Math.max(-120, Math.min(240, v[1])),
                  ]);
                  q.vertices = escher(
                    q.escher.top,
                    q.escher.left,
                    120,
                    q.escher.curved,
                  );
                  notify("현재 변에서는 추가 점이 교차해요.");
                }
              })
            }
          >
            위쪽 제어점 추가
          </button>
          <h3>타일 속 작은 장식</h3>
          <div className="button-row">
            {(["eye", "diamond", "dot", "wing"] as const).map((type) => (
              <button
                key={type}
                disabled={p.decorations.length >= 30}
                title={
                  {
                    eye: "눈 장식",
                    diamond: "마름모 장식",
                    dot: "점 장식",
                    wing: "날개 장식",
                  }[type]
                }
                onClick={() =>
                  edit((q) => {
                    const id = crypto.randomUUID();
                    q.decorations.push({
                      id,
                      type,
                      x: 60,
                      y: 60,
                      size: 10,
                      rotation: 0,
                      color: "#253d31",
                    });
                    setSelectedDecoration(id);
                  })
                }
              >
                {{ eye: "눈", diamond: "◇", dot: "●", wing: "날개" }[type]}
              </button>
            ))}
          </div>
          {p.decorations.length > 0 && (
            <label>
              선택한 장식
              <select
                aria-label="선택한 장식"
                value={selectedDecoration || ""}
                onChange={(e) => setSelectedDecoration(e.target.value)}
              >
                <option value="">장식을 골라 주세요</option>
                {p.decorations.map((d, i) => (
                  <option key={d.id} value={d.id}>
                    {i + 1}.{" "}
                    {
                      { eye: "눈", diamond: "마름모", dot: "점", wing: "날개" }[
                        d.type
                      ]
                    }
                  </option>
                ))}
              </select>
            </label>
          )}
          {activeDecoration && (
            <>
              <p className="note">
                가운데 타일의 장식을 끌어서 옮겨 보세요. 타일 밖으로 나간 부분은
                잘려요.
              </p>
              <label>
                장식 크기
                <input
                  aria-label="장식 크기"
                  type="range"
                  min="2"
                  max="40"
                  value={activeDecoration.size}
                  onChange={(e) =>
                    edit(
                      (q) =>
                        (q.decorations.find(
                          (d) => d.id === selectedDecoration,
                        )!.size = +e.target.value),
                    )
                  }
                />
              </label>
              <label>
                장식 회전
                <input
                  aria-label="장식 회전"
                  type="range"
                  min="-180"
                  max="180"
                  step="15"
                  value={activeDecoration.rotation}
                  onChange={(e) =>
                    edit(
                      (q) =>
                        (q.decorations.find(
                          (d) => d.id === selectedDecoration,
                        )!.rotation = +e.target.value),
                    )
                  }
                />
              </label>
              <label>
                장식 색
                <input
                  aria-label="장식 색"
                  type="color"
                  value={activeDecoration.color}
                  onChange={(e) =>
                    edit(
                      (q) =>
                        (q.decorations.find(
                          (d) => d.id === selectedDecoration,
                        )!.color = e.target.value),
                    )
                  }
                />
              </label>
              <button
                className="wide"
                onClick={() => {
                  edit(
                    (q) =>
                      (q.decorations = q.decorations.filter(
                        (d) => d.id !== selectedDecoration,
                      )),
                  );
                  setSelectedDecoration(null);
                }}
              >
                선택한 장식 삭제
              </button>
            </>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={p.layers.includes("decoration")}
              onChange={(e) =>
                edit(
                  (q) =>
                    (q.layers = e.target.checked
                      ? ["pattern", "decoration"]
                      : ["pattern"]),
                )
              }
            />
            장식 레이어 표시
          </label>
        </>
      )}
      <div className="divider" />
      <span className="eyebrow">02 / REPEAT</span>
      <h3>맞물리는 방식</h3>
      <button className="wide" onClick={togglePieces}>
        {p.repeat ? "조각 모드로 직접 배치" : "무한 패턴으로 채우기"}
      </button>
      <div className="button-row">
        <button title="45도 회전" onClick={() => selectionTransform(45)}>
          <RotateCw size={18} />
          45°
        </button>
        <button
          title="좌우 대칭"
          onClick={() => selectionTransform(0, 1, true)}
        >
          <FlipHorizontal size={18} />
          좌우
        </button>
        <button
          title="상하 대칭"
          onClick={() => selectionTransform(180, 1, true)}
        >
          <FlipHorizontal size={18} style={{ transform: "rotate(90deg)" }} />
          상하
        </button>
      </div>
      <label>
        패턴 크기
        <input
          aria-label="패턴 크기"
          type="range"
          min=".5"
          max="2"
          step=".1"
          value={p.style.scale}
          onChange={(e) => edit((q) => (q.style.scale = +e.target.value))}
        />
      </label>
      <label>
        패턴 방향
        <input
          aria-label="패턴 방향"
          type="range"
          min="-180"
          max="180"
          step="15"
          value={p.style.rotation}
          onChange={(e) => edit((q) => (q.style.rotation = +e.target.value))}
        />
      </label>
      {!p.repeat && (
        <>
          <div className="button-row">
            <button onClick={duplicate}>
              <Copy size={16} />
              복제
            </button>
            <button onClick={remove}>
              <Trash2 size={16} />
              삭제
            </button>
          </div>
          <button
            className={"wide " + (multiSelect ? "active" : "")}
            onClick={() => setMultiSelect(!multiSelect)}
          >
            {multiSelect ? "여러 조각 선택 중" : "여러 조각 선택"}
          </button>
          <div className="button-row">
            <button onClick={() => group()}>묶기</button>
            <button onClick={() => group(true)}>풀기</button>
          </div>
          <button
            className="wide"
            onClick={() => {
              try {
                const mission = validateMission({
                  name: p.title,
                  target: union(p.pieces.map((s) => s.p)),
                  solution: p.pieces.map((s) => s.p),
                });
                edit((q) => {
                  q.puzzle.custom = mission;
                  q.puzzle.pieces = scatter(0, mission);
                });
                changeMode("puzzle");
              } catch (e) {
                notify(String(e));
              }
            }}
          >
            현재 조각으로 미션 만들기
          </button>
          <p className="note">
            Shift + 클릭으로 여러 조각을 선택해요. 자석은 길이가 같은 변만
            맞춰요.
          </p>
        </>
      )}
    </>
  );
  const mathPanel = (
    <>
      <span className="eyebrow">MATH LENS</span>
      <h2>도형 속의 수학</h2>
      <div className="stats">
        <div>
          <b>{curveArt ? "—" : p.vertices.length}</b>
          <span>변 · 꼭짓점</span>
        </div>
        <div>
          <b>{curveArt ? "—" : diagonals(p.vertices.length).length}</b>
          <span>대각선</span>
        </div>
      </div>
      <p>
        {curveArt
          ? "곡선이 있는 자유 아트는 수학적 다각형이 아니에요."
          : isRegular(p.vertices)
            ? "모든 변과 각이 같은 정다각형이에요."
            : "변 또는 각의 크기가 서로 다른 다각형이에요."}
      </p>
      <p className="note">
        {curveArt
          ? "곡선 근사 오차 ≤ 0.05 단위. 마주보는 변에는 같은 베지어 경로를 사용해요."
          : "내각 "}
        {(curveArt ? [] : angles(p.vertices))
          .map((n) => n.toFixed(1) + "°")
          .join(" · ")}
      </p>
      {!curveArt && (
        <p className="note">
          둘레{" "}
          {p.vertices
            .reduce(
              (sum, v, i) =>
                sum + dist(v, p.vertices[(i + 1) % p.vertices.length]),
              0,
            )
            .toFixed(2)}{" "}
          단위
        </p>
      )}
      <button
        className={"wide " + (lens ? "active" : "")}
        onClick={() => setLens(!lens)}
      >
        <ScanEye size={17} />
        {lens ? "수학 렌즈 끄기" : "수학 렌즈 켜기"}
      </button>
      <div className="verification">
        <h3>
          {status?.ok
            ? "✓ 빈틈없음 확인"
            : status?.error
              ? "검증할 수 없어요"
              : status
                ? "틈 또는 겹침 발견"
                : "검증 중…"}
        </h3>
        {status && !status.error && (
          <>
            <p>
              빈틈 <b>{status.gapArea.toFixed(5)}</b>
            </p>
            <p>
              겹침 <b>{status.overlapArea.toFixed(5)}</b>
            </p>
            <small>
              현재 아트보드 영역 · 제곱 단위
              <br />
              허용오차 {status.tol.toExponential(2)}
            </small>
          </>
        )}
        {status?.error && <p>{status.error}</p>}
      </div>
      <p className="note">
        정오각형·정칠각형·정팔각형 한 종류로는 변끼리 맞대어 평면을 채울 수
        없어요. 모든 오각형이 불가능한 것은 아니에요.
      </p>
      <button className="wide" onClick={() => changeMode("learn")}>
        10가지 탐구 카드 열기
        <ArrowUpRight size={17} />
      </button>
    </>
  );
  return (
    <div
      className={
        "app " +
        (board ? "whiteboard " : "") +
        (focusCamera ? "focus-edit" : "")
      }
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        readFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".json,.binteum.json"
        hidden
        aria-label="프로젝트 파일"
        onChange={(e) => {
          readFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <header className="header">
        <button
          className="brand"
          title="메인페이지로 돌아가기"
          onClick={() => changeMode("home")}
        >
          {logo}
          <strong>빈틈없이</strong>
        </button>
        <span className="brand-sub">테셀레이션 디자인 스튜디오</span>
        {mode !== "home" && (
          <input
            className="title-input"
            aria-label="작품 제목"
            maxLength={80}
            value={p.title}
            onChange={(e) => edit((q) => (q.title = e.target.value))}
          />
        )}
        <div className="header-actions">
          {mode === "home" ? (
            <>
              {manualsAvailable && <a className="manual-help-link" href={manualURL} target="_blank" rel="noopener noreferrer">사용설명서</a>}
              <button onClick={() => setModal("help")}>사용 가이드</button>
              <button className="primary" onClick={() => changeMode("gallery")}>
                내 작품 이어하기
                <ArrowUpRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                className="mobile-title"
                title="작품 이름 바꾸기"
                aria-label="작품 이름 바꾸기"
                onClick={() => {
                  setPending(p);
                  setRename(p.title);
                  setModal("rename");
                }}
              >
                <span aria-hidden="true" className="rename-symbol">
                  ✎
                </span>
              </button>
              <button
                title="현재 프로젝트 저장"
                aria-label="현재 프로젝트 저장"
                onClick={() => {
                  saveLocal(p, dataSVG(art))
                    .then(() => notify("이 기기의 작품 목록에 저장했어요."))
                    .catch(() =>
                      notify("저장 공간 오류 · 파일 저장을 사용해 주세요."),
                    );
                }}
              >
                <Save size={17} />
                <span>저장</span>
              </button>
              <button
                title="프로젝트 불러오기"
                aria-label="프로젝트 불러오기"
                onClick={() => input.current?.click()}
              >
                <FolderOpen size={17} />
                <span>불러오기</span>
              </button>
              <button
                className="primary"
                aria-label="내보내기"
                onClick={() => setModal("export")}
              >
                <Download size={17} />
                <span>내보내기</span>
              </button>
            </>
          )}
        </div>
      </header>
      {mode === "home" ? (
        <main className="home launch-home">
          <LaunchHero
            onStart={() => {
              changeMode("studio");
              if (!localStorage.getItem("binteumeopsi-guide")) setGuide(0);
            }}
            onResume={() => changeMode(ref.current.mode)}
            onPuzzle={() => changeMode("puzzle")}
            onShowroom={() => changeMode("showroom")}
            canResume={gallery.length > 0 || dirty || hasSession}
            title={p.title}
          />
          <section className="launch-process" aria-label="도형에서 공간으로">
            <div className="launch-live">
              <LivePattern p={p} />
            </div>
            <div>
              <span className="eyebrow">ONE SHAPE, ENDLESS POSSIBILITIES</span>
              <h2>
                움직이는 한 조각,
                <br />
                새롭게 열리는 가능성.
              </h2>
              <p>
                점을 움직여 모양을 바꾸고, 색과 무늬를 입혀 보세요.
                <br />
                빈틈없이 이어진 패턴이 나만의 공간이 됩니다.
              </p>
            </div>
            <ol>
              <li>
                <span>01</span> 도형을 만들고
              </li>
              <li>
                <span>02</span> 패턴으로 채우고
              </li>
              <li>
                <span>03</span> 공간으로 완성해요
              </li>
            </ol>
          </section>
          <section className="home-bottom">
            <div>
              <span className="eyebrow">START WITH A SHAPE</span>
              <h3>어떤 조각으로 시작할까요?</h3>
            </div>
            {["quad", "triangle", "hex"].map((k, i) => (
              <button
                className="sample"
                key={k}
                onClick={() => {
                  choose(k);
                  changeMode("studio");
                }}
              >
                <svg viewBox="-100 -100 200 200">
                  <path d={path(shapes[k].p)} fill={palettes[0][i]} />
                </svg>
                <span>
                  {["이상한 사각형", "삼각형의 춤", "벌집 패턴"][i]}
                  <small>직접 움직여 보기 ↗</small>
                </span>
              </button>
            ))}
            <button className="sample" onClick={startEscher}>
              <svg viewBox={(() => {
                const box = bounds(escher(p.escher.top, p.escher.left));
                return `${box.x - 16} ${box.y - 16} ${box.w + 32} ${box.h + 32}`;
              })()} aria-hidden="true">
                <path
                  d={path(escher(p.escher.top, p.escher.left))}
                  fill="#c58d65"
                />
              </svg>
              <span>
                나만의 맞물림 타일<small>타일의 변을 움직여도 빈틈없이 이어져요!</small>
              </span>
            </button>
          </section>
          <section
            className="example-collection"
            id="example-collection"
            tabIndex={-1}
          >
            <div className="collection-heading">
              <span className="eyebrow">SIX SMALL WORLDS</span>
              <h2>마음에 드는 작품에서 출발해요.</h2>
              <p>모든 예제는 다시 움직이고, 색칠하고, 저장할 수 있어요.</p>
            </div>
            {examples.map(({ p: sample, preview }, i) => (
              <button
                key={sample.id}
                className="example-card"
                onClick={async () => {
                  if (!(await preserveCurrent())) return;
                  const next = clone(sample);
                  next.id = crypto.randomUUID();
                  commit(next);
                  changeMode("studio");
                }}
              >
                <img src={preview} alt={sample.title + " 실제 패턴"} />
                <span>
                  <b>{sample.title}</b>
                  <small>{exampleDescriptions[i]}</small>
                </span>
              </button>
            ))}
          </section>
        </main>
      ) : (
        <>
          <nav className="modebar">
            {[
              ["studio", "패턴 작업실"],
              ["puzzle", "틈새 챌린지"],
              ["showroom", "디자인 쇼룸"],
              ["learn", "수학 탐구"],
              ["gallery", "나의 작품"],
            ].map(([m, n]) => (
              <button
                className={mode === m ? "active" : ""}
                key={m}
                onClick={() => changeMode(m)}
              >
                {n}
              </button>
            ))}
            <span className="save-status">{saved}</span>
          </nav>
          {mode === "studio" || mode === "puzzle" ? (
            <main
              className={
                "workspace " +
                ((tab === "style" || tab === "math") && right && mode === "studio" ? "style-open " : "") +
                (mode === "puzzle" ? "quest-workspace " : "") +
                (!left ? "left-closed " : "") +
                (!right ? "right-closed" : "")
              }
            >
              <aside
                className={
                  "panel left-panel " +
                  (tab === "shape" || tab === "repeat" ? "mobile-open" : "")
                }
                hidden={!left}
              >
                {mode === "puzzle" ? (
                  <>
                    <span className="eyebrow">
                      GAP QUEST / {p.puzzle.completed.length} OF 18
                    </span>
                    <h2>조각을 맞춰요</h2>
                    <label>
                      도전할 퍼즐
                      <select
                        aria-label="퍼즐 단계"
                        value={p.puzzle.level}
                        onChange={(e) => {
                          edit((q) => {
                            if (q.puzzle.catalog !== "v2")
                              q.puzzle.completed = [];
                            q.puzzle.catalog = "v2";
                            q.puzzle.level = +e.target.value;
                            q.puzzle.custom = null;
                            q.puzzle.pieces = scatter(
                              q.puzzle.level,
                              projectLevel(q),
                            );
                          });
                          setHint(0);
                          setPuzzleResult(null);
                        }}
                      >
                        {levels.map((l, i) => (
                          <option key={i} value={i}>
                            {i + 1}. {l.difficulty} · {l.name}
                            {p.puzzle.completed.includes(i) ? " ✓" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      {p.puzzle.catalog === "v2"
                        ? questNotes[p.puzzle.level][2]
                        : "왼쪽 실루엣을 오른쪽 조각으로 채워 보세요."}{" "}
                      조각을 누른 뒤 회전할 수 있어요.
                    </p>
                    <button className="wide primary" onClick={checkPuzzle}>
                      빈틈 확인하기
                      <Check size={17} />
                    </button>
                    <button
                      className="wide"
                      onClick={() => setHint(Math.min(3, hint + 1))}
                    >
                      힌트 {hint}/3
                      <HelpCircle size={17} />
                    </button>
                    {hint > 0 && (
                      <p className="feedback">
                        {hint === 1
                          ? p.puzzle.catalog === "v2"
                            ? questNotes[p.puzzle.level][2]
                            : "왼쪽 위 모서리부터 시작해 보세요."
                          : hint === 2
                            ? "선택한 조각을 돌리거나 뒤집어 긴 변을 맞춰요."
                            : "점선 위치에 첫 조각을 놓아 보세요."}
                      </p>
                    )}
                    <button
                      className="wide"
                      onClick={() =>
                        download(
                          new Blob(
                            [
                              JSON.stringify(
                                {
                                  format: "binteumeopsi-mission",
                                  schemaVersion: 1,
                                  ...puzzle,
                                },
                                null,
                                2,
                              ),
                            ],
                            { type: "application/json" },
                          ),
                          `빈틈없이_${puzzle.name}.mission.json`,
                        )
                      }
                    >
                      교사용 미션 파일 저장
                    </button>
                    <button
                      className="wide"
                      onClick={() => input.current?.click()}
                    >
                      미션 파일 불러오기
                    </button>
                    <button
                      className="wide"
                      onClick={() => {
                        edit(
                          (q) =>
                            (q.puzzle.pieces = scatter(
                              q.puzzle.level,
                              projectLevel(q),
                            )),
                        );
                        setPuzzleResult(null);
                      }}
                    >
                      조각 다시 놓기
                    </button>
                    {puzzleResult && (
                      <div
                        className={
                          "verification " +
                          (puzzleResult.ok ? "quest-success" : "")
                        }
                      >
                        <h3>
                          {puzzleResult.ok
                            ? "✓ 빈틈없이 완성!"
                            : "조금 더 맞춰 볼까요?"}
                        </h3>
                        <p>
                          빈틈 {puzzleResult.gapArea.toFixed(2)}
                          <br />
                          겹침 {puzzleResult.overlapArea.toFixed(2)}
                          <br />
                          실루엣 밖 {puzzleResult.outsideArea.toFixed(2)}
                        </p>
                        {puzzleResult.ok && p.puzzle.catalog === "v2" && (
                          <p className="quest-takeaway">
                            {questNotes[p.puzzle.level][1]}
                          </p>
                        )}
                        {puzzleResult.ok && (
                          <button
                            onClick={() => {
                              edit((q) => {
                                q.pieces = clone(q.puzzle.pieces);
                                q.repeat = false;
                              });
                              changeMode("studio");
                            }}
                          >
                            자유 작품으로 이어 만들기
                          </button>
                        )}
                        {puzzleResult.ok && (
                          <button
                            onClick={() => {
                              const next = (p.puzzle.level + 1) % 18;
                              edit((q) => {
                                if (q.puzzle.catalog !== "v2")
                                  q.puzzle.completed = [];
                                q.puzzle.catalog = "v2";
                                q.puzzle.level = next;
                                q.puzzle.custom = null;
                                q.puzzle.pieces = scatter(next);
                              });
                              setPuzzleResult(null);
                              setHint(0);
                            }}
                          >
                            다음 퍼즐 →
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  shapePanel
                )}
              </aside>
              <section className="canvas-section">
                <div className="canvas-top">
                  <button title="도형 패널 접기" onClick={() => setLeft(!left)}>
                    <PanelLeftClose size={17} />
                  </button>
                  <span>
                    {mode === "puzzle"
                      ? `${p.puzzle.level + 1} / 18 — ${puzzle.name}`
                      : p.kind === "escher"
                        ? "맞물리는 타일 · 흰 점으로 모양 바꾸기"
                        : "MY PATTERN / 16:9 ARTBOARD"}
                  </span>
                  <button
                    title="스타일 패널 접기"
                    onClick={() => {
                      if (window.innerWidth <= 1100) {
                        setTab(
                          tab === "style" || tab === "math" ? "shape" : "style",
                        );
                        setRight(true);
                      } else setRight(!right);
                    }}
                  >
                    <PanelRightClose size={17} />
                  </button>
                </div>
                  {guide >= 0 && (
                    <div
                      className="creation-journey"
                      aria-label="첫 패턴 만들기"
                    >
                      <span>한 조각에서 나만의 공간까지</span>
                      <button
                        className={guide === 0 ? "active" : ""}
                        onClick={() => {
                          setTool("edit");
                          if (innerWidth < 600 && !focusCamera) toggleFocus();
                          setGuide(0);
                        }}
                      >
                        1 점 움직이기
                      </button>
                      <button
                        className={guide === 1 ? "active" : ""}
                        onClick={() => {
                          if (!p.repeat) togglePieces();
                          setFocusCamera(null);
                          setGuide(2);
                        }}
                      >
                        2 패턴 펼치기
                      </button>
                      <button
                        className={guide === 2 ? "active" : ""}
                        onClick={() => {
                          setTab("style");
                          setRight(true);
                          setGuide(3);
                        }}
                      >
                        3 색과 무늬
                      </button>
                      <button
                        onClick={() => {
                          changeMode("showroom");
                          setGuide(-1);
                          localStorage.setItem("binteumeopsi-guide", "1");
                        }}
                      >
                        4 공간에 적용
                      </button>
                      <button
                        title="첫 패턴 안내 닫기"
                        onClick={() => {
                          setGuide(-1);
                          localStorage.setItem("binteumeopsi-guide", "1");
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                {mode === "studio" && p.kind === "escher" && tileHint && tool === "edit" && (
                  <div className="tile-hint" role="status">
                    <span><strong>이 점을 움직여 보세요!</strong><br />테두리가 빛나는 흰 점을 끌면 반대쪽 변도 함께 움직여요.</span>
                    <button onClick={finishTileHint} aria-label="타일 조작 안내 닫기">확인</button>
                  </div>
                )}
                <div className="canvas-shell">
                  <svg
                    ref={svg}
                    role="img"
                    aria-label="패턴 편집 캔버스"
                    tabIndex={0}
                    className="artboard"
                    viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}
                    onPointerDown={pointerDown}
                    onPointerMove={pointerMove}
                    onPointerUp={pointerUp}
                    onPointerCancel={pointerUp}
                    onWheel={(e) => {
                      zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
                    }}
                  >
                    {mode === "puzzle" ? (
                      <>
                        <rect
                          x={b.x}
                          y={b.y}
                          width={b.w}
                          height={b.h}
                          fill="#f8f7f3"
                        />
                        {puzzle.target.map((poly, i) => (
                          <path
                            key={i}
                            d={poly.map((r) => path(r as Poly)).join("")}
                            fillRule="evenodd"
                            fill="#e2e5dd"
                            stroke="#8b9c91"
                            strokeWidth="2"
                            strokeDasharray="5 5"
                          />
                        ))}
                        {hint === 3 && (
                          <path
                            d={path(puzzle.solution[0])}
                            fill="#b8d3be"
                            stroke="#28604d"
                            strokeWidth="3"
                            strokeDasharray="5 5"
                          />
                        )}
                        {p.puzzle.pieces.map((s, i) => (
                          <path
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`퍼즐 조각 ${i + 1} · 방향키 이동, R 회전`}
                            onFocus={() => setSelected([s.id])}
                            onKeyDown={(e) => {
                              const step = e.shiftKey ? 10 : 3;
                              const delta: Record<string, V> = {
                                ArrowLeft: [-step, 0],
                                ArrowRight: [step, 0],
                                ArrowUp: [0, -step],
                                ArrowDown: [0, step],
                              };
                              if (delta[e.key]) {
                                e.preventDefault();
                                edit((q) => {
                                  const piece = q.puzzle.pieces.find(
                                    (a) => a.id === s.id,
                                  )!;
                                  piece.p = move(piece.p, delta[e.key]);
                                });
                                setPuzzleResult(null);
                              }
                              if (e.key.toLowerCase() === "r") {
                                e.preventDefault();
                                selectionTransform(90);
                              }
                            }}
                            d={path(s.p)}
                            fill={p.style.palette[i % 4]}
                            stroke={
                              selected.includes(s.id) ? "#c86436" : "#fff"
                            }
                            strokeWidth={selected.includes(s.id) ? 4 : 1.5}
                          />
                        ))}
                        {puzzleResult &&
                          !puzzleResult.ok &&
                          puzzleResult.gap.map((poly: any, i: number) => (
                            <path
                              key={i}
                              d={poly.map(path).join("")}
                              fill="#ef4444"
                              fillOpacity=".3"
                              fillRule="evenodd"
                            />
                          ))}
                      </>
                    ) : (
                      <>
                        <image
                          x={b.x}
                          y={b.y}
                          width={b.w}
                          height={b.h}
                          href={artURL}
                        />
                        {grid && (
                          <>
                            <defs>
                              <pattern
                                id="grid"
                                width="20"
                                height="20"
                                patternUnits="userSpaceOnUse"
                              >
                                <circle r="1" fill="#233e35" />
                              </pattern>
                            </defs>
                            <rect
                              x={b.x}
                              y={b.y}
                              width={b.w}
                              height={b.h}
                              fill="url(#grid)"
                              opacity=".4"
                            />
                          </>
                        )}
                        {tiles
                          .filter((t) => selected.includes(t.id))
                          .map((t) => (
                            <path
                              key={t.id}
                              d={path(t.p)}
                              fill="none"
                              stroke="#ed794b"
                              strokeWidth={3 / p.camera.zoom}
                            />
                          ))}
                        {p.repeat &&
                          !p.kind.startsWith("mixed") &&
                          tool === "edit" && (
                            <>
                              <path
                                d={path(base)}
                                fill="#ffffff"
                                fillOpacity=".12"
                                stroke="#fff"
                                strokeWidth={2 / p.camera.zoom}
                              />
                              {(p.kind === "escher"
                                ? transform(
                                    [...p.escher.top, ...p.escher.left],
                                    p.style.rotation,
                                    p.style.scale,
                                    false,
                                    [0, 0],
                                  )
                                : base
                              ).map((v, i) => (
                                <g key={i}>
                                  {p.kind === "escher" && tileHint && i === 0 && (
                                    <circle className="tile-point-halo" cx={v[0]} cy={v[1]} r={13 * handleUnit} fill="none" stroke="#d5792d" strokeWidth={3 * handleUnit} pointerEvents="none" aria-hidden="true" />
                                  )}
                                  <circle
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`꼭짓점 ${i + 1} · 방향키로 이동`}
                                    onKeyDown={(e) => {
                                      const step = e.shiftKey ? 10 : 2;
                                      const delta: Record<string, V> = {
                                        ArrowLeft: [-step, 0],
                                        ArrowRight: [step, 0],
                                        ArrowUp: [0, -step],
                                        ArrowDown: [0, step],
                                      };
                                      if (delta[e.key]) {
                                        e.preventDefault();
                                        nudgeVertex(i, ...delta[e.key]);
                                      }
                                    }}
                                    cx={v[0]}
                                    cy={v[1]}
                                    r={5 * handleUnit}
                                    fill="#fff"
                                    stroke="#1e5144"
                                    strokeWidth={1.5 * handleUnit}
                                  />
                                  <circle
                                    cx={v[0]}
                                    cy={v[1]}
                                    r={22 * handleUnit}
                                    fill="transparent"
                                    aria-hidden="true"
                                    className="touch-target"
                                  />
                                  {lens && (
                                    <text
                                      x={v[0] + 10 / p.camera.zoom}
                                      y={v[1] - 10 / p.camera.zoom}
                                      fontSize={13 / p.camera.zoom}
                                      fill="#102f27"
                                    >
                                      {i + 1}
                                    </text>
                                  )}
                                </g>
                              ))}
                            </>
                          )}
                        {p.kind === "escher" &&
                          p.layers.includes("decoration") &&
                          activeDecoration &&
                          (() => {
                            const v = transform(
                              [[activeDecoration.x, activeDecoration.y]],
                              p.style.rotation,
                              p.style.scale,
                              false,
                              [0, 0],
                            )[0];
                            return (
                              <circle
                                tabIndex={0}
                                role="button"
                                aria-label="장식 이동"
                                cx={v[0]}
                                cy={v[1]}
                                r={(activeDecoration.size + 4) * p.style.scale}
                                fill="none"
                                stroke="#ed794b"
                                strokeWidth={2 / p.camera.zoom}
                                strokeDasharray="3 3"
                                onKeyDown={(e) => {
                                  const delta: Record<string, V> = {
                                    ArrowLeft: [-2, 0],
                                    ArrowRight: [2, 0],
                                    ArrowUp: [0, -2],
                                    ArrowDown: [0, 2],
                                  };
                                  if (delta[e.key]) {
                                    e.preventDefault();
                                    edit((q) => {
                                      const d = q.decorations.find(
                                        (a) => a.id === selectedDecoration,
                                      )!;
                                      d.x = Math.max(
                                        -120,
                                        Math.min(240, d.x + delta[e.key][0]),
                                      );
                                      d.y = Math.max(
                                        -120,
                                        Math.min(240, d.y + delta[e.key][1]),
                                      );
                                    });
                                  }
                                }}
                              />
                            );
                          })()}
                        {lens && (
                          <>
                            {(curveArt ? [] : diagonals(base.length))
                              .slice(0, 30)
                              .map(([i, j]) => (
                                <path
                                  key={i + ":" + j}
                                  d={`M${base[i]}L${base[j]}`}
                                  stroke="#fff"
                                  strokeWidth={1.5 / p.camera.zoom}
                                  strokeDasharray="6 4"
                                />
                              ))}
                            {(curveArt ? [] : base).map((v, i) => (
                              <circle
                                key={i}
                                cx={(v[0] + base[(i + 1) % base.length][0]) / 2}
                                cy={(v[1] + base[(i + 1) % base.length][1]) / 2}
                                r={3 / p.camera.zoom}
                                fill="#f4c969"
                              />
                            ))}
                            {status?.gap?.map((poly: any, i: number) => (
                              <path
                                key={"gap" + i}
                                d={poly.map(path).join("")}
                                fill="#ef4444"
                                fillOpacity=".45"
                                fillRule="evenodd"
                              />
                            ))}
                            {status?.over?.map((poly: any, i: number) => (
                              <path
                                key={"over" + i}
                                d={poly.map(path).join("")}
                                fill="#7c3aed"
                                fillOpacity=".6"
                                fillRule="evenodd"
                              />
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </svg>
                  {renderError && mode !== "puzzle" && (
                    <div className="canvas-message">
                      {renderError}
                      <button
                        onClick={() =>
                          edit((q) => (q.camera = { x: 0, y: 0, zoom: 1 }))
                        }
                      >
                        화면 맞춤
                      </button>
                    </div>
                  )}

                </div>
                {mode === "studio" && (
                  <button className="focus-toggle" onClick={toggleFocus}>
                    {focusCamera
                      ? "전체 16:9 구도로 돌아가기"
                      : "한 조각 집중 편집"}
                  </button>
                )}
                <div className="canvas-toolbar">
                  <div className="tool-group">
                    <button
                      title="선택 / 점 편집"
                      className={tool === "edit" ? "active" : ""}
                      onClick={() => setTool("edit")}
                    >
                      <MousePointer2 size={19} />
                    </button>
                    <button
                      title="화면 이동"
                      className={tool === "pan" ? "active" : ""}
                      onClick={() => setTool("pan")}
                    >
                      <Move size={19} />
                    </button>
                  </div>
                  <div className="tool-group">
                    <button
                      title="되돌리기"
                      disabled={!past.current.length}
                      onClick={undo}
                    >
                      <Undo2 size={19} />
                    </button>
                    <button
                      title="다시 하기"
                      disabled={!future.current.length}
                      onClick={redo}
                    >
                      <Redo2 size={19} />
                    </button>
                    <button
                      title={
                        mode === "puzzle" ? "조각 90도 회전" : "도형 45도 회전"
                      }
                      onClick={() =>
                        selectionTransform(mode === "puzzle" ? 90 : 45)
                      }
                    >
                      <RotateCw size={19} />
                    </button>
                  </div>
                  <div className="tool-group">
                    <button
                      title="자석 정렬"
                      className={magnet ? "active" : ""}
                      onClick={() => setMagnet(!magnet)}
                    >
                      <Magnet size={19} />
                    </button>
                    <button
                      title="격자"
                      className={grid ? "active" : ""}
                      onClick={() => setGrid(!grid)}
                    >
                      <Grid2X2 size={19} />
                    </button>
                    <button
                      title="수학 렌즈"
                      className={lens ? "active" : ""}
                      onClick={() => setLens(!lens)}
                    >
                      <ScanEye size={19} />
                    </button>
                  </div>
                  {mode === "puzzle" && (
                    <div className="tool-group">
                      <button
                        title="조각 좌우 대칭"
                        onClick={() => selectionTransform(0, 1, true)}
                      >
                        <FlipHorizontal size={18} />
                      </button>
                      <button
                        title="조각 60도 회전"
                        onClick={() => selectionTransform(60)}
                      >
                        60°
                      </button>
                    </div>
                  )}
                  <div className="tool-group zoom-tools">
                    <button title="축소" onClick={() => zoom(1 / 1.25)}>
                      <Minus size={16} />
                    </button>
                    <button title="화면 맞춤" onClick={fitView}>
                      {Math.round(
                        (mode === "puzzle"
                          ? puzzleCamera.zoom
                          : (focusCamera?.zoom ?? p.camera.zoom)) * 100,
                      )}
                      %
                    </button>
                    <button title="확대" onClick={() => zoom(1.25)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    title="전자칠판 모드"
                    onClick={() => {
                      setBoard(!board);
                      if (!board)
                        document.documentElement
                          .requestFullscreen?.()
                          .catch(() => {});
                      else if (document.fullscreenElement)
                        document.exitFullscreen().catch(() => {});
                    }}
                  >
                    <Maximize size={18} />
                  </button>
                </div>
                <footer className="canvas-footer">
                  <span className={status?.ok ? "certified" : "pending"}>
                    {mode === "puzzle"
                      ? "조각을 끌고, 돌려서 채워요"
                      : status?.ok
                        ? "✓ 빈틈 · 겹침 없음"
                        : status?.error
                          ? "! 검증 오류"
                          : status
                            ? "○ 틈 또는 겹침을 살펴보세요"
                            : "◌ 정확한 면적 검증 중"}
                  </span>
                  <span>
                    {mode === "puzzle" ? p.puzzle.pieces.length : tiles.length}{" "}
                    조각 ·{" "}
                    {mode === "puzzle" ? "유한 영역 채우기" : "평면 반복"}
                  </span>
                </footer>
              </section>
              <aside
                className={
                  "panel right-panel " +
                  (tab === "style" || tab === "math" ? "mobile-open" : "")
                }
                hidden={!right}
              >
                <div className="panel-tabs">
                  <button
                    className={tab !== "math" ? "active" : ""}
                    onClick={() => setTab("style")}
                  >
                    색 / 무늬
                  </button>
                  <button
                    className={tab === "math" ? "active" : ""}
                    onClick={() => setTab("math")}
                  >
                    수학
                  </button>
                </div>
                {tab === "math" ? mathPanel : stylePanel}
                <button
                  className="wide showroom-link"
                  onClick={() => changeMode("showroom")}
                >
                  내 패턴을 공간에
                  <ArrowUpRight size={18} />
                </button>
              </aside>
              <nav className="mobile-tabs">
                {[
                  ["shape", "도형"],
                  ["repeat", "반복"],
                  ["style", "색 / 재질"],
                  ["math", "수학"],
                ].map(([k, n]) => (
                  <button
                    className={tab === k ? "active" : ""}
                    key={k}
                    onClick={() => {
                      setTab(k);
                      setLeft(true);
                      setRight(true);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            </main>
          ) : mode === "showroom" ? (
            <Suspense
              fallback={
                <div className="room-loading" role="status">
                  공간에 빛을 켜는 중…
                </div>
              }
            >
              <Showroom
                p={p}
                onChange={(s) => edit((q) => (q.showroom = s))}
                onError={notify}
              />
            </Suspense>
          ) : mode === "learn" ? (
            <Learning
              onExplore={async (card, target) => {
                if (target === "puzzle") {
                  const level = [0, 1, 8, 3, 3, 6, 8, 8, 13, 4][card];
                  edit((q) => {
                    if (q.puzzle.catalog !== "v2") q.puzzle.completed = [];
                    q.puzzle.catalog = "v2";
                    q.puzzle.level = level;
                    q.puzzle.custom = null;
                    q.puzzle.pieces = scatter(level);
                  });
                  changeMode("puzzle");
                } else {
                  if (!(await preserveCurrent())) return;
                  commit({
                    ...clone(ref.current),
                    id: crypto.randomUUID(),
                    title: "수학 탐구 작품",
                  });
                  choose(
                    card === 6
                      ? "pentagon"
                      : card === 7
                        ? "hex"
                        : card === 2
                          ? "square"
                          : "quad",
                  );
                  changeMode("studio");
                  setLens(true);
                  setTab("math");
                }
              }}
            />
          ) : (
            <main className="gallery">
              <div className="gallery-heading">
                <div>
                  <span className="eyebrow">YOUR LITTLE COLLECTION</span>
                  <h1>내가 만든 세계</h1>
                  <p>
                    이 브라우저에 저장된 작품이에요. 소중한 작품은 파일로도
                    보관해 주세요.
                  </p>
                </div>
                <button
                  className="primary"
                  onClick={async () => {
                    if (!(await preserveCurrent())) return;
                    commit(fresh());
                    changeMode("studio");
                  }}
                >
                  <Plus size={18} />새 프로젝트
                </button>
              </div>
              <div className="gallery-grid">
                {gallery.map((item) => (
                  <article key={item.id}>
                    <button
                      className="gallery-cover"
                      onClick={() =>
                        applyImport(parseProject(serialize(item.project)))
                      }
                    >
                      <img src={item.thumbnail} alt={item.project.title} />
                    </button>
                    <h3>{item.project.title}</h3>
                    <p>
                      {new Date(item.project.modified).toLocaleString("ko-KR")}
                    </p>
                    <div className="button-row">
                      <button
                        onClick={() => {
                          const q = clone(item.project);
                          q.id = crypto.randomUUID();
                          q.title += " 사본";
                          q.modified = new Date().toISOString();
                          saveLocal(q, item.thumbnail).then(refreshGallery);
                        }}
                      >
                        복제
                      </button>
                      <button
                        onClick={() => {
                          applyImport(parseProject(serialize(item.project)));
                          notify(
                            "상단 작품 제목을 눌러 이름을 바꿀 수 있어요.",
                          );
                        }}
                      >
                        이름 변경
                      </button>
                      <button
                        onClick={() => {
                          setPending(item.project);
                          setModal("delete");
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))}
                {!gallery.length && (
                  <p className="empty">
                    아직 저장된 작품이 없어요. 첫 패턴을 만들어 볼까요?
                  </p>
                )}
              </div>
            </main>
          )}
        </>
      )}
      <ReleaseFooter mode={mode} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal === "export" ? "작품 내보내기" : "안내"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              title="닫기"
              onClick={() => setModal("")}
            >
              <X size={21} />
            </button>
            {modal === "export" ? (
              <>
                <span className="eyebrow">KEEP YOUR CREATION</span>
                <h2>작품을 간직하는 방법</h2>
                <p>이미지는 감상용, 프로젝트는 다시 편집할 때 사용해요.</p>
                <div className="export-preview">
                  <img alt="내보낼 패턴" src={dataSVG(art)} />
                </div>
                <label>
                  PNG 이미지 크기
                  <select
                    aria-label="PNG 이미지 크기"
                    value={width}
                    onChange={(e) => setWidth(+e.target.value)}
                  >
                    <option value="1920">1920 × 1080 · 기본</option>
                    <option value="3840">3840 × 2160 · 고화질</option>
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={transparent}
                    onChange={(e) => setTransparent(e.target.checked)}
                  />
                  바탕 투명하게
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={grout}
                    onChange={(e) => setGrout(e.target.checked)}
                  />
                  시각적 줄눈 포함
                </label>
                <div className="button-row">
                  <button
                    className="primary"
                    onClick={() =>
                      png(p, width, transparent, grout)
                        .then(() => notify("PNG 이미지를 저장했어요."))
                        .catch((e) => notify(String(e)))
                    }
                  >
                    PNG 저장
                  </button>
                  <button
                    onClick={() => {
                      try {
                        download(
                          new Blob(
                            [
                              svgArt(
                                p,
                                width,
                                (width * 9) / 16,
                                transparent,
                                grout,
                              ),
                            ],
                            { type: "image/svg+xml" },
                          ),
                          `빈틈없이_${p.title}.svg`,
                        );
                      } catch (e) {
                        notify(String(e));
                      }
                    }}
                  >
                    SVG 저장
                  </button>
                </div>
                <div className="divider" />
                <button className="wide" onClick={saveFile}>
                  <Save size={18} />
                  편집 가능한 프로젝트 파일 저장
                </button>
                <button
                  className="wide"
                  onClick={() => {
                    const q = clone(p);
                    q.id = crypto.randomUUID();
                    q.title += " 사본";
                    commit(q);
                    setModal("");
                    notify("새 사본을 만들었어요. 상단 제목을 바꿔 주세요.");
                  }}
                >
                  다른 이름으로 저장 · 사본 만들기
                </button>
                <p className="note">
                  .binteum.json 파일을 다른 기기에서 불러오면 이어서 편집할 수
                  있어요. 자동 동기화는 하지 않아요.
                </p>
              </>
            ) : modal === "import" ? (
              <>
                <h2>새 파일을 열까요?</h2>
                <p>
                  현재 작품은 이 기기에 자동저장됩니다. 파일로도 보관한 뒤 바꿀
                  수 있어요.
                </p>
                <button className="wide" onClick={saveFile}>
                  현재 작품 파일로 보관
                </button>
                <button
                  className="primary wide"
                  onClick={() => pending && applyImport(pending)}
                >
                  선택한 프로젝트 불러오기
                </button>
              </>
            ) : modal === "rename" ? (
              <>
                <h2>작품 이름 바꾸기</h2>
                <label>
                  새 이름
                  <input
                    aria-label="새 작품 이름"
                    value={rename}
                    maxLength={80}
                    onChange={(e) => setRename(e.target.value)}
                  />
                </label>
                <button
                  className="primary wide"
                  onClick={() => {
                    if (pending && rename.trim()) {
                      const q = {
                        ...pending,
                        title: rename.trim(),
                        modified: new Date().toISOString(),
                      };
                      saveLocal(q, dataSVG(svgArt(q, 320, 180))).then(
                        refreshGallery,
                      );
                      if (q.id === p.id) commit(q);
                      setModal("");
                    }
                  }}
                >
                  이름 저장
                </button>
              </>
            ) : modal === "delete" ? (
              <>
                <h2>이 기기에서 작품을 지울까요?</h2>
                <p>{pending?.title} · 내려받은 파일은 지워지지 않아요.</p>
                <button onClick={() => setModal("")}>취소</button>
                <button
                  className="danger"
                  onClick={async () => {
                    if (!pending) return;
                    const id = pending.id;
                    try {
                      if (id === ref.current.id) {
                        if (autoSaveTimer.current)
                          clearTimeout(autoSaveTimer.current);
                        const empty = fresh();
                        suppressedSave.current = empty.id;
                        ref.current = empty;
                        setP(empty);
                        past.current = [];
                        future.current = [];
                        setDirty(false);
                        setSelected([]);
                        setFocusCamera(null);
                        setPuzzleResult(null);
                        setSelectedDecoration(null);
                      }
                      await deleteLocal(id);
                      setPending(null);
                      setModal("");
                      refreshGallery();
                    } catch {
                      notify("작품을 삭제하지 못했어요. 다시 시도해 주세요.");
                    }
                  }}
                >
                  작품 삭제
                </button>
              </>
            ) : (
              <>
                <h2>한 조각이면 충분해요.</h2>
                {manualsAvailable && <a className="manual-help-link" href={manualURL} target="_blank" rel="noopener noreferrer">공식 사용설명서 열기</a>}
                <ol>
                  <li>도형을 고르고 가운데 흰 점을 움직여요.</li>
                  <li>색과 무늬를 고르고 수학 렌즈로 확인해요.</li>
                  <li>쇼룸에 적용한 뒤 이미지와 프로젝트를 저장해요.</li>
                </ol>
                <p>
                  마우스·터치·펜으로 점을 끌 수 있어요. 두 손가락으로
                  확대·이동하거나 손 도구를 선택하세요. Shift + 클릭은 여러 조각
                  선택, Ctrl/Cmd + Z는 되돌리기예요.
                </p>
                <p className="note">
                  자동저장은 현재 브라우저에만 남아요. 브라우저 데이터를 지우기
                  전 프로젝트 파일로 보관해 주세요.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setModal("");
                    changeMode("studio");
                    setGuide(0);
                  }}
                >
                  직접 해 보기
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
