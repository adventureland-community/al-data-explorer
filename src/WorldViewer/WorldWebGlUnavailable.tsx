/**
 * Khronos get.webgl.org guidance when getContext("webgl") returns null:
 * present http://get.webgl.org/troubleshooting (browser-specific help from there).
 * @see https://get.webgl.org/troubleshooting/DoNotCopyOrLinkThisFileElseYouWillNotGetAutoUpdatedHelpForYourUsers.js
 */
export const WEBGL_TROUBLESHOOTING_URL = "https://get.webgl.org/troubleshooting";
export const WEBGL_TEST_URL = "https://get.webgl.org/";

interface WorldWebGlUnavailableProps {
  message: string;
}

/** Single-path WebGL failure UI — no Canvas2D world clone. */
export function WorldWebGlUnavailable({ message }: WorldWebGlUnavailableProps) {
  return (
    <div
      data-testid="world-webgl-unavailable"
      role="alert"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#101218",
        color: "#e8eaed",
        zIndex: 2,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          padding: "16px 18px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.78)",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15 }}>WebGL unavailable</div>
        <div style={{ opacity: 0.9, marginTop: 8 }}>{message}</div>
        <div style={{ opacity: 0.75, marginTop: 10 }}>
          The world map needs a WebGL context. When the browser refuses one, that is almost always a
          driver / GPU / browser setting issue — not missing map data.
        </div>
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a
            href={WEBGL_TROUBLESHOOTING_URL}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#8ab4f8" }}
          >
            WebGL troubleshooting
          </a>
          <a href={WEBGL_TEST_URL} target="_blank" rel="noreferrer" style={{ color: "#8ab4f8" }}>
            Test WebGL (get.webgl.org)
          </a>
        </div>
      </div>
    </div>
  );
}
