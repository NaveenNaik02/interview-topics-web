import type { UserSettings } from '../db';
import ThemePicker from './ThemePicker';
import SortOrderPicker from './SortOrderPicker';
import RememberFiltersToggle from './RememberFiltersToggle';
import DefaultPriorityPicker from './DefaultPriorityPicker';
import NavigateAfterMoveToggle from './NavigateAfterMoveToggle';
import InstructionPresetsEditor from './InstructionPresetsEditor';
import OfflineAccessControl from './OfflineAccessControl';
import ResetSettingsControl from './ResetSettingsControl';

// Server component: everything here (headings, labels, hint copy) renders
// as static HTML. Each row's actual control is a small 'use client' island
// (ThemePicker, SortOrderPicker, ...) — only those ship JS to the browser.
export default function SettingsClient({
  settings: serverSettings,
}: {
  settings: UserSettings;
}) {
  return (
    <div className="content-wrapper settings-view">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Preferences</div>
        <h1 className="subtopic-title">Settings</h1>
        <p className="build-lede">
          Defaults applied across the app — nothing here affects your saved
          progress or priorities.
        </p>
      </div>

      <section className="settings-section">
        <h2 className="settings-section-title">Appearance</h2>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Theme</div>
            <div className="settings-row-hint">
              Applies everywhere, including on your next visit.
            </div>
          </div>
          <ThemePicker />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Study defaults</h2>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Default sort order</div>
            <div className="settings-row-hint">
              Applied when you open a section for the first time.
            </div>
          </div>
          <SortOrderPicker initial={serverSettings.default_sort} />
        </div>
        <div className="settings-row">
          <div className="settings-row-text">
            <label
              className="settings-row-label"
              htmlFor="remember-filters-toggle"
            >
              Remember filters across subtopics
            </label>
            <div className="settings-row-hint">
              Keep your priority filter, done/not-done filter, and sort order
              active as you move between subtopics.
            </div>
          </div>
          <RememberFiltersToggle initial={serverSettings.remember_filters} />
        </div>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">
              Default priority for new questions
            </div>
            <div className="settings-row-hint">
              Pre-selected priority when you open the Add Question form. Choose
              &quot;None&quot; to leave it unset.
            </div>
          </div>
          <DefaultPriorityPicker initial={serverSettings.default_priority} />
        </div>
        <div className="settings-row">
          <div className="settings-row-text">
            <label
              className="settings-row-label"
              htmlFor="navigate-after-move-toggle"
            >
              Jump to a question&apos;s new section after moving it
            </label>
            <div className="settings-row-hint">
              Off by default — you stay right where you are and just see a
              confirmation toast. Turn on to be taken to the destination
              subtopic instead.
            </div>
          </div>
          <NavigateAfterMoveToggle
            initial={serverSettings.navigate_after_move}
          />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">AI answer instructions</h2>
        <p
          className="settings-row-hint"
          style={{ margin: '-6px 0 var(--s-3)' }}
        >
          Every new question starts from one of two built-in defaults — one for
          regular (text) answers, one for implementation questions that expect
          just a code snippet. Add more versions to keep other formatting
          preferences on hand; you can pull any of them into a single question
          via &quot;Start from a saved version.&quot;
        </p>
        <InstructionPresetsEditor />
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Offline access</h2>
        <div className="settings-row">
          <OfflineAccessControl />
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section-title">Reset</h2>
        <div className="settings-row">
          <div className="settings-row-text">
            <div className="settings-row-label">Reset settings to default</div>
            <div className="settings-row-hint">
              Restores everything on this page (theme, study defaults, AI
              instruction presets, etc.) to what a brand-new account starts
              with. Doesn&apos;t touch your questions, progress, or topics.
            </div>
          </div>
          <ResetSettingsControl />
        </div>
      </section>
    </div>
  );
}
