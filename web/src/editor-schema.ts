import { content } from '@video/config/content';

/**
 * Skema field editor.
 *
 * Menentukan field mana dari tiap jenis scene yang boleh diubah dari web,
 * beserta jenis inputnya. Ditulis terpisah dari content.mjs supaya konten
 * tetap jadi satu sumber kebenaran — editor cuma menghasilkan `overrides`
 * yang ditumpuk di atasnya saat render.
 */

export type FieldKind = 'text' | 'textarea' | 'list' | 'iconlist';

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  max?: number;
  hint?: string;
}

/** Field yang bisa diedit per jenis scene. */
export const fieldsByKind: Record<string, Field[]> = {
  hook: [
    { key: 'lineA', label: 'Baris 1', kind: 'text', max: 24 },
    { key: 'lineB', label: 'Baris 2 (warna aksen)', kind: 'text', max: 24 },
  ],
  code: [
    { key: 'filename', label: 'Nama file', kind: 'text', max: 28 },
    {
      key: 'lines',
      label: 'Baris kode',
      kind: 'list',
      hint: 'Satu baris per baris teks. Awali dengan kata kunci + spasi untuk pewarnaan.',
    },
  ],
  param: [
    { key: 'label', label: 'Label atas', kind: 'text', max: 30 },
    { key: 'values', label: 'Nilai (pisahkan koma)', kind: 'text', max: 40 },
    { key: 'unit', label: 'Satuan', kind: 'text', max: 10 },
    { key: 'caption', label: 'Keterangan bawah', kind: 'text', max: 40 },
  ],
  steps: [
    {
      key: 'steps',
      label: 'Langkah',
      kind: 'iconlist',
      hint: 'Format: emoji | teks — satu langkah per baris.',
    },
  ],
  outro: [
    { key: 'brand', label: 'Nama brand', kind: 'text', max: 14 },
    { key: 'tagline', label: 'Tagline', kind: 'text', max: 34 },
    { key: 'cta', label: 'Tombol CTA', kind: 'text', max: 26 },
  ],
};

export type Overrides = Record<string, Record<string, unknown>>;

/** Nilai awal form, diambil dari konten asli. */
export function initialValues(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const scene of content.scenes) {
    const fields = fieldsByKind[scene.kind] ?? [];
    const data = (scene.data ?? {}) as Record<string, unknown>;
    out[scene.id] = {};
    for (const f of fields) {
      out[scene.id][f.key] = serialize(f.kind, data[f.key]);
    }
  }
  return out;
}

/** Ubah nilai data → teks yang enak diedit di textarea/input. */
function serialize(kind: FieldKind, v: unknown): string {
  if (v == null) return '';
  if (kind === 'list' && Array.isArray(v)) {
    // [['const',' x = 1;'], …] → "const x = 1;"
    return (v as [string, string][]).map((p) => (Array.isArray(p) ? p.join('') : String(p))).join('\n');
  }
  if (kind === 'iconlist' && Array.isArray(v)) {
    return (v as { icon: string; text: string }[]).map((s) => `${s.icon} | ${s.text}`).join('\n');
  }
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/** Kebalikannya: teks form → bentuk data yang dipakai komposisi. */
function parse(kind: FieldKind, key: string, raw: string): unknown {
  const t = raw.trim();
  if (kind === 'list') {
    return t
      .split('\n')
      .filter((l) => l.length > 0)
      .map((line) => {
        // pisahkan kata pertama sebagai "keyword" agar diwarnai
        const m = line.match(/^(const|let|var|return|function|import|export|if|for)(\s.*)$/);
        return m ? [m[1], m[2]] : ['', line];
      });
  }
  if (kind === 'iconlist') {
    return t
      .split('\n')
      .filter((l) => l.length > 0)
      .map((line) => {
        const [icon, ...rest] = line.split('|');
        return { icon: (icon ?? '').trim() || '•', text: rest.join('|').trim() };
      });
  }
  if (key === 'values') return t.split(',').map((x) => x.trim()).filter(Boolean);
  return raw;
}

/**
 * Hitung selisih terhadap konten asli — hanya field yang benar-benar diubah
 * yang dikirim, supaya inputProps tetap ramping.
 */
export function toOverrides(values: Record<string, Record<string, string>>): Overrides {
  const base = initialValues();
  const out: Overrides = {};
  for (const scene of content.scenes) {
    const fields = fieldsByKind[scene.kind] ?? [];
    for (const f of fields) {
      const cur = values[scene.id]?.[f.key] ?? '';
      if (cur === (base[scene.id]?.[f.key] ?? '')) continue;
      out[scene.id] ??= {};
      out[scene.id][f.key] = parse(f.kind, f.key, cur);
    }
  }
  return out;
}

/** Label ramah untuk tiap scene. */
export const sceneTitle: Record<string, string> = {
  hook: 'Pembuka',
  code: 'Cuplikan kode',
  param: 'Angka berubah',
  steps: 'Langkah-langkah',
  outro: 'Penutup',
};
