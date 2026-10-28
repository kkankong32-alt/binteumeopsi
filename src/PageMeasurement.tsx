import { useEffect, useRef } from "react";

// Page views only, isolated from artwork, quiz answers and editable project names.
export function PageMeasurement({ mode }: { mode: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const enabled = location.protocol === "https:" &&
    location.hostname === "kkankong32-alt.github.io" &&
    location.pathname.startsWith("/binteumeopsi/");
  const publish = () => frame.current?.contentWindow?.postMessage(
    { type: "studio-page", screen: mode }, location.origin,
  );
  useEffect(() => { if (enabled) publish(); }, [mode, enabled]);
  if (!enabled) return null;
  return <iframe ref={frame} onLoad={publish} hidden aria-hidden="true"
    title="페이지 방문 집계" src={`${import.meta.env.BASE_URL}analytics.html`}
    referrerPolicy="no-referrer" />;
}
