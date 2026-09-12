import SettingsSection from './SettingsSection';
import SettingsRow from './SettingsRow';
import ResetSettingsControl from './ResetSettingsControl';

const ResetSection = () => {
  return (
    <SettingsSection title="Reset">
      <SettingsRow
        label="Reset settings to default"
        hint="Restores everything on this page (theme, study defaults, AI instruction presets, etc.) to what a brand-new account starts with. Doesn't touch your questions, progress, or topics."
      >
        <ResetSettingsControl />
      </SettingsRow>
    </SettingsSection>
  );
};

export default ResetSection;
