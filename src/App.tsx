import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

function useQueryDocId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("doc") || "demo";
}
const COLORS = ["#f43f5e","#22d3ee","#a78bfa","#f59e0b","#10b981","#60a5fa"];

export default function App() {
  const docId = useQueryDocId();
  const [status, setStatus] = useState<"connecting"|"connected"|"disconnected">("connecting");
  const [ready, setReady] = useState(false);

  const user = useMemo(() => ({
    name: "user-" + Math.floor(Math.random()*1000),
    color: COLORS[Math.floor(Math.random()*COLORS.length)],
  }), []);

  const ydocRef = useRef<Y.Doc>(); if (!ydocRef.current) ydocRef.current = new Y.Doc();
  const ytextRef = useRef<Y.Text>(); if (!ytextRef.current) ytextRef.current = ydocRef.current.getText("content");
  const ydoc = ydocRef.current!, ytext = ytextRef.current!;
  const providerRef = useRef<WebsocketProvider|null>(null);
  const textareaRef = useRef<HTMLTextAreaElement|null>(null);

  useEffect(() => {
    const url = (import.meta as any).env?.VITE_WS_URL || "ws://localhost:1234";
    const provider = new WebsocketProvider(url, docId, ydoc);
    provider.on("status", (e:any) => setStatus(e.status));
    provider.awareness.setLocalStateField("user", { name: user.name, color: user.color });
    providerRef.current = provider;

    const updateTextArea = () => {
      if (!textareaRef.current) return;
      const s = ytext.toString();
      if (textareaRef.current.value !== s) {
        const pos = textareaRef.current.selectionStart;
        textareaRef.current.value = s;
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          Math.min(pos, s.length);
      }
    };
    updateTextArea();
    const obs = () => updateTextArea();
    ytext.observe(obs);

    setReady(true);
    return () => { setReady(false); ytext.unobserve(obs); provider.destroy(); };
  }, [docId, ydoc, ytext, user.name, user.color]);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const curr = ytext.toString(), nxt = e.target.value;
    if (curr === nxt) return;
    ydoc.transact(() => { ytext.delete(0, curr.length); ytext.insert(0, nxt); });
  };

  return (
    <div>
      <div className="topbar">
        <div className="pill">doc: <b>{docId}</b></div>
        <div className="pill">you: <b style={{color:user.color}}>{user.name}</b></div>
        <div className="pill">status: <b>{status}</b></div>
        <div style={{marginLeft:"auto"}}>
          <a href={`/?doc=${Math.random().toString(36).slice(2,8)}`}>new doc</a>
        </div>
      </div>
      <div className="container">
        {!ready ? (<p>Connecting to <code>y-websocket</code>…</p>) : (
          <>
            <p>Open in another tab (same <code>?doc=</code>) to see live sync.</p>
            <textarea
              ref={textareaRef} onChange={onChange}
              style={{
                width:"100%", minHeight:420, background:"#0f172a", color:"#e7e7ea",
                border:"1px solid #1f2937", borderRadius:12, padding:16, fontSize:16,
                lineHeight:"1.5", fontFamily:"ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
              }}
              placeholder="Start typing…"
            />
            <p style={{opacity:.75,fontSize:12,marginTop:12}}>Minimal Yjs demo — no TipTap yet.</p>
          </>
        )}
      </div>
    </div>
  );
}
