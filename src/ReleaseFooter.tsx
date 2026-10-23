import { useEffect } from "react";
import "./release.css";
export const manualURL = `${import.meta.env.BASE_URL}manual/빈틈없이_사용설명서.pdf`;
export const summaryURL = `${import.meta.env.BASE_URL}manual/빈틈없이_한눈에_보기.pdf`;
export const manualsAvailable = import.meta.env.VITE_INCLUDE_MANUAL !== "false";
// Retire only this app's consent preference. Artwork and other settings are untouched.
export function ReleaseFooter({ mode }: { mode: string }) {
  useEffect(() => {
    try { localStorage.removeItem("binteumeopsi-analytics-consent-v1"); } catch { /* Storage is optional. */ }
  }, []);
  if (mode !== "home" || !manualsAvailable) return null;
  return <footer className="release-footer" aria-label="사용설명서">
    <a href={manualURL} target="_blank" rel="noopener noreferrer">사용설명서</a>
    <a href={manualURL} download>PDF 다운로드</a>
    <a href={summaryURL} target="_blank" rel="noopener noreferrer">한눈에 보기</a>
  </footer>;
}
