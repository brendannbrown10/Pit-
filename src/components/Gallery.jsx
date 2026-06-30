import { useState, useEffect, useCallback } from "react";
import { supabase, isConfigured } from "../lib/supabase.js";

function placeholder(type) {
  const blood = "#A81E1E", ink = "#14110D", paper = "#DED7C5";
  const svg = type === "live"
    ? `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='${ink}'/><g fill='${blood}'><rect x='0' y='420' width='800' height='180' opacity='0.25'/><path d='M120 600 L160 470 L200 600 Z'/><path d='M210 600 L250 440 L290 600 Z'/><path d='M300 600 L345 410 L390 600 Z'/><path d='M400 600 L450 460 L500 600 Z'/><path d='M510 600 L555 430 L600 600 Z'/><path d='M610 600 L650 470 L690 600 Z'/></g><circle cx='400' cy='180' r='70' fill='${blood}' opacity='0.85'/><rect x='370' y='250' width='60' height='150' fill='${blood}' opacity='0.85'/></svg>`
    : `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'><rect width='800' height='600' fill='${paper}'/><circle cx='400' cy='300' r='220' fill='${ink}'/><circle cx='400' cy='300' r='70' fill='${blood}'/><circle cx='400' cy='300' r='10' fill='${paper}'/></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export default function Gallery() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setEntries(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const liveCount = entries.filter((e) => e.type === "live").length;
  const memCount = entries.filter((e) => e.type === "memorabilia").length;
  const visible = entries
    .filter((e) => filter === "all" || e.type === filter)
    .filter((e) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return [e.title, e.band, e.place, e.description].some((f) => (f || "").toLowerCase().includes(q));
    });

  if (!isConfigured) {
    return (
      <div className="notice">
        <h3>Almost there — connect Supabase</h3>
        <p>Add <code>PUBLIC_SUPABASE_URL</code> and <code>PUBLIC_SUPABASE_ANON_KEY</code> to a <code>.env</code> file
        (copy <code>.env.example</code>), then restart the dev server. The README walks through it step by step.</p>
      </div>
    );
  }

  return (
    <>
      <div className="controls">
        <div className="filters">
          {[["all", `All · ${entries.length}`], ["live", `Live shots · ${liveCount}`], ["memorabilia", `Memorabilia · ${memCount}`]].map(([k, label]) => (
            <button key={k} className={"chip" + (filter === k ? " is-on" : "")} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <div className="actions">
          <input className="search" placeholder="Search band, venue, notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {error && <div className="notice"><h3>Could not load the archive</h3><p>{error}</p></div>}

      {loading ? (
        <div className="empty">Loading the archive…</div>
      ) : visible.length === 0 ? (
        <div className="empty">
          {entries.length === 0 ? (
            <>
              <p className="empty-head">The wall is empty.</p>
              <p>Sign in as curator to pin up the first piece.</p>
            </>
          ) : (<p>Nothing matches that filter.</p>)}
        </div>
      ) : (
        <div className="grid">
          {visible.map((e) => (
            <button key={e.id} className="card" onClick={() => setSelected(e)}>
              <span className="tape" />
              <div className="photo-wrap">
                <img className="photo" src={e.image_url || placeholder(e.type)} alt={e.title} loading="lazy" />
                <span className={"tag " + (e.type === "live" ? "tag-live" : "tag-mem")}>
                  {e.type === "live" ? "LIVE SHOT" : "MEMORABILIA"}
                </span>
              </div>
              <div className="card-body">
                <h3 className="card-title">{e.title}</h3>
                <p className="card-meta">
                  {[e.band, e.place].filter(Boolean).join(" · ")}{e.date ? ` · ${e.date}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="detail" onClick={(ev) => ev.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
            <div className="detail-photo">
              <img src={selected.image_url || placeholder(selected.type)} alt={selected.title} />
            </div>
            <div className="detail-body">
              <span className={"tag " + (selected.type === "live" ? "tag-live" : "tag-mem")} style={{ position: "static", display: "inline-block" }}>
                {selected.type === "live" ? "LIVE SHOT" : "MEMORABILIA"}
              </span>
              <h2 className="detail-title">{selected.title}</h2>
              <dl className="spec">
                {selected.band && (<><dt>{selected.type === "live" ? "Act" : "Artist"}</dt><dd>{selected.band}</dd></>)}
                {selected.place && (<><dt>{selected.type === "live" ? "Venue" : "Source"}</dt><dd>{selected.place}</dd></>)}
                {selected.date && (<><dt>Date</dt><dd>{selected.date}</dd></>)}
              </dl>
              {selected.description && <p className="detail-desc">{selected.description}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
