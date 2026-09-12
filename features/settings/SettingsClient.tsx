import AppearanceSection from './components/AppearanceSection';
import StudyDefaultsSection from './components/StudyDefaultsSection';
import AiInstructionsSection from './components/AiInstructionsSection';
import OfflineAccessSection from './components/OfflineAccessSection';
import ResetSection from './components/ResetSection';

// Server component: everything here (headings, labels, hint copy) renders
// as static HTML. Each row's actual control is a small 'use client' island
// (ThemePicker, SortOrderPicker, ...) — only those ship JS to the browser,
// and each reads its own value from the store, which the app layout already
// seeded with the saved settings row.
const SettingsClient = () => {
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

      <AppearanceSection />
      <StudyDefaultsSection />
      <AiInstructionsSection />
      <OfflineAccessSection />
      <ResetSection />
    </div>
  );
};

export default SettingsClient;
