import React from 'react';
import timeline from '@video/generated/timeline.json';
import { content } from '@video/config/content';
import { fieldsByKind, sceneTitle, type Field } from './editor-schema';

/**
 * Editor teks per scene.
 *
 * Perubahan langsung terlihat di player (props diperbarui saat mengetik),
 * dan dikirim apa adanya ke render sebagai `overrides` — jadi yang kamu
 * lihat di preview persis sama dengan yang keluar di MP4.
 *
 * Catatan: hanya TEKS yang bisa diubah. Durasi tiap scene tetap mengikuti
 * panjang narasi audio (timeline.json), karena audionya sudah direkam.
 */

interface Props {
  values: Record<string, Record<string, string>>;
  onChange: (sceneId: string, key: string, value: string) => void;
  onReset: () => void;
  dirty: boolean;
  onJump: (frame: number) => void;
  activeSceneId: string | null;
}

const FieldInput: React.FC<{
  f: Field;
  value: string;
  onChange: (v: string) => void;
}> = ({ f, value, onChange }) => {
  const id = `f-${f.key}-${Math.random().toString(36).slice(2, 7)}`;
  const multiline = f.kind === 'list' || f.kind === 'iconlist' || f.kind === 'textarea';

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {f.label}
        {f.max && (
          <span className={`counter ${value.length > f.max ? 'over' : ''}`}>
            {value.length}/{f.max}
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          id={id}
          className="input"
          rows={f.kind === 'list' ? 7 : 3}
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          className="input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {f.hint && <p className="field-hint">{f.hint}</p>}
    </div>
  );
};

export const EditorPanel: React.FC<Props> = ({
  values,
  onChange,
  onReset,
  dirty,
  onJump,
  activeSceneId,
}) => {
  const [open, setOpen] = React.useState<string | null>(content.scenes[0]?.id ?? null);

  // ikut berpindah saat player masuk scene lain
  React.useEffect(() => {
    if (activeSceneId) setOpen(activeSceneId);
  }, [activeSceneId]);

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-label" style={{ margin: 0 }}>
          Edit teks video
        </span>
        {dirty && (
          <button className="linkbtn" onClick={onReset}>
            reset
          </button>
        )}
      </div>

      <div className="accordion">
        {content.scenes.map((scene, i) => {
          const fields = fieldsByKind[scene.kind] ?? [];
          if (!fields.length) return null;
          const isOpen = open === scene.id;
          const tl = timeline.scenes.find((t) => t.id === scene.id);

          return (
            <div key={scene.id} className={`acc-item ${isOpen ? 'is-open' : ''}`}>
              <button
                className="acc-head"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpen(isOpen ? null : scene.id);
                  if (tl) onJump(tl.from);
                }}
              >
                <span className="acc-num">{i + 1}</span>
                <span className="acc-title">{sceneTitle[scene.kind] ?? scene.kind}</span>
                <span className="acc-chevron" aria-hidden>
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen && (
                <div className="acc-body">
                  {fields.map((f) => (
                    <FieldInput
                      key={f.key}
                      f={f}
                      value={values[scene.id]?.[f.key] ?? ''}
                      onChange={(v) => onChange(scene.id, f.key, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="note">
        Perubahan langsung tampil di preview dan ikut saat render. Durasi tiap scene mengikuti
        narasi audio, jadi teks yang terlalu panjang bisa terpotong.
      </p>
    </section>
  );
};
