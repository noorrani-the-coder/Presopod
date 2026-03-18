import { PPT_THEMES } from "../src/themes/themes";

const THEME_GROUPS = [
  {
    label: "Corporate / Professional",
    ids: ["corporate_blue", "corporate_gray", "corporate_purple", "startup_minimal", "startup_dark"],
  },
  {
    label: "Academic",
    ids: ["academic_white", "academic_beige", "ai_research_lab"],
  },
  {
    label: "Futuristic / AI",
    ids: ["ai_gradient", "neon_dark", "neural_pulse", "stellar_grid", "dna_spectrum", "holographic_matrix"],
  },
  {
    label: "Premium / Minimal",
    ids: ["deep_space_void", "noir_silicon", "obsidian_gold", "frosted_ai", "liquid_glass_dark", "platinum_future"],
  },
  {
    label: "Creative / Color",
    ids: ["sunset", "forest", "quantum_bloom", "prismatic_flux", "aurora_liquid", "cosmic_rift"],
  },
  {
    label: "Science / Research",
    ids: ["bio_luminescence", "genome_wave"],
  },
  {
    label: "Terminal / Hacker",
    ids: ["terminal_ai", "code_void"],
  },
  {
    label: "Glass / Liquid",
    ids: ["frozen_hologram"],
  },
];

function buildGroupedThemes(themes) {
  const byId = new Map(themes.map((t) => [t.id, t]));
  const used = new Set();

  const groups = THEME_GROUPS.map((group) => {
    const items = group.ids.map((id) => byId.get(id)).filter(Boolean);
    items.forEach((item) => used.add(item.id));
    return { label: group.label, items };
  }).filter((group) => group.items.length > 0);

  const other = themes.filter((t) => !used.has(t.id));
  if (other.length > 0) {
    groups.push({ label: "Other", items: other });
  }

  return groups;
}

export default function ThemeSelector({ selected, onChange }) {
  const groupedThemes = buildGroupedThemes(PPT_THEMES);

  return (
    <div className="relative">
      <select
        value={selected.id}
        onChange={(e) => onChange(PPT_THEMES.find((t) => t.id === e.target.value))}
        className="min-w-[190px] rounded-lg border border-white/15 bg-black/45 px-4 py-2.5 text-sm font-medium text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
      >
        {groupedThemes.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.items.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
