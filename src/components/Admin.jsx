import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, isConfigured } from "../lib/supabase.js";
import { resizeToBlob } from "../lib/image.js";

const BLANK = { id: null, title: "", type: "live", band: "", place: "", date: "", description: "", image_url: "", image_path: "" };

function placeholder(type) {
  const blood = "#A81E1E", ink = "#14110D", paper = "#DED7C5";
  const svg = type === "live"
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='${ink}'/><circle cx='400' cy='300' r='80' fill='${blood}'/></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='${paper}'/><circle cx='400' cy='300' r='180' fill='${ink}'/><circle cx='400' cy='300' r='55' fill='${blood}'/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authErr, setAuthErr] = useState("");

  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const fileRef = useRef(null);

  // ---- auth wiring ----
  useEffect(() => {
    if (!isConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.from("entries").select("*").order("created_at", { ascending: false });
    setEntries(data || []);
  }, []);

  useEffect(() => { if (session) load(); }, [session, load]);

  const signIn = async () => {
    setAuthErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthErr(error.message);
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  // ---- form helpers ----
  const openNew = () => { setEditing({ ...BLANK }); setPendingFile(null); setLocalPreview(""); setFormErr(""); };
  const openEdit = (e) => { setEditing({ ...e }); setPendingFile(null); setLocalPreview(""); setFormErr(""); };

  const pickFile = (file) => {
    if (!file) return;
    setPendingFile(file);
    const r = new FileReader();
    r.onload = () => setLocalPreview(r.result);
    r.readAsDataURL(file);
  };

  const save = async () => {
    if (!editing.title.trim()) { setFormErr("Give it a title first."); return; }
    setSaving(true); setFormErr("");
    try {
      let image_url = editing.image_url;
      let image_path = editing.image_path;

      if (pendingFile) {
        const blob = await resizeToBlob(pendingFile);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        // remove the old photo if we're replacing one
        if (editing.image_path) {
          await supabase.storage.from("photos").remove([editing.image_path]).catch(() => {});
        }
        image_path = path;
        image_url = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        title: editing.title.trim(),
        type: editing.type,
        band: editing.band || null,
        place: editing.place || null,
        date: editing.date || null,
        description: editing.description || null,
        image_url: image_url || null,
        image_path: image_path || null,
      };

      if (editing.id) {
        const { error } = await supabase.from("entries").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("entries").insert(payload);
        if (error) throw error;
      }
      setEditing(null);
      setPendingFile(null);
      setLocalPreview("");
      await load();
    } catch (err) {
      setFormErr(err.message || "Could not save that piece.");
    }
    setSaving(false);
  };

  const remove = async (e) => {
    if (!confirm(`Delete "${e.title}"? This can't be undone.`)) return;
    if (e.image_path) await supabase.storage.from("photos").remove([e.image_path]).catch(() => {});
    await supabase.from("entries").delete().eq("id", e.id);
    await load();
  };

  // ---- render guards ----
  if (!isConfigured) {
    return (
      <div className="notice">
        <h3>Connect Supabase first</h3>
        <p>Add your <code>PUBLIC_SUPABASE_URL</code> and <code>PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env</code>, then restart. See the README.</p>
      </div>
    );
  }
  if (!ready) return <div className="empty">Loading…</div>;

  // ---- not signed in ----
  if (!session) {
    return (
      <div className="login">
        <h2>Curator login</h2>
        <p>Only you can pin up new pieces. Use the account you created in Supabase.</p>
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label">Password</label>
        <input className="input" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()} />
        {authErr && <p className="err">{authErr}</p>}
        <div className="form-actions"><button className="btn-primary" onClick={signIn}>Sign in</button></div>
      </div>
    );
  }

  // ---- signed in: dashboard ----
  return (
    <>
      <div className="controls">
        <div className="filters"><span className="eyebrow">Signed in · {entries.length} pieces</span></div>
        <div className="actions">
          <button className="btn-primary" onClick={openNew}>+ Pin a new piece</button>
          <button className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className="admin-list">
        {entries.map((e) => (
          <div className="admin-row" key={e.id}>
            <img className="admin-thumb" src={e.image_url || placeholder(e.type)} alt="" />
            <div className="meta">
              <strong>{e.title}</strong>
              <span>{[e.type === "live" ? "Live shot" : "Memorabilia", e.band, e.place].filter(Boolean).join(" · ")}</span>
            </div>
            <button className="ghost" onClick={() => openEdit(e)}>Edit</button>
            <button className="danger" onClick={() => remove(e)}>Delete</button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="panel" onClick={(ev) => ev.stopPropagation()}>
            <button className="close" onClick={() => setEditing(null)} aria-label="Close">✕</button>
            <h2 className="panel-title">{editing.id ? "Edit piece" : "Pin a new piece"}</h2>

            <div className="type-toggle">
              {[["live", "Live shot"], ["memorabilia", "Memorabilia"]].map(([k, label]) => (
                <button key={k} className={"type-btn" + (editing.type === k ? " is-on" : "")}
                  onClick={() => setEditing({ ...editing, type: k })}>{label}</button>
              ))}
            </div>

            <label className="label">Title *</label>
            <input className="input" value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder={editing.type === "live" ? "e.g. Knocked Loose — wall of death" : "e.g. Converge — Jane Doe test press"} />

            <div className="row">
              <div>
                <label className="label">{editing.type === "live" ? "Act" : "Artist"}</label>
                <input className="input" value={editing.band || ""} onChange={(e) => setEditing({ ...editing, band: e.target.value })} />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              </div>
            </div>

            <label className="label">{editing.type === "live" ? "Venue" : "Source / where acquired"}</label>
            <input className="input" value={editing.place || ""}
              onChange={(e) => setEditing({ ...editing, place: e.target.value })}
              placeholder={editing.type === "live" ? "e.g. The Van Buren, Phoenix" : "e.g. Discogs / merch table"} />

            <label className="label">Notes</label>
            <textarea className="input textarea" rows={4} value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="The story behind it — the set, where you got it, why it matters." />

            <label className="label">Photo</label>
            <div className="photo-pick">
              <div className="preview">
                {localPreview || editing.image_url
                  ? <img src={localPreview || editing.image_url} alt="preview" />
                  : <div className="placeholder">No photo</div>}
              </div>
              <div className="photo-controls">
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => pickFile(e.target.files?.[0])} />
                <button className="ghost" onClick={() => fileRef.current?.click()}>
                  {editing.image_url || localPreview ? "Replace photo" : "Choose photo"}
                </button>
                <p className="hint">Resized automatically before upload.</p>
              </div>
            </div>

            {formErr && <p className="err">{formErr}</p>}
            <div className="form-actions">
              <button className="ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : editing.id ? "Save changes" : "Pin it up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
