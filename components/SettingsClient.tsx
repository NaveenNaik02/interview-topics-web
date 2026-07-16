'use client'

import { Sun, Moon, BookOpen, Download, X, Plus, Trash2 } from 'lucide-react'
import { useTheme, Theme } from '@/lib/ThemeContext'
import { useProgress } from '@/lib/ProgressContext'
import { useInstructionPresets } from '@/lib/instructionPresets'
import type { SortMode } from './FilterSortToolbar'

const THEME_ORDER: Theme[] = ['light', 'sepia', 'dark']
const THEME_META: Record<Theme, { label: string; icon: React.ReactNode }> = {
  light: { label: 'Light', icon: <Sun size={13} /> },
  sepia: { label: 'Sepia', icon: <BookOpen size={13} /> },
  dark:  { label: 'Dark',  icon: <Moon size={13} /> },
}

const SORT_OPTIONS: { k: SortMode; label: string }[] = [
  { k: 'manual', label: 'Manual (curriculum order)' },
  { k: 'high',   label: 'High priority first' },
  { k: 'low',    label: 'Low priority first' },
]

function ToggleSwitch({ on, onChange, id }: { on: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      className={`toggle-switch ${on ? 'on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="toggle-knob" />
    </button>
  )
}

function InstructionPresetsEditor() {
  const { presets, activeId, setActiveId, addPreset, updatePreset, deletePreset } = useInstructionPresets()

  return (
    <div className="preset-list">
      {presets.map(p => (
        <div key={p.id} className={`preset-card ${p.id === activeId ? 'active' : ''}`}>
          <div className="preset-card-head">
            <button
              type="button"
              className={`preset-active-radio ${p.id === activeId ? 'on' : ''}`}
              aria-label={p.id === activeId ? `${p.name} is the active preset` : `Make ${p.name} the active preset`}
              aria-pressed={p.id === activeId}
              onClick={() => setActiveId(p.id)}
            />
            <input
              className="preset-name-input"
              value={p.name}
              onChange={(e) => updatePreset(p.id, { name: e.target.value, text: p.text })}
            />
            {presets.length > 1 && (
              <button
                type="button"
                className="preset-delete-btn"
                onClick={() => deletePreset(p.id)}
                aria-label={`Delete ${p.name}`}
                title="Delete preset"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <textarea
            className="preset-text-input"
            value={p.text}
            onChange={(e) => updatePreset(p.id, { name: p.name, text: e.target.value })}
            placeholder={'e.g.\n- Keep answers to 3 short bullets max\n- Always include one runnable code example\n- Bold the key term being defined'}
          />
        </div>
      ))}
      <button
        type="button"
        className="preset-add-btn"
        onClick={() => { const p = addPreset({ name: 'New preset', text: '' }); setActiveId(p.id) }}
      >
        <Plus size={13} /> New preset
      </button>
    </div>
  )
}

export default function SettingsClient() {
  const { theme, setTheme } = useTheme()
  const {
    defaultSort, rememberFilters,
    setDefaultSort, setRememberFilters, setThemeSetting,
    isOnline, offlineModeEnabled, isCaching, cachingProgress,
    cachedAt, stats, enableOfflineMode, disableOfflineMode,
  } = useProgress()

  const pct = cachingProgress
    ? Math.round((cachingProgress.done / cachingProgress.total) * 100)
    : 0

  function relativeTime(isoStr: string | null) {
    if (!isoStr) return 'a while ago'
    const diff = Date.now() - new Date(isoStr).getTime()
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    return `${Math.floor(diff / 3_600_000)}h ago`
  }

  const handleThemeChange = (t: Theme) => {
    setTheme(t)
    setThemeSetting(t)
  }

  return (
    <div className="content-wrapper settings-view">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Preferences</div>
        <h1 className="subtopic-title">Settings</h1>
        <p className="build-lede">Defaults applied across the app — nothing here affects your saved progress or priorities.</p>
      </div>

      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Theme</div>
            <div className="settings-row-hint">Applies everywhere, including on your next visit.</div>
          </div>
          <div className="theme-pill-group">
            {THEME_ORDER.map(k => (
              <button
                key={k}
                className={`theme-pill ${theme === k ? 'on' : ''}`}
                onClick={() => handleThemeChange(k)}
                aria-pressed={theme === k}
              >
                {THEME_META[k].icon}
                {THEME_META[k].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Study defaults</h2>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Default sort order</div>
            <div className="settings-row-hint">Applied when you open a section for the first time.</div>
          </div>
          <div className="sort-pill-group">
            {SORT_OPTIONS.map(o => (
              <button
                key={o.k}
                className={`sort-pill ${defaultSort === o.k ? 'on' : ''}`}
                onClick={() => setDefaultSort(o.k)}
                aria-pressed={defaultSort === o.k}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row-text">
            <label className="settings-row-label" htmlFor="remember-filters-toggle">
              Remember filters across subtopics
            </label>
            <div className="settings-row-hint">
              Keep your priority filter, done/not-done filter, and sort order active as you move between subtopics.
            </div>
          </div>
          <ToggleSwitch id="remember-filters-toggle" on={rememberFilters} onChange={setRememberFilters} />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Answer generation</h2>
        <div className="settings-row" style={{ alignItems: 'flex-start' }}>
          <div className="settings-row-text">
            <div className="settings-row-label">Instruction presets</div>
            <div className="settings-row-hint">
              Named formatting instructions the AI follows when generating or reformatting answers in Add Question. The active one is what new questions start with — you can still override it per-question there.
            </div>
          </div>
        </div>
        <InstructionPresetsEditor />
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Offline access</h2>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Download for offline use</div>
            <div className="settings-row-hint">
              {isCaching
                ? `Downloading… ${pct}%`
                : offlineModeEnabled
                ? `Saved on this device · updated ${relativeTime(cachedAt)}`
                : `Save all ${stats.total} questions, answers and code snippets so you can study without a connection.`}
            </div>
          </div>
          {isCaching ? (
            <div className="settings-download-progress">
              <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
            </div>
          ) : (
            <button
              className={`settings-offline-btn${offlineModeEnabled ? ' danger' : ''}`}
              onClick={offlineModeEnabled ? disableOfflineMode : enableOfflineMode}
              disabled={!isOnline && !offlineModeEnabled}
            >
              {offlineModeEnabled
                ? <><X size={13} /> Remove download</>
                : <><Download size={13} /> {isOnline ? 'Download' : 'Connect to download'}</>}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
