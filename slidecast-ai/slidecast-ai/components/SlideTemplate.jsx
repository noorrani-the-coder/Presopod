function BulletList({ bullets, bulletClass, dotClass, cleanTeamMember }) {
  return (
    <ul className={`space-y-4 text-[34px] leading-relaxed ${bulletClass}`}>
      {(bullets || []).map((b, i) => (
        <li key={i} className="flex gap-3 items-start">
          <span className={`mt-2 text-xl ${dotClass || bulletClass}`}>•</span>
          <span className="text-[0.64em]">{cleanTeamMember(b)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SlideTemplate({ slide, theme, index, total }) {
  const isTeamSlide = /team|members|contributors|authors|our team/i.test(slide?.title || "");
  const cleanTeamMember = (text) => {
    if (!isTeamSlide || typeof text !== "string") return text;
    let t = text;
    t = t.replace(/\b(example|e\.g\.|eg|for example|sample)\b/gi, "");
    t = t.replace(/^[\s:\-]+/, "");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  };

  const layout = theme.layout || "framed";

  return (
    <div className={`w-[960px] h-[540px] rounded-xl shadow-2xl relative overflow-hidden border ${theme.bg}`}>
      <div className={`absolute left-0 top-0 h-full w-3 ${theme.accent}`} />

      {layout === "framed" && (
        <div className={`absolute inset-[14px] rounded-lg border p-12 ${theme.frame || "bg-white/80 border-white/20"}`}>
          <div className="mb-7">
            <h1 className={`${theme.title} mb-4`}>{slide.title}</h1>
            <div className="h-px w-24 bg-black/15" />
          </div>
          <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
        </div>
      )}

      {layout === "band_top" && (
        <>
          <div className={`absolute top-0 left-0 right-0 h-[120px] ${theme.accent} px-12 flex items-center`}>
            <h1 className={`${theme.title}`}>{slide.title}</h1>
          </div>
          <div className={`absolute top-[132px] left-8 right-8 bottom-10 rounded-xl border p-10 ${theme.frame || "bg-white/70 border-white/20"}`}>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "split_left" && (
        <>
          <div className={`absolute inset-y-0 left-0 w-[34%] ${theme.accent} p-10 flex items-end`}>
            <h1 className={`${theme.title}`}>{slide.title}</h1>
          </div>
          <div className={`absolute top-8 right-8 bottom-8 left-[36%] rounded-xl border p-9 ${theme.frame || "bg-white/75 border-white/20"}`}>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "minimal_grid" && (
        <>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(15,23,42,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.18) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
          <div className={`absolute inset-8 rounded-xl border p-10 ${theme.frame || "bg-white/85 border-slate-300/70"}`}>
            <h1 className={`${theme.title} mb-8`}>{slide.title}</h1>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "sidebar_right" && (
        <>
          <div className={`absolute top-0 right-0 h-full w-[30%] ${theme.accent} p-8 flex items-start`}>
            <h1 className={`${theme.title}`}>{slide.title}</h1>
          </div>
          <div className={`absolute top-8 left-8 bottom-8 right-[32%] rounded-xl border p-9 ${theme.frame || "bg-white/70 border-white/25"}`}>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "mesh" && (
        <>
          <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
          <div className={`absolute inset-8 rounded-2xl border p-11 backdrop-blur-sm ${theme.frame || "bg-black/20 border-white/20"}`}>
            <h1 className={`${theme.title} mb-8`}>{slide.title}</h1>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "darkboard" && (
        <>
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.22) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className={`absolute inset-8 rounded-xl border p-11 ${theme.frame || "bg-white/[0.05] border-white/20"}`}>
            <h1 className={`${theme.title} mb-8`}>{slide.title}</h1>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "cards" && (
        <>
          <div className={`absolute top-0 left-0 right-0 h-24 ${theme.accent} px-10 flex items-center`}>
            <h1 className={`${theme.title}`}>{slide.title}</h1>
          </div>
          <div className="absolute top-28 left-8 right-8 bottom-8 grid grid-cols-2 gap-4">
            {(slide.bullets || []).slice(0, 6).map((b, i) => (
              <div key={i} className={`rounded-xl border p-5 ${theme.frame || "bg-white/90 border-zinc-300/80"}`}>
                <div className={`text-sm mb-2 ${theme.dot || theme.bullet}`}>Point {i + 1}</div>
                <div className={`text-base leading-relaxed ${theme.bullet}`}>{cleanTeamMember(b)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {layout === "spotlight" && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.3),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.25),transparent_40%)]" />
          <div className={`absolute inset-10 rounded-2xl border p-10 ${theme.frame || "bg-white/[0.05] border-indigo-300/25"}`}>
            <h1 className={`${theme.title} mb-8`}>{slide.title}</h1>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "diagonal" && (
        <>
          <div className={`absolute -left-28 -top-20 w-[75%] h-[180%] rotate-12 ${theme.accent} opacity-30`} />
          <div className={`absolute inset-9 rounded-2xl border p-10 ${theme.frame || "bg-black/20 border-white/25"}`}>
            <h1 className={`${theme.title} mb-8`}>{slide.title}</h1>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      {layout === "pillar" && (
        <>
          <div className={`absolute top-0 left-[14%] w-10 h-full ${theme.accent} opacity-70`} />
          <div className={`absolute top-0 left-[34%] w-6 h-full ${theme.accent} opacity-45`} />
          <div className={`absolute inset-8 rounded-xl border p-10 ${theme.frame || "bg-black/20 border-lime-300/35"}`}>
            <h1 className={`${theme.title} mb-8`}>{slide.title}</h1>
            <BulletList bullets={slide.bullets} bulletClass={theme.bullet} dotClass={theme.dot} cleanTeamMember={cleanTeamMember} />
          </div>
        </>
      )}

      <div className={`absolute bottom-5 right-7 text-xs tracking-[0.12em] uppercase ${theme.footer || "text-white/70"}`}>
        Slide {index + 1} / {total}
      </div>
    </div>
  );
}
