import { useEffect, useRef, useState } from "react";
import "./release.css";
export const manualURL = `${import.meta.env.BASE_URL}manual/빈틈없이_사용설명서.pdf`;
export const summaryURL = `${import.meta.env.BASE_URL}manual/빈틈없이_한눈에_보기.pdf`;
export const manualsAvailable = import.meta.env.VITE_INCLUDE_MANUAL !== "false";
const key = "binteumeopsi-analytics-consent-v1";
const screens = new Set(["home", "studio", "showroom", "puzzle", "learn", "gallery"]);
export function ReleaseFooter({ mode }: { mode: string }) {
  const enabled = import.meta.env.PROD && location.protocol === "https:" &&
    (import.meta.env.VITE_ANALYTICS_HOSTS || "kkankong32-alt.github.io").split(",").includes(location.hostname);
  const [consent, setConsent] = useState(() => { try { return localStorage.getItem(key) || "unset"; } catch { return "unset"; } });
  const [settings, setSettings] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const current = useRef(mode); current.current = mode;
  const publish = () => {
    if (enabled && consent === "yes" && screens.has(current.current))
      frame.current?.contentWindow?.postMessage({ type: "studio-page", screen: current.current }, location.origin);
  };
  useEffect(publish, [mode, consent, enabled]);
  const choose = (value: string) => {
    try { localStorage.setItem(key, value); } catch { /* Private mode: in-memory choice. */ }
    if (value !== "yes") {
      frame.current?.contentWindow?.postMessage({ type: "studio-stop" }, location.origin);
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0].trim();
        if (name === "_ga" || name.startsWith("_ga_")) {
          document.cookie = `${name}=; Max-Age=0; path=/`;
          document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;
        }
      }
    }
    setConsent(value); setSettings(false);
  };
  return <footer className="release-footer" aria-label="제작자 및 도움말">
    <a className="creator-signature" href="https://bit.ly/쓰로인" target="_blank" rel="noopener noreferrer">
      기획·제작 © 2026 쓰로인훈쌤 김종훈
      <span>초등 수업을 위한 무료 교육 콘텐츠</span>
    </a>
    <div className="release-links">
      {manualsAvailable && <><a href={manualURL} target="_blank" rel="noopener noreferrer">사용설명서</a>
      <a href={manualURL} download>PDF 다운로드</a>
      <a href={summaryURL} target="_blank" rel="noopener noreferrer">한눈에 보기</a></>}
      <button onClick={() => setSettings(!settings)}>방문통계 설정</button>
    </div>
    {(settings || (enabled && consent === "unset")) && <div className="analytics-choice" role="region" aria-label="방문통계 선택">
      <p>{enabled ? "방문통계는 선택 사항이에요. 허용하면 Google Analytics 두 계정에 화면별 방문 수와 브라우저·기기 정보가 전달되고 분석 쿠키가 저장됩니다. Google 서버로 연결할 때 IP 주소도 전달됩니다. 이름·작품 제목·작품 파일은 보내지 않으며 광고 개인화는 사용하지 않아요. 허용하지 않아도 모든 기능을 사용할 수 있어요. 어린이는 선생님이나 보호자와 함께 선택해 주세요." : "이 로컬·개발·미승인 주소에서는 방문통계를 수집하지 않아요."}</p>
      {enabled && <><button onClick={() => choose("no")}>허용하지 않음</button><button onClick={() => choose("yes")}>방문통계 허용</button></>}
      <button onClick={() => setSettings(false)}>설정 닫기</button>
    </div>}
    {enabled && consent === "yes" && <iframe ref={frame} onLoad={publish} title="선택한 방문통계" src={`${import.meta.env.BASE_URL}analytics.html`} hidden referrerPolicy="no-referrer" />}
  </footer>;
}
