import React, { useState } from "react";
import { ArrowUpRight, ArrowRight, Clock3, Shapes } from "lucide-react";

export function LaunchHero({
  onStart,
  onResume,
  onPuzzle,
  onShowroom,
  canResume,
  title,
}: {
  onStart: () => void;
  onResume: () => void;
  onPuzzle: () => void;
  onShowroom: () => void;
  canResume: boolean;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const examples = () =>
    document.getElementById("example-collection")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  return (
    <>
      <section
        className={"launch-hero " + (loaded ? "is-ready" : "")}
        aria-label="빈틈없이 디자인 갤러리"
      >
        <h1 className="sr-only">빈틈없이 — TESSELLATION DESIGN STUDIO</h1>
        {!failed ? (
          <picture>
            <source
              media="(max-width: 600px)"
              srcSet="./assets/hero/hero-mobile.webp"
            />
            <source
              media="(max-width: 1100px)"
              srcSet="./assets/hero/hero-tablet.webp"
            />
            <img
              className="launch-poster"
              src="./assets/hero/hero-desktop.webp"
              alt="빈틈없이. TESSELLATION DESIGN STUDIO. 도형을 잇고, 패턴을 만들고, 세상을 디자인하다. 기획·제작: 쓰로인훈쌤 김종훈"
              width="1920"
              height="1080"
              fetchPriority="high"
              onLoad={() => setLoaded(true)}
              onError={() => {
                setFailed(true);
                setLoaded(true);
              }}
            />
          </picture>
        ) : (
          <div className="poster-fallback">
            <p>TESSELLATION DESIGN STUDIO</p>
            <strong>빈틈없이</strong>
            <p>
              도형을 잇고, 패턴을 만들고,
              <br />
              세상을 디자인하다
            </p>
            <small>기획·제작: 쓰로인훈쌤 김종훈</small>
          </div>
        )}
        {!loaded && (
          <div className="poster-loading" role="status">
            갤러리를 여는 중…
          </div>
        )}
        <div className="launch-actions">
          <button className="primary launch-start" onClick={onStart}>
            패턴 만들기 <ArrowUpRight size={22} />
          </button>
          <button className="launch-examples" onClick={examples}>
            예제 작품 보기 <ArrowRight size={18} />
          </button>
          <button
            className="launch-resume"
            disabled={!canResume}
            onClick={onResume}
            title={
              canResume ? title : "작품을 만들면 이 기기에서 이어갈 수 있어요"
            }
          >
            <Clock3 size={17} /> 최근 작업 이어하기
          </button>
        </div>
      </section>
      <div className="launch-rail">
        <p>
          <span className="edition-dot" /> 한 조각에서 시작하는 나만의 디자인
        </p>
        <div>
          <button onClick={onPuzzle}>
            <Shapes size={18} /> 틈 채우기 게임 <ArrowUpRight size={16} />
          </button>
          <button onClick={onShowroom}>
            쇼룸 둘러보기 <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
