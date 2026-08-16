import React from 'react';
import {
  themePresets,
  captionPresets,
  voicePresets,
  ratePresets,
  type CaptionAnim,
  type CaptionPos,
} from '@video/config/presets';

/**
 * Panel preset: tema warna, gaya caption, dan suara narator.
 * Semua pilihan dikirim sebagai inputProps → berlaku di preview & render.
 */

export interface StyleState {
  themeId: string;
  captionAnim: CaptionAnim;
  captionPos: CaptionPos;
  captionSize: number;
  withCaptions: boolean;
  wordsPerChunk: number;
  voice: string;
  rate: string;
}

export const defaultStyle: StyleState = {
  themeId: 'midnight',
  captionAnim: 'highlight',
  captionPos: 'bottom',
  captionSize: 64,
  withCaptions: true,
  wordsPerChunk: 3,
  voice: 'id-ID-GadisNeural',
  rate: '+0%',
};

const posLabel: Record<CaptionPos, string> = {
  top: 'Atas',
  center: 'Tengah',
  bottom: 'Bawah',
};

export const StylePanel: React.FC<{
  value: StyleState;
  onChange: (patch: Partial<StyleState>) => void;
}> = ({ value, onChange }) => {
  return (
    <section className="panel">
      <span className="panel-label">Gaya</span>

      {/* ---- tema warna ---- */}
      <div className="sub">Tema warna</div>
      <div className="swatches">
        {themePresets.map((t) => (
          <button
            key={t.id}
            className={`swatch ${value.themeId === t.id ? 'is-on' : ''}`}
            onClick={() => onChange({ themeId: t.id })}
            title={t.label}
            aria-pressed={value.themeId === t.id}
          >
            <span className="dot" style={{ background: t.accent }} />
            <span className="dot" style={{ background: t.accentWarm }} />
            <span className="sw-name">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ---- caption ---- */}
      <div className="sub">
        Subtitle
        <button
          className="linkbtn"
          onClick={() => onChange({ withCaptions: !value.withCaptions })}
          style={{ marginLeft: 'auto' }}
        >
          {value.withCaptions ? 'sembunyikan' : 'tampilkan'}
        </button>
      </div>

      {value.withCaptions && (
        <>
          <div className="chips">
            {captionPresets.map((p) => (
              <button
                key={p.id}
                className={`chip ${value.captionAnim === p.id ? 'is-on' : ''}`}
                onClick={() => onChange({ captionAnim: p.id })}
                title={p.hint}
                aria-pressed={value.captionAnim === p.id}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="row2">
            <div>
              <label className="mini">Posisi</label>
              <div className="chips">
                {(['top', 'center', 'bottom'] as CaptionPos[]).map((p) => (
                  <button
                    key={p}
                    className={`chip ${value.captionPos === p ? 'is-on' : ''}`}
                    onClick={() => onChange({ captionPos: p })}
                  >
                    {posLabel[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mini" htmlFor="csize">
            Ukuran teks: {value.captionSize}px
          </label>
          <input
            id="csize"
            className="range"
            type="range"
            min={40}
            max={92}
            step={2}
            value={value.captionSize}
            onChange={(e) => onChange({ captionSize: Number(e.target.value) })}
          />

          <label className="mini" htmlFor="wpc2">
            Kata per potongan: {value.wordsPerChunk}
          </label>
          <input
            id="wpc2"
            className="range"
            type="range"
            min={1}
            max={6}
            value={value.wordsPerChunk}
            onChange={(e) => onChange({ wordsPerChunk: Number(e.target.value) })}
          />
        </>
      )}

      {/* ---- suara ---- */}
      <div className="sub">Suara narator</div>
      <div className="chips">
        {voicePresets.map((v) => (
          <button
            key={v.id}
            className={`chip ${value.voice === v.voice ? 'is-on' : ''}`}
            onClick={() => onChange({ voice: v.voice })}
            aria-pressed={value.voice === v.voice}
          >
            {v.label}
          </button>
        ))}
      </div>

      <label className="mini">Kecepatan bicara</label>
      <div className="chips">
        {ratePresets.map((r) => (
          <button
            key={r.id}
            className={`chip ${value.rate === r.rate ? 'is-on' : ''}`}
            onClick={() => onChange({ rate: r.rate })}
            aria-pressed={value.rate === r.rate}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="note">
        Suara & kecepatan dibuat ulang saat render (bukan di preview), lalu durasi tiap scene
        menyesuaikan sendiri.
      </p>
    </section>
  );
};
