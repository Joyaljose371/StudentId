import React, { useState, useRef, useEffect } from "react";
import {
  Home, Inbox as InboxIcon, BookOpen, FlaskConical, User, Plus, Camera,
  Search, X, Check, Clock, Brain, CreditCard, ChevronLeft, ChevronRight,
  Upload, Loader2, AlertTriangle, RotateCcw, Radio, Sparkles, ListChecks,
  NotebookPen, Armchair, DoorOpen, Tag, Play, Square, ArrowLeft, Trash2
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/*  Utilities & seed data                                                 */
/* ---------------------------------------------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date();
const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const fmtDate = (d) => d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

/* ---------------------------------------------------------------------- */
/*  localStorage persistence                                              */
/* ---------------------------------------------------------------------- */

const LS_KEY = "academic_os_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Re-hydrate Date-like fields
    if (s.notes) s.notes = s.notes.map((n) => ({ ...n }));
    return s;
  } catch { return null; }
}

function saveState(patch) {
  try {
    const prev = loadState() || {};
    localStorage.setItem(LS_KEY, JSON.stringify({ ...prev, ...patch }));
  } catch { /* quota exceeded – silent */ }
}

/* Web NFC: Chrome on Android only, over HTTPS, needs a user gesture to start */
const NFC_SUPPORTED = typeof window !== "undefined" && "NDEFReader" in window;

function extractTagCode(event) {
  try {
    for (const record of event.message.records) {
      if (record.recordType === "url") {
        const decoder = new TextDecoder(record.encoding || "utf-8");
        const url = decoder.decode(record.data);
        const parts = url.split("/").filter(Boolean);
        return parts[parts.length - 1];
      }
      if (record.recordType === "text") {
        const decoder = new TextDecoder(record.encoding || "utf-8");
        return decoder.decode(record.data).trim();
      }
    }
  } catch (e) { /* fall through to serial number */ }
  return null;
}

const SEED_SUBJECTS = [
  { id: "cogpsych", name: "Cognitive Psychology", code: "PSY 302", color: "#3B6E8F" },
  { id: "resmethod", name: "Research Methodology", code: "PSY 210", color: "#35513F" },
  { id: "stats", name: "Statistics", code: "PSY 214", color: "#B4482D" },
];

const SEED_NOTES = [
  {
    id: uid(), subjectId: "cogpsych", title: "Selective Attention",
    rawOcr: "Broad bent early fiiter model says attent ion selects informatn before semantic procesing",
    correctedText: "Broadbent's early filter model states that attention selects information before semantic processing.",
    content: "Broadbent's early filter model states that attention selects information before semantic processing.",
    type: "lecture", source: "scan", createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const SEED_TASKS = [
  { id: uid(), title: "Read Attention chapter", subjectId: "cogpsych", status: "todo", deadline: null },
  { id: uid(), title: "Complete literature review", subjectId: "resmethod", status: "todo", deadline: "2 days" },
  { id: uid(), title: "Submit assignment", subjectId: "stats", status: "todo", deadline: "5 days" },
];

const SEED_INBOX = [
  { id: uid(), content: "Look up Stroop's original experiment", type: "question", createdAt: new Date().toISOString() },
  { id: uid(), content: "Ask professor about abstract structure", type: "question", createdAt: new Date().toISOString() },
];

const SEED_RESEARCH_PROJECTS = [
  { id: "ailit", title: "AI Literacy × Technostress", status: "Literature Review" },
];

const SEED_RESEARCH_ENTRIES = [
  { id: uid(), projectId: "ailit", type: "idea", content: "Technostress may mediate the AI-literacy → wellbeing link.", createdAt: new Date().toISOString() },
];

const SEED_KNOWLEDGE = [
  { id: uid(), subjectId: "cogpsych", concept: "Signal Detection Theory", explanation: "Detection depends on both sensory sensitivity and the individual's decision criterion.", confidence: 3, needsRevision: true },
];

const SEED_TAGS = [
  { id: uid(), tag_code: "8F4K2", tag_name: "Student ID Card", context_type: "dashboard", context_id: null },
  { id: uid(), tag_code: "A73K9", tag_name: "Cognitive Psychology Notebook", context_type: "subject", context_id: "cogpsych" },
  { id: uid(), tag_code: "R2X61", tag_name: "Research Notebook", context_type: "research_project", context_id: "ailit" },
  { id: uid(), tag_code: "D9P03", tag_name: "Study Table", context_type: "study_session", context_id: null },
  { id: uid(), tag_code: "M4L88", tag_name: "Room / Hostel", context_type: "daily_review", context_id: null },
];

const SEED_PROFILE = {
  name: "Ananya Krishnan",
  department: "Psychology",
  year: "Year 3",
  studentId: "220145",
};

/* Parse ?nfc=CODE or ?screen=xxx from the URL on launch */
function getLaunchParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    return { nfcCode: p.get("nfc"), screen: p.get("screen"), subjectId: p.get("subjectId") };
  } catch { return {}; }
}

const TAG_ICON = { dashboard: CreditCard, subject: NotebookPen, research_project: FlaskConical, study_session: Armchair, daily_review: DoorOpen, quick_capture: Plus };

/* ---------------------------------------------------------------------- */
/*  Style sheet — design tokens live here                                 */
/* ---------------------------------------------------------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

*, *::before, *::after{ box-sizing:border-box; }

.aos-root{
  --ink:#171C26; --ink-soft:#2B3444; --paper:#E7E9E3; --paper-deep:#D7DACF;
  --white:#FBFBF8; --brass:#B8923C; --brass-soft:#E4CC85; --moss:#35513F;
  --moss-soft:#527863; --clay:#B4482D; --denim:#3B6E8F;
  font-family:'IBM Plex Sans',sans-serif; color:var(--ink); background:var(--paper);
  min-height:100vh; width:100%; max-width:460px; margin:0 auto; position:relative;
  background-image:
    linear-gradient(var(--paper-deep) 1px, transparent 1px);
  background-size: 100% 28px;
  overflow-x:hidden;
}
.aos-serif{ font-family:'IBM Plex Serif',serif; }
.aos-mono{ font-family:'IBM Plex Mono',monospace; }
.aos-content{ padding:18px 16px 96px 16px; width:100%; }
.aos-topbar{ display:flex; align-items:center; justify-content:space-between; padding:14px 16px 6px 16px; }
.aos-eyebrow{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--moss); }
.aos-h1{ font-family:'IBM Plex Serif',serif; font-weight:600; font-size:clamp(21px,6vw,26px); margin:2px 0 14px 0; color:var(--ink); }
.aos-card{ background:var(--white); border:1px solid var(--paper-deep); border-radius:10px; padding:14px; box-shadow:0 1px 0 rgba(23,28,38,0.04); width:100%; }
.aos-divider{ height:1px; background:var(--paper-deep); margin:14px 0; }
.aos-pill{ display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:20px; font-size:11px; font-family:'IBM Plex Mono',monospace; max-width:100%; }
.aos-btn{ display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:10px 14px; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer; border:none; transition:transform .12s ease; white-space:nowrap; }
.aos-btn:active{ transform:scale(0.97); }
.aos-btn-primary{ background:var(--ink); color:var(--white); }
.aos-btn-brass{ background:var(--brass); color:var(--ink); }
.aos-btn-ghost{ background:transparent; color:var(--ink); border:1px solid var(--paper-deep); }
.aos-input{ width:100%; max-width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--paper-deep); background:var(--white); font-family:'IBM Plex Sans',sans-serif; font-size:14px; color:var(--ink); }
.aos-input:focus{ outline:2px solid var(--denim); outline-offset:1px; }
.aos-fab{ position:fixed; bottom:78px; left:50%; transform:translateX(-50%); width:56px; height:56px; border-radius:50%; background:var(--ink); color:var(--white); display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px rgba(23,28,38,0.35); z-index:40; border:3px solid var(--paper); cursor:pointer; }
.aos-nav{ position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:460px; background:var(--white); border-top:1px solid var(--paper-deep); display:flex; justify-content:space-around; padding:8px 4px 10px 4px; z-index:30; }
.aos-nav-item{ display:flex; flex-direction:column; align-items:center; gap:2px; font-size:10px; color:#8B92A0; cursor:pointer; padding:4px 8px; border-radius:8px; }
.aos-nav-item.active{ color:var(--ink); }
.aos-nav-item.active .aos-nav-dot{ background:var(--brass); }
.aos-nav-dot{ width:4px; height:4px; border-radius:50%; background:transparent; margin-top:1px; }

/* ---- ID card ---- */
.idcard-wrap{ perspective:900px; width:100%; }
.idcard{ position:relative; width:100%; max-width:100%; aspect-ratio:1.586/1; border-radius:16px; background:linear-gradient(135deg, var(--ink) 0%, var(--ink-soft) 60%, #333e52 100%); color:var(--white); padding:clamp(12px,4vw,18px); box-shadow:0 10px 30px rgba(23,28,38,0.35); overflow:hidden; cursor:pointer; transition:transform .15s ease; border:1px solid #3a4356; }
.idcard:active{ transform:scale(0.98); }
.idcard.scanning{ animation:idcard-glow 1.1s ease; }
@keyframes idcard-glow{ 0%{box-shadow:0 10px 30px rgba(23,28,38,0.35);} 45%{box-shadow:0 0 0 3px var(--brass-soft), 0 0 40px 6px rgba(184,146,60,0.6);} 100%{box-shadow:0 10px 30px rgba(23,28,38,0.35);} }
.idcard-texture{ position:absolute; inset:0; background:repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 7px); pointer-events:none; }
.idcard-top{ display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.idcard-brand{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--brass-soft); white-space:nowrap; }
.idcard-chip{ width:30px; height:23px; border-radius:5px; background:linear-gradient(135deg,var(--brass-soft),var(--brass)); position:relative; margin-top:12px; flex-shrink:0; }
.idcard-chip::before, .idcard-chip::after{ content:""; position:absolute; left:5px; right:5px; height:1px; background:rgba(23,28,38,0.35); }
.idcard-chip::before{ top:7px; } .idcard-chip::after{ top:14px; }
.idcard-name{ font-family:'IBM Plex Serif',serif; font-size:clamp(15px,4.6vw,19px); font-weight:600; margin-top:clamp(8px,3vw,14px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }
.idcard-meta{ font-family:'IBM Plex Mono',monospace; font-size:clamp(9.5px,2.6vw,11px); color:#B7BECC; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }
.idcard-nfc{ position:absolute; bottom:12px; right:14px; display:flex; align-items:center; justify-content:center; }
.idcard-nfc-icon{ color:var(--brass-soft); opacity:.85; }
.idcard-tap-hint{ position:absolute; bottom:14px; left:16px; font-family:'IBM Plex Mono',monospace; font-size:9.5px; color:#8891A2; letter-spacing:.05em; white-space:nowrap; }
.ripple-ring{ position:absolute; border-radius:50%; border:2px solid var(--brass-soft); opacity:0; }

/* ---- scan overlay ---- */
.scan-overlay{ position:fixed; inset:0; max-width:460px; margin:0 auto; background:rgba(23,28,38,0.92); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:100; color:var(--white); animation:fadein .15s ease; }
@keyframes fadein{ from{opacity:0;} to{opacity:1;} }
.scan-rings{ position:relative; width:120px; height:120px; display:flex; align-items:center; justify-content:center; margin-bottom:22px; }
.scan-ring{ position:absolute; border:2px solid var(--brass-soft); border-radius:50%; width:40px; height:40px; animation:scan-pulse 1.1s ease-out infinite; }
.scan-ring.r2{ animation-delay:.28s; } .scan-ring.r3{ animation-delay:.56s; }
@keyframes scan-pulse{ 0%{ width:40px; height:40px; opacity:.9;} 100%{ width:120px; height:120px; opacity:0;} }
.scan-core{ position:relative; width:44px; height:44px; border-radius:50%; background:var(--brass); display:flex; align-items:center; justify-content:center; color:var(--ink); z-index:2; }
.scan-label{ font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--brass-soft); }
.scan-tagname{ font-family:'IBM Plex Serif',serif; font-size:20px; margin-top:6px; }

/* ---- nfc object tiles ---- */
.obj-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.obj-tile{ background:var(--white); border:1px solid var(--paper-deep); border-radius:10px; padding:12px 8px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; text-align:center; }
.obj-tile:active{ transform:scale(0.96); }
.obj-tile-label{ font-size:10.5px; font-weight:500; line-height:1.2; }

/* ---- auth splash ---- */
.auth-splash{ position:fixed; inset:0; max-width:460px; margin:0 auto; background:var(--ink); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:200; color:var(--white); }
.auth-splash.fade-out{ animation:auth-fade-out .6s ease forwards; }
@keyframes auth-fade-out{ 0%{opacity:1; transform:scale(1);} 100%{opacity:0; transform:scale(1.04);} }
.auth-logo{ font-family:'IBM Plex Serif',serif; font-size:28px; font-weight:700; color:var(--brass-soft); margin-bottom:6px; opacity:0; animation:auth-in .5s ease .2s forwards; }
.auth-tagline{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#8891A2; margin-bottom:40px; opacity:0; animation:auth-in .5s ease .4s forwards; }
.auth-check{ width:64px; height:64px; border-radius:50%; background:var(--moss); display:flex; align-items:center; justify-content:center; margin-bottom:18px; opacity:0; animation:auth-check-pop .45s cubic-bezier(0.34,1.56,0.64,1) .65s forwards; }
.auth-name{ font-family:'IBM Plex Serif',serif; font-size:22px; font-weight:600; opacity:0; animation:auth-in .4s ease .85s forwards; }
.auth-meta{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:#B7BECC; margin-top:5px; opacity:0; animation:auth-in .4s ease 1s forwards; }
.auth-context{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--brass-soft); margin-top:24px; opacity:0; animation:auth-in .4s ease 1.15s forwards; }
@keyframes auth-in{ from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:translateY(0);} }
@keyframes auth-check-pop{ from{opacity:0; transform:scale(0.4);} to{opacity:1; transform:scale(1);} }

/* misc */
.toast{ position:fixed; bottom:150px; left:50%; transform:translateX(-50%); background:var(--ink); color:var(--white); padding:9px 16px; border-radius:20px; font-size:12.5px; z-index:120; box-shadow:0 6px 16px rgba(0,0,0,0.3); }
.uncertain{ background:#FCEFD9; border-bottom:2px dotted var(--clay); cursor:pointer; padding:0 1px; }
.confident{ border-bottom:2px dotted var(--moss-soft); }
.modal-backdrop{ position:fixed; inset:0; max-width:460px; margin:0 auto; background:rgba(23,28,38,0.55); z-index:90; display:flex; align-items:flex-end; }
.modal-sheet{ background:var(--paper); width:100%; border-radius:18px 18px 0 0; padding:18px 16px 26px 16px; max-height:85vh; overflow-y:auto; animation:sheetup .18s ease; }
@keyframes sheetup{ from{ transform:translateY(24px); opacity:0;} to{ transform:translateY(0); opacity:1;} }
@keyframes spin{ from{ transform:rotate(0deg);} to{ transform:rotate(360deg);} }
`;

/* ---------------------------------------------------------------------- */
/*  Small shared components                                               */
/* ---------------------------------------------------------------------- */

function Eyebrow({ children }) { return <div className="aos-eyebrow">{children}</div>; }

function TopBar({ title, onBack, right }) {
  return (
    <div className="aos-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack && <ArrowLeft size={18} onClick={onBack} style={{ cursor: "pointer" }} />}
        <div className="aos-serif" style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
      </div>
      <div>{right}</div>
    </div>
  );
}

function Pill({ children, bg, fg }) {
  return <span className="aos-pill" style={{ background: bg, color: fg }}>{children}</span>;
}

function EmptyState({ text }) {
  return <div style={{ padding: "26px 6px", textAlign: "center", color: "#8B92A0", fontSize: 13 }}>{text}</div>;
}

/* ---------------------------------------------------------------------- */
/*  Virtual ID card + scan animation                                      */
/* ---------------------------------------------------------------------- */

function VirtualIDCard({ onScan, isScanning, profile }) {
  return (
    <div className="idcard-wrap">
      <div className={"idcard" + (isScanning ? " scanning" : "")} onClick={onScan}>
        <div className="idcard-texture" />
        <div className="idcard-top">
          <div>
            <div className="idcard-brand">Academic OS</div>
            <div className="idcard-chip" />
          </div>
          <Radio size={18} className="idcard-nfc-icon" />
        </div>
        <div className="idcard-name">{profile?.name || "Student"}</div>
        <div className="idcard-meta">{(profile?.department || "").toUpperCase()} · {profile?.year || ""} · ID {profile?.studentId || ""}</div>
        <div className="idcard-tap-hint">TAP CARD TO SCAN</div>
        <div className="idcard-nfc"><Radio size={0} /></div>
      </div>
    </div>
  );
}

function ScanOverlay({ tag, waiting, onCancel }) {
  const Icon = TAG_ICON[tag.context_type] || Tag;
  return (
    <div className="scan-overlay" onClick={waiting ? onCancel : undefined} style={{ cursor: waiting ? "pointer" : "default" }}>
      <div className="scan-rings">
        <div className="scan-ring r1" />
        <div className="scan-ring r2" />
        <div className="scan-ring r3" />
        <div className="scan-core"><Icon size={20} /></div>
      </div>
      {waiting ? (
        <>
          <div className="scan-label" style={{ color: "var(--brass-soft)" }}>Hold phone against the NFC tag</div>
          <div className="scan-tagname aos-serif">{tag.tag_name}</div>
          <div style={{ marginTop: 18, fontSize: 11.5, color: "#8B92A0", fontFamily: "'IBM Plex Mono',monospace" }}>Tap anywhere to cancel</div>
        </>
      ) : (
        <>
          <div className="scan-label">Reading tag · {tag.tag_code}</div>
          <div className="scan-tagname aos-serif">{tag.tag_name}</div>
        </>
      )}
    </div>
  );
}


/* ---------------------------------------------------------------------- */
/*  Auth splash — shown on NFC deep-link launch from homescreen           */
/* ---------------------------------------------------------------------- */

function AuthSplash({ profile, contextLabel, onDone }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setFading(true); setTimeout(onDone, 650); }, 2400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className={"auth-splash" + (fading ? " fade-out" : "")}>
      <div className="auth-logo">Academic OS</div>
      <div className="auth-tagline">Knowledge in your hands</div>
      <div className="auth-check"><Check size={28} color="white" strokeWidth={3} /></div>
      <div className="auth-name">{profile.name}</div>
      <div className="auth-meta">{profile.department} · {profile.year} · {profile.studentId}</div>
      {contextLabel && <div className="auth-context">→ {contextLabel}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Real Web NFC scan banner (physical tags, Chrome on Android over HTTPS)*/
/* ---------------------------------------------------------------------- */

function NfcRealScanBanner({ state, actions }) {
  if (!state.nfcSupported) {
    return (
      <div className="aos-card" style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <Radio size={15} color="#8B92A0" />
        <div style={{ fontSize: 11.5, color: "#8B92A0" }}>Physical NFC tapping needs Chrome on Android over HTTPS. Use the tiles above to simulate a tap here.</div>
      </div>
    );
  }
  return (
    <div className="aos-card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Radio size={16} color={state.nfcListening ? "var(--brass)" : "var(--moss)"} />
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{state.nfcListening ? "Hold your phone near the tag…" : "Scan a physical NFC tag"}</div>
        </div>
        <button className="aos-btn aos-btn-ghost" style={{ padding: "6px 10px", fontSize: 11.5 }} disabled={state.nfcListening} onClick={() => actions.startNfcScan()}>
          {state.nfcListening ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Start"}
        </button>
      </div>
      {state.nfcError && <div style={{ fontSize: 11.5, color: "var(--clay)", marginTop: 8 }}>{state.nfcError}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Screens                                                                */
/* ---------------------------------------------------------------------- */

function HomeScreen({ state, actions }) {
  const { subjects, tasks, notes, scanning, profile } = state;
  const todaysTasks = tasks.filter((t) => t.status !== "done").slice(0, 4);
  const recentNotes = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);

  return (
    <div>
      <Eyebrow>Today</Eyebrow>
      <div className="aos-h1">{fmtDate(now())}</div>

      <VirtualIDCard onScan={actions.tapIdCard} isScanning={scanning && scanning.context_type === "dashboard"} profile={profile} />

      <NfcRealScanBanner state={state} actions={actions} />

      <div className="aos-divider" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="aos-serif" style={{ fontSize: 15, fontWeight: 600 }}>Tasks</div>
        <span style={{ fontSize: 12, color: "#8B92A0" }}>{todaysTasks.length} open</span>
      </div>
      <div className="aos-card">
        {todaysTasks.length === 0 && <EmptyState text="Nothing open — tap + to add one." />}
        {todaysTasks.map((t, i) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? "1px solid var(--paper-deep)" : "none" }}>
            <div onClick={() => actions.toggleTask(t.id)} style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid var(--moss)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              {t.status === "done" && <Check size={12} color="var(--moss)" />}
            </div>
            <div style={{ flex: 1, fontSize: 13.5, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "#8B92A0" : "var(--ink)" }}>{t.title}</div>
            {t.deadline && <Pill bg="#F3E7DC" fg="var(--clay)">{t.deadline}</Pill>}
          </div>
        ))}
      </div>

      <div className="aos-divider" />

      <div className="aos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Recent notes</div>
      {recentNotes.length === 0 && <EmptyState text="No notes yet." />}
      {recentNotes.map((n) => {
        const subj = subjects.find((s) => s.id === n.subjectId);
        return (
          <div key={n.id} className="aos-card" style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</div>
              {subj && <Pill bg={subj.color + "22"} fg={subj.color}>{subj.name}</Pill>}
            </div>
            <div style={{ fontSize: 12.5, color: "#5A6270", marginTop: 4 }}>{n.content.slice(0, 90)}{n.content.length > 90 ? "…" : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

function InboxScreen({ state, actions }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <Eyebrow>Academic Inbox</Eyebrow>
      <div className="aos-h1">Inbox</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="aos-input" placeholder="Capture a thought, question, idea…" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { actions.addInboxItem(draft); setDraft(""); } }} />
        <button className="aos-btn aos-btn-primary" onClick={() => { if (draft.trim()) { actions.addInboxItem(draft); setDraft(""); } }}><Plus size={16} /></button>
      </div>
      {state.inboxItems.length === 0 && <EmptyState text="Inbox zero. Nice." />}
      {state.inboxItems.map((item) => (
        <div key={item.id} className="aos-card" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ fontSize: 13.5 }}>{item.content}</div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button className="aos-btn aos-btn-ghost" style={{ padding: "5px 8px", fontSize: 11 }} onClick={() => actions.processInboxToTask(item.id)}>→ Task</button>
            <Trash2 size={15} color="#B7BECC" style={{ cursor: "pointer" }} onClick={() => actions.deleteInboxItem(item.id)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SubjectsScreen({ state, actions }) {
  const [name, setName] = useState("");
  return (
    <div>
      <Eyebrow>Subjects</Eyebrow>
      <div className="aos-h1">Your subjects</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="aos-input" placeholder="Add a new subject…" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { actions.addSubject(name); setName(""); } }} />
        <button className="aos-btn aos-btn-primary" onClick={() => { if (name.trim()) { actions.addSubject(name); setName(""); } }}><Plus size={16} /></button>
      </div>
      {state.subjects.map((s) => {
        const noteCount = state.notes.filter((n) => n.subjectId === s.id).length;
        return (
          <div key={s.id} className="aos-card" style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => actions.openSubject(s.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{s.name}</div>
                <div className="aos-mono" style={{ fontSize: 11, color: "#8B92A0" }}>{s.code}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, marginLeft: "auto", marginBottom: 4 }} />
                <div style={{ fontSize: 11, color: "#8B92A0" }}>{noteCount} notes</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubjectDetailScreen({ state, actions }) {
  const subject = state.subjects.find((s) => s.id === state.activeSubjectId);
  const notes = state.notes.filter((n) => n.subjectId === subject?.id);
  const tasks = state.tasks.filter((t) => t.subjectId === subject?.id);
  const knowledge = state.knowledgeItems.filter((k) => k.subjectId === subject?.id);
  if (!subject) return <EmptyState text="Subject not found." />;
  return (
    <div>
      <TopBar title={subject.name} onBack={() => actions.setScreen("subjects")} />
      <div style={{ marginTop: 6 }}>
        <Pill bg={subject.color + "22"} fg={subject.color}>{subject.code}</Pill>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
        <button className="aos-btn aos-btn-primary" style={{ flex: 1 }} onClick={() => actions.openQuickCapture({ subjectId: subject.id, source: "subject" })}><Plus size={14} />Quick note</button>
        <button className="aos-btn aos-btn-brass" style={{ flex: 1 }} onClick={() => actions.openScanner(subject.id)}><Camera size={14} />Scan</button>
      </div>

      <div className="aos-serif" style={{ fontSize: 14.5, fontWeight: 600, margin: "10px 0 6px" }}>Notes</div>
      {notes.length === 0 && <EmptyState text="No notes yet for this subject." />}
      {notes.map((n) => (
        <div key={n.id} className="aos-card" style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{n.title}</div>
            {n.source === "scan" && <Pill bg="#EDE6D6" fg="var(--brass)"><Camera size={10} />scanned</Pill>}
          </div>
          <div style={{ fontSize: 12.5, color: "#5A6270", marginTop: 4 }}>{n.content}</div>
        </div>
      ))}

      <div className="aos-serif" style={{ fontSize: 14.5, fontWeight: 600, margin: "16px 0 6px" }}>Tasks</div>
      {tasks.length === 0 && <EmptyState text="No tasks." />}
      {tasks.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
          <div onClick={() => actions.toggleTask(t.id)} style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--moss)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {t.status === "done" && <Check size={10} color="var(--moss)" />}
          </div>
          <div style={{ fontSize: 13, textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.title}</div>
        </div>
      ))}

      <div className="aos-serif" style={{ fontSize: 14.5, fontWeight: 600, margin: "16px 0 6px" }}>Knowledge</div>
      {knowledge.length === 0 && <EmptyState text="No knowledge items yet." />}
      {knowledge.map((k) => (
        <div key={k.id} className="aos-card" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{k.concept}</div>
          <div style={{ fontSize: 12.5, color: "#5A6270", marginTop: 3 }}>{k.explanation}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Pill bg="#EAF0E9" fg="var(--moss)">confidence {k.confidence}/5</Pill>
            {k.needsRevision && <Pill bg="#F3E7DC" fg="var(--clay)">needs revision</Pill>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ResearchScreen({ state, actions }) {
  const [entryDraft, setEntryDraft] = useState("");
  const [entryType, setEntryType] = useState("idea");
  const project = state.researchProjects[0];
  const entries = state.researchEntries.filter((e) => e.projectId === project?.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const types = ["idea", "paper", "citation", "methodology", "question", "limitation", "hypothesis"];
  return (
    <div>
      <Eyebrow>Research Hub</Eyebrow>
      <div className="aos-h1">Research</div>
      {project && (
        <div className="aos-card" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600 }}>{project.title}</div>
          <div style={{ fontSize: 12, color: "#8B92A0", marginTop: 2 }}>{project.status}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {types.map((t) => (
          <span key={t} onClick={() => setEntryType(t)} className="aos-pill" style={{ cursor: "pointer", background: entryType === t ? "var(--ink)" : "var(--white)", color: entryType === t ? "var(--white)" : "var(--ink)", border: "1px solid var(--paper-deep)" }}>{t}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className="aos-input" placeholder={`New ${entryType}…`} value={entryDraft} onChange={(e) => setEntryDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && entryDraft.trim()) { actions.addResearchEntry(project.id, entryType, entryDraft); setEntryDraft(""); } }} />
        <button className="aos-btn aos-btn-primary" onClick={() => { if (entryDraft.trim()) { actions.addResearchEntry(project.id, entryType, entryDraft); setEntryDraft(""); } }}><Plus size={16} /></button>
      </div>
      {entries.map((e) => (
        <div key={e.id} className="aos-card" style={{ marginBottom: 8 }}>
          <Pill bg="#E7EEF2" fg="var(--denim)">{e.type}</Pill>
          <div style={{ fontSize: 13.5, marginTop: 6 }}>{e.content}</div>
        </div>
      ))}
    </div>
  );
}

function StudySessionScreen({ state, actions }) {
  const [subjectId, setSubjectId] = useState(state.subjects[0]?.id);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState(3);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(intervalRef.current); setRunning(false); setFinished(true); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (finished) {
    return (
      <div>
        <Eyebrow>Session complete</Eyebrow>
        <div className="aos-h1">Nice work</div>
        <div className="aos-card">
          <div style={{ fontSize: 13 }}>Duration: {Math.round(duration / 60)} minutes</div>
          <div style={{ fontSize: 13, marginTop: 10 }}>Understanding</div>
          <div style={{ display: "flex", gap: 6, margin: "6px 0 12px" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} onClick={() => setRating(n)} style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--paper-deep)", background: rating === n ? "var(--ink)" : "var(--white)", color: rating === n ? "var(--white)" : "var(--ink)", cursor: "pointer" }}>{n}</div>
            ))}
          </div>
          <button className="aos-btn aos-btn-primary" style={{ width: "100%" }} onClick={() => { actions.endStudySession({ subjectId, topic, goal, duration, rating }); setFinished(false); setSecondsLeft(duration); }}>Save session</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>Study Table</Eyebrow>
      <div className="aos-h1">Start a session</div>
      {!running && secondsLeft === duration && (
        <div className="aos-card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, marginBottom: 4, color: "#5A6270" }}>Subject</div>
          <select className="aos-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ marginBottom: 10 }}>
            {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div style={{ fontSize: 12, marginBottom: 4, color: "#5A6270" }}>Topic</div>
          <input className="aos-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Selective Attention" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 12, marginBottom: 4, color: "#5A6270" }}>Goal</div>
          <input className="aos-input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Finish Broadbent & Treisman" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 12, marginBottom: 4, color: "#5A6270" }}>Duration</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[25, 45, 60].map((m) => (
              <span key={m} className="aos-pill" style={{ cursor: "pointer", padding: "6px 12px", background: duration === m * 60 ? "var(--ink)" : "var(--white)", color: duration === m * 60 ? "var(--white)" : "var(--ink)", border: "1px solid var(--paper-deep)" }} onClick={() => { setDuration(m * 60); setSecondsLeft(m * 60); }}>{m} min</span>
            ))}
          </div>
        </div>
      )}
      <div className="aos-card" style={{ textAlign: "center", padding: "28px 16px" }}>
        <div className="aos-mono" style={{ fontSize: 44, fontWeight: 600 }}>{mm}:{ss}</div>
        <div style={{ fontSize: 12, color: "#8B92A0", marginTop: 4 }}>{topic || "No topic set"}</div>
        <div style={{ marginTop: 16 }}>
          {!running ? (
            <button className="aos-btn aos-btn-primary" onClick={() => setRunning(true)}><Play size={14} />Start</button>
          ) : (
            <button className="aos-btn aos-btn-ghost" onClick={() => setRunning(false)}><Square size={14} />Pause</button>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyReviewScreen() {
  const prompts = ["What did I learn today?", "What remains unfinished?", "What should I revise?", "What is important tomorrow?", "Any new research idea?"];
  const [answers, setAnswers] = useState({});
  return (
    <div>
      <Eyebrow>Room · Daily Review</Eyebrow>
      <div className="aos-h1">Reflect</div>
      {prompts.map((p, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5 }}>{p}</div>
          <textarea className="aos-input" rows={2} value={answers[i] || ""} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
        </div>
      ))}
      <button className="aos-btn aos-btn-primary" style={{ width: "100%" }}>Save review</button>
    </div>
  );
}

function NfcManageScreen({ state, actions }) {
  const [name, setName] = useState("");
  const [contextType, setContextType] = useState("subject");
  const [contextId, setContextId] = useState(state.subjects[0]?.id || "");
  const [pairedCode, setPairedCode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editContextType, setEditContextType] = useState("subject");
  const [editContextId, setEditContextId] = useState("");
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [pName, setPName] = useState(state.profile.name);
  const [pDept, setPDept] = useState(state.profile.department);
  const [pYear, setPYear] = useState(state.profile.year);
  const [pId, setPId] = useState(state.profile.studentId);
  const [copiedId, setCopiedId] = useState(null);

  const ALL_CONTEXTS = [
    { value: "dashboard", label: "Dashboard (ID card)" },
    { value: "home", label: "Today / Home" },
    { value: "inbox", label: "Inbox" },
    { value: "subjects", label: "Subjects" },
    { value: "research", label: "Research" },
    { value: "study", label: "Study session" },
    { value: "dailyReview", label: "Daily review" },
    { value: "quick_capture", label: "Quick capture" },
    { value: "search", label: "Search" },
    { value: "nfc", label: "Profile" },
    { value: "subject", label: "Subject (specific)" },
    { value: "research_project", label: "Research project" },
  ];

  function getDeepLink(tag) {
    const base = window.location.origin + window.location.pathname;
    return tag.tag_code ? `${base}?nfc=${encodeURIComponent(tag.tag_code)}` : base;
  }

  function copyLink(tag) {
    navigator.clipboard?.writeText(getDeepLink(tag)).then(() => {
      setCopiedId(tag.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditName(t.tag_name);
    setEditContextType(t.context_type);
    setEditContextId(t.context_id || state.subjects[0]?.id || "");
  }

  function saveEdit() {
    const needsId = ["subject", "research_project"].includes(editContextType);
    actions.updateNfcTag(editingId, {
      tag_name: editName,
      context_type: editContextType,
      context_id: needsId ? editContextId : null,
    });
    setEditingId(null);
  }

  return (
    <div>
      <Eyebrow>Profile</Eyebrow>
      <div className="aos-h1">My profile</div>

      {/* Profile card */}
      <div className="aos-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{state.profile.name}</div>
            <div className="aos-mono" style={{ fontSize: 11, color: "#8B92A0", marginTop: 2 }}>
              {state.profile.department} · {state.profile.year} · ID {state.profile.studentId}
            </div>
          </div>
          <button className="aos-btn aos-btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => setShowProfileEdit(!showProfileEdit)}>
            {showProfileEdit ? "Cancel" : "Edit"}
          </button>
        </div>
        {showProfileEdit && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="aos-input" placeholder="Full name" value={pName} onChange={(e) => setPName(e.target.value)} />
            <input className="aos-input" placeholder="Department" value={pDept} onChange={(e) => setPDept(e.target.value)} />
            <input className="aos-input" placeholder="Year (e.g. Year 3)" value={pYear} onChange={(e) => setPYear(e.target.value)} />
            <input className="aos-input" placeholder="Student ID" value={pId} onChange={(e) => setPId(e.target.value)} />
            <button className="aos-btn aos-btn-primary" style={{ width: "100%" }} onClick={() => {
              actions.updateProfile({ name: pName, department: pDept, year: pYear, studentId: pId });
              setShowProfileEdit(false);
            }}><Check size={13} />Save profile</button>
          </div>
        )}
      </div>

      <div className="aos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>NFC tags</div>

      {state.nfcTags.map((t) => {
        const Icon = TAG_ICON[t.context_type] || Tag;
        const isEditing = editingId === t.id;
        const ctxLabel = ALL_CONTEXTS.find((c) => c.value === t.context_type)?.label || t.context_type.replace(/_/g, " ");
        return (
          <div key={t.id} className="aos-card" style={{ marginBottom: 8 }}>
            {isEditing ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--moss)" }}>Edit tag</div>
                <input className="aos-input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ marginBottom: 8 }} placeholder="Tag name" />
                <select className="aos-input" value={editContextType} onChange={(e) => setEditContextType(e.target.value)} style={{ marginBottom: 8 }}>
                  {ALL_CONTEXTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {editContextType === "subject" && (
                  <select className="aos-input" value={editContextId} onChange={(e) => setEditContextId(e.target.value)} style={{ marginBottom: 8 }}>
                    {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="aos-btn aos-btn-primary" style={{ flex: 1 }} onClick={saveEdit}><Check size={13} />Save</button>
                  <button className="aos-btn aos-btn-ghost" style={{ flex: 1 }} onClick={() => setEditingId(null)}><X size={13} />Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={16} color="var(--moss)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.tag_name}</div>
                    <div className="aos-mono" style={{ fontSize: 10.5, color: "#8B92A0" }}>{t.tag_code} · {ctxLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    <button className="aos-btn aos-btn-ghost" style={{ padding: "5px 8px", fontSize: 11 }} onClick={() => startEdit(t)}>Edit</button>
                    <button className="aos-btn aos-btn-ghost" style={{ padding: "5px 8px", fontSize: 11 }} onClick={() => actions.simulateTagScan(t)}>
                      <Radio size={11} />Tap
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "var(--paper)", borderRadius: 6 }}>
                  <div className="aos-mono" style={{ fontSize: 9.5, color: "#8B92A0", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {"?nfc=" + encodeURIComponent(t.tag_code)}
                  </div>
                  <button className="aos-btn aos-btn-ghost" style={{ padding: "3px 8px", fontSize: 10.5 }} onClick={() => copyLink(t)}>
                    {copiedId === t.id ? <Check size={11} color="var(--moss)" /> : "Copy link"}
                  </button>
                  <a href={getDeepLink(t)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: "var(--denim)", fontFamily: "'IBM Plex Mono',monospace", textDecoration: "none" }}>Open ↗</a>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="aos-divider" />
      <div className="aos-serif" style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Register a new tag</div>
      <div className="aos-card">
        <input className="aos-input" placeholder="Tag name, e.g. Statistics Notebook" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 10 }} />
        <select className="aos-input" value={contextType} onChange={(e) => setContextType(e.target.value)} style={{ marginBottom: 10 }}>
          {ALL_CONTEXTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {contextType === "subject" && (
          <select className="aos-input" value={contextId} onChange={(e) => setContextId(e.target.value)} style={{ marginBottom: 10 }}>
            {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {state.nfcSupported ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <button className="aos-btn aos-btn-ghost" style={{ fontSize: 12 }} disabled={state.nfcListening} onClick={() => actions.startNfcScan((code, serial) => setPairedCode(code || serial))}>
              <Radio size={13} />{state.nfcListening ? "Waiting for tap…" : "Pair by tapping a sticker"}
            </button>
            {pairedCode && <span className="aos-mono" style={{ fontSize: 11, color: "var(--moss)" }}>read: {pairedCode}</span>}
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: "#8B92A0", marginBottom: 10 }}>Physical NFC pairing requires Chrome on Android over HTTPS.</div>
        )}
        <button className="aos-btn aos-btn-primary" style={{ width: "100%" }} onClick={() => {
          if (name.trim()) {
            const needsId = ["subject", "research_project"].includes(contextType);
            actions.addNfcTag(name, contextType, needsId ? contextId : null, pairedCode);
            setName(""); setPairedCode(null);
          }
        }}>Register tag</button>
      </div>
    </div>
  );
}

function SearchScreen({ state }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const noteHits = query ? state.notes.filter((n) => (n.title + n.content).toLowerCase().includes(query)) : [];
  const knowledgeHits = query ? state.knowledgeItems.filter((k) => (k.concept + k.explanation).toLowerCase().includes(query)) : [];
  return (
    <div>
      <Eyebrow>Search</Eyebrow>
      <div className="aos-h1">Academic memory</div>
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "#8B92A0" }} />
        <input className="aos-input" style={{ paddingLeft: 34 }} placeholder="Search notes, knowledge…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      {query && noteHits.length === 0 && knowledgeHits.length === 0 && <EmptyState text={`No results for "${q}"`} />}
      {noteHits.map((n) => (
        <div key={n.id} className="aos-card" style={{ marginBottom: 8 }}>
          <Pill bg="#EDE6D6" fg="var(--brass)">note</Pill>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>{n.title}</div>
          <div style={{ fontSize: 12.5, color: "#5A6270", marginTop: 3 }}>{n.content}</div>
        </div>
      ))}
      {knowledgeHits.map((k) => (
        <div key={k.id} className="aos-card" style={{ marginBottom: 8 }}>
          <Pill bg="#EAF0E9" fg="var(--moss)">knowledge</Pill>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>{k.concept}</div>
          <div style={{ fontSize: 12.5, color: "#5A6270", marginTop: 3 }}>{k.explanation}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Handwriting scanner (real vision OCR + contextual correction)         */
/* ---------------------------------------------------------------------- */

function ScannerScreen({ state, actions }) {
  const subject = state.subjects.find((s) => s.id === state.scannerSubjectId) || state.subjects[0];
  const [imgData, setImgData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [correctedText, setCorrectedText] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const fileRef = useRef(null);

  function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImgData(reader.result); setResult(null); setError(null); };
    reader.readAsDataURL(file);
  }

  async function runOcr() {
    if (!imgData) return;
    setLoading(true); setError(null);
    try {
      const base64 = imgData.split(",")[1];
      const mediaType = imgData.match(/data:(.*);base64/)[1];
      const prompt = `You are the handwriting-recognition engine for an academic notes app. The subject context is "${subject?.name}". Transcribe the handwritten content in this image.
Return ONLY a JSON object, no markdown fences, no preamble, with this exact shape:
{"rawText": "literal raw transcription, preserving errors", "correctedText": "contextually corrected version using ${subject?.name} academic terminology, preserving meaning and structure, using [[unclear]] for illegible parts", "uncertainWords": [{"word":"...", "alternatives":["...","..."]}], "confidence": 0.0}
Rules: do not invent content that is not visibly present, preserve researcher names and headings, prefer subject-specific terminology when resolving ambiguous words.`;
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: prompt },
            ],
          }],
        }),
      });
      const data = await resp.json();
      const textBlock = (data.content || []).map((b) => b.text || "").join("");
      const clean = textBlock.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setCorrectedText(parsed.correctedText || "");
    } catch (e) {
      setError("Couldn't read that page — try a clearer, well-lit photo.");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    actions.addNote({
      subjectId: subject.id,
      title: correctedText.slice(0, 40) || "Scanned note",
      rawOcr: result?.rawText || "",
      correctedText,
      content: correctedText,
      type: "lecture",
      source: "scan",
    });
    actions.setScreen("subjectDetail");
  }

  return (
    <div>
      <TopBar title="Scan handwriting" onBack={() => actions.setScreen("subjectDetail")} />
      <div style={{ marginTop: 6, marginBottom: 12 }}>
        <Pill bg={(subject?.color || "#3B6E8F") + "22"} fg={subject?.color || "var(--denim)"}>{subject?.name}</Pill>
      </div>

      {!imgData && (
        <div className="aos-card" style={{ textAlign: "center", padding: "34px 16px" }} onClick={() => fileRef.current.click()}>
          <Camera size={26} color="var(--moss)" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>Photograph a notebook page</div>
          <div style={{ fontSize: 12, color: "#8B92A0", marginTop: 4 }}>Tap to take a photo or upload an image</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
        </div>
      )}

      {imgData && (
        <div className="aos-card" style={{ padding: 8, marginBottom: 12 }}>
          <img src={imgData} alt="scan" style={{ width: "100%", borderRadius: 8, display: "block" }} />
        </div>
      )}

      {imgData && !result && (
        <button className="aos-btn aos-btn-brass" style={{ width: "100%" }} onClick={runOcr} disabled={loading}>
          {loading ? <Loader2 size={15} className="spin" style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
          {loading ? "Reading handwriting…" : "Recognize & correct"}
        </button>
      )}

      {error && (
        <div className="aos-card" style={{ marginTop: 10, borderColor: "var(--clay)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <AlertTriangle size={16} color="var(--clay)" />
          <div style={{ fontSize: 12.5 }}>{error}</div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button className={"aos-pill"} style={{ cursor: "pointer", padding: "6px 12px", background: !showRaw ? "var(--ink)" : "var(--white)", color: !showRaw ? "var(--white)" : "var(--ink)", border: "1px solid var(--paper-deep)" }} onClick={() => setShowRaw(false)}>Corrected note</button>
            <button className={"aos-pill"} style={{ cursor: "pointer", padding: "6px 12px", background: showRaw ? "var(--ink)" : "var(--white)", color: showRaw ? "var(--white)" : "var(--ink)", border: "1px solid var(--paper-deep)" }} onClick={() => setShowRaw(true)}>Raw OCR</button>
            <Pill bg="#EAF0E9" fg="var(--moss)">conf {Math.round((result.confidence || 0) * 100)}%</Pill>
          </div>

          {showRaw ? (
            <div className="aos-card aos-mono" style={{ fontSize: 12.5, color: "#5A6270" }}>{result.rawText}</div>
          ) : (
            <div>
              <textarea className="aos-input" rows={6} value={correctedText} onChange={(e) => setCorrectedText(e.target.value)} />
              {result.uncertainWords && result.uncertainWords.length > 0 && (
                <div className="aos-card" style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Uncertain words</div>
                  {result.uncertainWords.map((u, i) => (
                    <div key={i} style={{ fontSize: 12.5, marginBottom: 4 }}>
                      <span className="uncertain">{u.word}</span> — possible: {(u.alternatives || []).join(", ")}
                    </div>
                  ))}
                </div>
              )}
              <button className="aos-btn aos-btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={save}><Check size={14} />Save note</button>
            </div>
          )}
          <button className="aos-btn aos-btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => { setImgData(null); setResult(null); }}><RotateCcw size={13} />Rescan</button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Quick capture modal                                                   */
/* ---------------------------------------------------------------------- */

function QuickCaptureModal({ context, subjects, onClose, onSubmit }) {
  const [type, setType] = useState("note");
  const [content, setContent] = useState("");
  const [subjectId, setSubjectId] = useState(context?.subjectId || subjects[0]?.id || "");
  const types = ["note", "task", "idea", "question", "reminder"];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="aos-serif" style={{ fontSize: 17, fontWeight: 600 }}>Quick capture</div>
          <X size={18} onClick={onClose} style={{ cursor: "pointer" }} />
        </div>
        {context?.tagName && <div style={{ fontSize: 12, color: "#8B92A0", marginBottom: 10 }}>via NFC · {context.tagName}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {types.map((t) => (
            <span key={t} className="aos-pill" style={{ cursor: "pointer", padding: "6px 12px", background: type === t ? "var(--ink)" : "var(--white)", color: type === t ? "var(--white)" : "var(--ink)", border: "1px solid var(--paper-deep)" }} onClick={() => setType(t)}>{t}</span>
          ))}
        </div>
        <textarea className="aos-input" rows={3} placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} style={{ marginBottom: 10 }} autoFocus />
        {type !== "note" || true ? (
          <select className="aos-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={{ marginBottom: 12 }}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : null}
        <button className="aos-btn aos-btn-primary" style={{ width: "100%" }} onClick={() => { if (content.trim()) { onSubmit({ type, content, subjectId }); } }}>Save</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Bottom nav                                                            */
/* ---------------------------------------------------------------------- */

function BottomNav({ screen, setScreen, onPlus }) {
  const items = [
    { key: "home", icon: Home, label: "Today" },
    { key: "inbox", icon: InboxIcon, label: "Inbox" },
    { key: "subjects", icon: BookOpen, label: "Subjects" },
    { key: "research", icon: FlaskConical, label: "Research" },
    { key: "nfc", icon: User, label: "Profile" },
  ];
  return (
    <>
      <div className="aos-fab" onClick={onPlus}><Plus size={24} /></div>
      <div className="aos-nav">
        {items.map((it) => {
          const Icon = it.icon;
          const active = screen === it.key || (it.key === "subjects" && screen === "subjectDetail");
          return (
            <div key={it.key} className={"aos-nav-item" + (active ? " active" : "")} onClick={() => setScreen(it.key)}>
              <Icon size={18} />
              <span>{it.label}</span>
              <div className="aos-nav-dot" />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/*  Root app                                                              */
/* ---------------------------------------------------------------------- */

export default function AcademicOS() {
  const _ls = loadState() || {};
  const _launch = getLaunchParams();

  const [profile, setProfile] = useState(_ls.profile || SEED_PROFILE);
  const [screen, setScreen] = useState("home");
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [scannerSubjectId, setScannerSubjectId] = useState(null);
  const [subjects, setSubjects] = useState(_ls.subjects || SEED_SUBJECTS);
  const [notes, setNotes] = useState(_ls.notes || SEED_NOTES);
  const [tasks, setTasks] = useState(_ls.tasks || SEED_TASKS);
  const [inboxItems, setInboxItems] = useState(_ls.inboxItems || SEED_INBOX);
  const [researchProjects] = useState(SEED_RESEARCH_PROJECTS);
  const [researchEntries, setResearchEntries] = useState(_ls.researchEntries || SEED_RESEARCH_ENTRIES);
  const [knowledgeItems] = useState(SEED_KNOWLEDGE);
  const [nfcTags, setNfcTags] = useState(_ls.nfcTags || SEED_TAGS);
  const [scanning, setScanning] = useState(null);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureContext, setQuickCaptureContext] = useState(null);
  const [toast, setToast] = useState(null);
  const [nfcListening, setNfcListening] = useState(false);
  const [nfcError, setNfcError] = useState(null);
  const [authSplash, setAuthSplash] = useState(null); // { contextLabel }
  const nfcReaderRef = useRef(null);
  const nfcTagsRef = useRef(nfcTags);

  // Keep ref in sync so async NFC callbacks always see fresh tags
  useEffect(() => { nfcTagsRef.current = nfcTags; }, [nfcTags]);

  // Persist to localStorage whenever important state changes
  useEffect(() => {
    saveState({ subjects, notes, tasks, inboxItems, researchEntries, nfcTags, profile });
  }, [subjects, notes, tasks, inboxItems, researchEntries, nfcTags, profile]);

  // Handle deep-link launch: ?nfc=CODE or ?screen=xxx
  useEffect(() => {
    const tags = nfcTagsRef.current;
    if (_launch.nfcCode) {
      const tag = tags.find((t) => t.tag_code === _launch.nfcCode);
      if (tag) {
        const ctxLabel = tag.tag_name;
        setAuthSplash({ contextLabel: ctxLabel });
        setTimeout(() => {
          setAuthSplash(null);
          applyTagRoute(tag, tags);
        }, 3100);
      }
    } else if (_launch.screen) {
      const s = _launch.screen;
      if (s === "subjectDetail" && _launch.subjectId) setActiveSubjectId(_launch.subjectId);
      setScreen(s);
    }
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function applyTagRoute(tag, tags) {
    const ct = tag.context_type;
    if (ct === "dashboard" || ct === "home") setScreen("home");
    else if (ct === "inbox") setScreen("inbox");
    else if (ct === "subjects") setScreen("subjects");
    else if (ct === "research" || ct === "research_project") setScreen("research");
    else if (ct === "study" || ct === "study_session") setScreen("study");
    else if (ct === "dailyReview" || ct === "daily_review") setScreen("dailyReview");
    else if (ct === "search") setScreen("search");
    else if (ct === "nfc") setScreen("nfc");
    else if (ct === "subject") { setActiveSubjectId(tag.context_id); setScreen("subjectDetail"); }
    else if (ct === "quick_capture") { setQuickCaptureContext({ tagName: tag.tag_name }); setQuickCaptureOpen(true); }
    showToast(`Context set: ${tag.tag_name}`);
  }

  function routeForTag(tag) { applyTagRoute(tag, nfcTagsRef.current); }

  function handleScannedCode(code, serial) {
    const tags = nfcTagsRef.current;
    // Match by tag_code (content on tag), or serial number (UID of physical tag)
    const tag = tags.find((t) =>
      (code && t.tag_code && t.tag_code === code) ||
      (serial && t.serial && t.serial === serial) ||
      (serial && t.tag_code && t.tag_code === serial)
    );
    if (tag) tapTag(tag);
    else {
      // Tag was scanned but not registered — still show success, just go home
      showToast("Tag read — not yet registered. Add it in Profile.");
    }
  }

  async function startNfcScan(onCode) {
    if (!NFC_SUPPORTED) { setNfcError("Web NFC isn't supported here. Use Chrome on Android over HTTPS."); return; }
    try {
      setNfcError(null);
      setNfcListening(true);
      const reader = new window.NDEFReader();
      nfcReaderRef.current = reader;
      await reader.scan();
      reader.onreading = (event) => {
        setNfcListening(false);
        const code = extractTagCode(event);
        if (onCode) onCode(code, event.serialNumber);
        else handleScannedCode(code, event.serialNumber);
      };
      reader.onreadingerror = () => {
        setNfcListening(false);
        setNfcError("Couldn't read that tag — hold the phone steady against it and try again.");
      };
    } catch (e) {
      setNfcListening(false);
      if (e.name === "NotAllowedError") setNfcError("NFC permission was denied. Allow it in site settings and retry.");
      else if (e.name === "NotSupportedError") setNfcError("This device has no NFC hardware, or NFC is turned off.");
      else if (e.name === "SecurityError") setNfcError("NFC requires HTTPS.");
      else setNfcError("Couldn't start NFC scan: " + e.message);
    }
  }

  // Called by real NFC reads — shows animation then routes
  function tapTag(tag) {
    setScanning(tag);
    setTimeout(() => { setScanning(null); routeForTag(tag); }, 1050);
  }

  // Called by "Tap" button in Profile — requires physical NFC read
  async function simulateTagScan(tag) {
    if (!NFC_SUPPORTED) {
      showToast("Physical NFC required — use Chrome on Android over HTTPS");
      return;
    }
    setScanning(tag);
    try {
      setNfcError(null);
      setNfcListening(true);
      const reader = new window.NDEFReader();
      nfcReaderRef.current = reader;
      await reader.scan();
      reader.onreading = (event) => {
        setNfcListening(false);
        const code = extractTagCode(event);
        const serial = event.serialNumber;
        const tags = nfcTagsRef.current;
        const scannedTag = tags.find((t) =>
          (code && t.tag_code && t.tag_code === code) ||
          (serial && t.serial && t.serial === serial) ||
          (serial && t.tag_code && t.tag_code === serial)
        );
        if (scannedTag) {
          setScanning(scannedTag);
          setTimeout(() => { setScanning(null); routeForTag(scannedTag); }, 1050);
        } else {
          // Even if not matched, route the tag we were previewing (matching by intent)
          setScanning(null);
          routeForTag(tag);
        }
      };
      reader.onreadingerror = () => {
        setNfcListening(false);
        setScanning(null);
        setNfcError("Couldn't read tag.");
      };
    } catch (e) {
      setNfcListening(false);
      setScanning(null);
      if (e.name === "NotAllowedError") setNfcError("NFC permission denied.");
      else if (e.name === "NotSupportedError") setNfcError("NFC not available on this device.");
      else if (e.name === "SecurityError") setNfcError("NFC requires HTTPS.");
      else setNfcError("NFC error: " + e.message);
    }
  }

  const actions = {
    setScreen,
    tapIdCard: () => {
      const dashTag = nfcTagsRef.current.find((t) => t.context_type === "dashboard");
      if (dashTag) tapTag(dashTag);
    },
    tapTag,
    toggleTask: (id) => setTasks((ts) => ts.map((t) => t.id === id ? { ...t, status: t.status === "done" ? "todo" : "done" } : t)),
    addInboxItem: (content) => setInboxItems((items) => [{ id: uid(), content, type: "note", createdAt: new Date().toISOString() }, ...items]),
    deleteInboxItem: (id) => setInboxItems((items) => items.filter((i) => i.id !== id)),
    processInboxToTask: (id) => {
      const item = inboxItems.find((i) => i.id === id);
      if (!item) return;
      setTasks((ts) => [{ id: uid(), title: item.content, subjectId: subjects[0]?.id, status: "todo", deadline: null }, ...ts]);
      setInboxItems((items) => items.filter((i) => i.id !== id));
      showToast("Moved to Tasks");
    },
    addSubject: (name) => setSubjects((s) => [...s, { id: uid(), name, code: "", color: ["#3B6E8F", "#35513F", "#B4482D", "#7A5C9E"][s.length % 4] }]),
    openSubject: (id) => { setActiveSubjectId(id); setScreen("subjectDetail"); },
    addResearchEntry: (projectId, type, content) => setResearchEntries((es) => [{ id: uid(), projectId, type, content, createdAt: new Date().toISOString() }, ...es]),
    endStudySession: () => { showToast("Session saved"); setScreen("home"); },
    updateNfcTag: (id, patch) => {
      setNfcTags((tags) => tags.map((t) => t.id === id ? { ...t, ...patch } : t));
      showToast("Tag updated");
    },
    addNfcTag: (name, contextType, contextId, pairedCode) => {
      setNfcTags((tags) => [...tags, {
        id: uid(),
        tag_code: pairedCode || uid().toUpperCase().slice(0, 5),
        tag_name: name,
        context_type: contextType,
        context_id: contextId,
        serial: pairedCode || null,
      }]);
      showToast(pairedCode ? "Physical tag paired" : "Tag registered");
    },
    updateProfile: (p) => { setProfile(p); showToast("Profile saved"); },
    openQuickCapture: (ctx) => { setQuickCaptureContext(ctx); setQuickCaptureOpen(true); },
    openScanner: (subjectId) => { setScannerSubjectId(subjectId); setScreen("scanner"); },
    addNote: (note) => setNotes((ns) => [{ id: uid(), createdAt: new Date().toISOString(), ...note }, ...ns]),
    startNfcScan,
    simulateTagScan,
  };

  function submitQuickCapture({ type, content, subjectId }) {
    if (type === "task") setTasks((ts) => [{ id: uid(), title: content, subjectId, status: "todo", deadline: null }, ...ts]);
    else if (type === "idea") setResearchEntries((es) => [{ id: uid(), projectId: researchProjects[0]?.id, type: "idea", content, createdAt: new Date().toISOString() }, ...es]);
    else if (type === "note") setNotes((ns) => [{ id: uid(), subjectId, title: content.slice(0, 36), content, rawOcr: "", correctedText: content, type: "quick", source: "manual", createdAt: new Date().toISOString() }, ...ns]);
    else setInboxItems((items) => [{ id: uid(), content, type, createdAt: new Date().toISOString() }, ...items]);
    setQuickCaptureOpen(false);
    showToast("Saved");
  }

  const state = { profile, subjects, notes, tasks, inboxItems, researchProjects, researchEntries, knowledgeItems, nfcTags, scanning, activeSubjectId, scannerSubjectId, nfcListening, nfcError, nfcSupported: NFC_SUPPORTED };

  return (
    <div className="aos-root">
      <style>{CSS}</style>
      {authSplash && <AuthSplash profile={profile} contextLabel={authSplash.contextLabel} onDone={() => setAuthSplash(null)} />}
      {scanning && !authSplash && (
        <ScanOverlay
          tag={scanning}
          waiting={nfcListening}
          onCancel={() => {
            setScanning(null);
            setNfcListening(false);
            try { nfcReaderRef.current?.abort?.(); } catch {}
          }}
        />
      )}
      <div className="aos-content">
        {screen === "home" && <HomeScreen state={state} actions={actions} />}
        {screen === "inbox" && <InboxScreen state={state} actions={actions} />}
        {screen === "subjects" && <SubjectsScreen state={state} actions={actions} />}
        {screen === "subjectDetail" && <SubjectDetailScreen state={state} actions={actions} />}
        {screen === "research" && <ResearchScreen state={state} actions={actions} />}
        {screen === "study" && <StudySessionScreen state={state} actions={actions} />}
        {screen === "dailyReview" && <DailyReviewScreen />}
        {screen === "nfc" && <NfcManageScreen state={state} actions={actions} />}
        {screen === "search" && <SearchScreen state={state} />}
        {screen === "scanner" && <ScannerScreen state={state} actions={actions} />}
      </div>
      {quickCaptureOpen && (
        <QuickCaptureModal
          context={quickCaptureContext}
          subjects={subjects}
          onClose={() => setQuickCaptureOpen(false)}
          onSubmit={submitQuickCapture}
        />
      )}
      <BottomNav screen={screen} setScreen={setScreen} onPlus={() => actions.openQuickCapture(null)} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}