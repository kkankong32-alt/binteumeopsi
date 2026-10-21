import React, { useEffect, useRef, useState } from "react";
import { artCanvas, download } from "./render";
import { fallbackScene } from "./fallback";
import { RoomEngine } from "./roomEngine";
import type { Project } from "./model";
export const materials: Record<string, string> = {
  ceramic: "무광 세라믹",
  gloss: "유광 타일",
  stone: "천연석 · 대리석",
  wood: "나무결",
  metal: "브러시드 금속",
  glass: "반투명 유리",
};
const descriptions: Record<string, string> = {
  ceramic: "차분한 난반사 · 은은한 입자",
  gloss: "유약의 선명한 하이라이트 · 매끈한 표면",
  stone: "자연스러운 대리석 무늬 · 미세한 표면",
  wood: "방향을 가진 나무결 · 따뜻한 표면",
  metal: "방향성 브러시 · 금속 환경 반사",
  glass: "빛의 투과 · 유리층의 반사",
};
function patternProject(p: Project): Project {
  return {
    ...p,
    camera: {
      x: p.showroom.x * 180,
      y: p.showroom.y * 180,
      zoom: p.showroom.scale,
    },
    style: { ...p.style, rotation: p.showroom.rotation },
  };
}
export function Showroom({
  p,
  onChange,
  onError,
}: {
  p: Project;
  onChange: (s: Project["showroom"]) => void;
  onError: (s: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<RoomEngine | null>(null),
    source = useRef<HTMLCanvasElement | null>(null);
  const [unsupported, setUnsupported] = useState(false),
    [assetState, setAssetState] = useState<"loading" | "ready" | "degraded">(
      "loading",
    ),
    [ready, setReady] = useState(false),
    [fallbackURL, setFallbackURL] = useState(""),
    [outputWidth, setOutputWidth] = useState(1920),
    [exporting, setExporting] = useState(false);
  const fallback = unsupported || p.showroom.quality === "2d";
  const latest = useRef(p);
  latest.current = p;
  const error = useRef(onError);
  error.current = onError;
  const textureKey = JSON.stringify([
    p.vertices,
    p.kind,
    p.repeat,
    p.pieces,
    p.style,
    p.escher,
    p.decorations,
    p.layers,
    p.showroom.scale,
    p.showroom.rotation,
    p.showroom.x,
    p.showroom.y,
  ]);
  useEffect(
    () => () => {
      engine.current?.dispose();
      engine.current = null;
    },
    [],
  );
  useEffect(() => {
    if (p.showroom.quality === "2d" || unsupported) return;
    if (!engine.current) {
      try {
        engine.current = new RoomEngine(host.current!, setAssetState);
        if (source.current) engine.current.setPattern(source.current);
      } catch {
        setUnsupported(true);
        return;
      }
    }
    engine.current.update(p.showroom);
  }, [p.showroom, unsupported]);
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      artCanvas(patternProject(latest.current), 2048, 1152)
        .then((c) => {
          if (cancelled) return;
          source.current = c;
          engine.current?.setPattern(c);
          if (latest.current.showroom.quality === "2d" || unsupported)
            setFallbackURL(fallbackScene(latest.current, c).toDataURL());
          requestAnimationFrame(() => {
            if (!cancelled) setReady(true);
          });
        })
        .catch((e) => {
          if (!cancelled) error.current(String(e));
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [textureKey, unsupported]);
  useEffect(() => {
    if (!fallback || !source.current) return;
    const frame = requestAnimationFrame(() =>
      setFallbackURL(
        fallbackScene(latest.current, source.current!).toDataURL(),
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, [fallback, p.showroom]);
  async function save() {
    setExporting(true);
    try {
      const c = await artCanvas(
        patternProject(latest.current),
        outputWidth,
        (outputWidth * 9) / 16,
      );
      if (fallback) {
        const image = fallbackScene(latest.current, c, outputWidth);
        const blob = await new Promise<Blob>((resolve, reject) =>
          image.toBlob((b) =>
            b ? resolve(b) : reject(Error("이미지 저장 실패")),
          ),
        );
        download(blob, `빈틈없이_쇼룸_2.5D_${outputWidth}.png`);
      } else if (engine.current)
        download(
          await engine.current.capture(outputWidth, c),
          `빈틈없이_쇼룸_${p.showroom.scene}_${outputWidth}.png`,
        );
    } catch (e) {
      error.current(String(e));
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="showroom">
      <div className="showroom-view" aria-label="실제 공간 쇼룸">
        <div
          className="webgl-host"
          ref={host}
          style={{ visibility: fallback ? "hidden" : "visible" }}
        />
        {fallback && fallbackURL && (
          <div className="fallback-room">
            <img src={fallbackURL} alt="패턴을 원근에 맞춰 투영한 2.5D 공간" />
            <p>
              {p.showroom.quality === "2d"
                ? "2.5D 미리보기 · 가볍게 보기 모드"
                : "2.5D 미리보기 · 이 기기는 WebGL을 지원하지 않습니다."}
            </p>
          </div>
        )}
      </div>
      <div className="room-label">
        <span className="eyebrow">PATTERN / ARCHITECTURE</span>
        <h2>
          {p.showroom.scene === "wall"
            ? "숲빛 아틀리에"
            : p.showroom.scene === "floor"
              ? "고요한 리딩 룸"
              : "도시의 작은 갤러리"}
        </h2>
        <p>
          {materials[p.showroom.material]} ·{" "}
          {fallback ? "2.5D 투영" : "3D 공간 시뮬레이션"}
        </p>
      </div>
      <div className="room-controls">
        <label>
          화면 품질
          <select
            aria-label="화면 품질"
            value={p.showroom.quality ?? "auto"}
            onChange={(e) =>
              onChange({
                ...p.showroom,
                quality: e.target.value as "auto" | "2d",
              })
            }
          >
            <option value="auto">3D · 자동 대체</option>
            <option value="2d">2.5D · 가볍게 보기</option>
          </select>
        </label>
        <label>
          공간
          <select
            aria-label="공간"
            value={p.showroom.scene}
            onChange={(e) => onChange({ ...p.showroom, scene: e.target.value })}
          >
            <option value="wall">인테리어 갤러리 · 벽</option>
            <option value="floor">건축 타일 쇼룸 · 바닥</option>
            <option value="facade">건축 파사드 · 외벽</option>
          </select>
        </label>
        <label>
          재질
          <select
            aria-label="재질"
            value={p.showroom.material}
            onChange={(e) =>
              onChange({ ...p.showroom, material: e.target.value })
            }
          >
            {Object.entries(materials).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          카메라
          <select
            aria-label="카메라"
            value={p.showroom.camera}
            onChange={(e) =>
              onChange({ ...p.showroom, camera: +e.target.value })
            }
          >
            <option value="0">오른쪽에서</option>
            <option value="1">정면에서</option>
            <option value="2">왼쪽에서</option>
          </select>
        </label>
        <label>
          햇빛의 밝기
          <input
            aria-label="쇼룸 조명"
            type="range"
            min=".4"
            max="1.8"
            step=".1"
            value={p.showroom.lighting ?? 1}
            onChange={(e) =>
              onChange({ ...p.showroom, lighting: +e.target.value })
            }
          />
        </label>
        {(["scale", "rotation", "x", "y"] as const).map((k) => (
          <label key={k}>
            {
              {
                scale: "패턴 크기",
                rotation: "회전",
                x: "가로 위치",
                y: "세로 위치",
              }[k]
            }
            <input
              aria-label={"쇼룸 " + k}
              type="range"
              min={k === "scale" ? 0.3 : k === "rotation" ? -180 : -2}
              max={k === "scale" ? 3 : k === "rotation" ? 180 : 2}
              step={k === "rotation" ? 15 : 0.1}
              value={p.showroom[k]}
              onChange={(e) =>
                onChange({ ...p.showroom, [k]: +e.target.value })
              }
            />
          </label>
        ))}
        <p className="material-description">
          {descriptions[p.showroom.material]}
        </p>
        <label>
          쇼룸 이미지 크기
          <select
            aria-label="쇼룸 이미지 크기"
            value={outputWidth}
            onChange={(e) => setOutputWidth(+e.target.value)}
          >
            <option value="1920">FHD · 1920 × 1080</option>
            <option value="3840">4K · 3840 × 2160</option>
          </select>
        </label>
        <button
          className="primary"
          disabled={
            !ready || exporting || (!fallback && assetState === "loading")
          }
          onClick={save}
        >
          쇼룸 PNG 저장
        </button>
        <p className="note" role="status">
          {exporting
            ? "고해상도 장면을 만드는 중…"
            : !fallback && assetState === "loading"
              ? "공간의 빛과 재질을 준비하는 중…"
              : !fallback && assetState === "degraded"
                ? "일부 공간 파일을 읽지 못해 기본 표현으로 보여요. 저장은 가능해요."
                : "UI 없이 16:9 장면을 저장해요."}
        </p>
      </div>
    </div>
  );
}
