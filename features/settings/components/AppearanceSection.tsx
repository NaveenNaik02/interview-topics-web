import SettingsSection from './SettingsSection';
import SettingsRow from './SettingsRow';
import ThemePicker from './ThemePicker';

const AppearanceSection = () => {
  return (
    <SettingsSection title="Appearance">
      <SettingsRow
        label="Theme"
        hint="Applies everywhere, including on your next visit."
      >
        <ThemePicker />
      </SettingsRow>
    </SettingsSection>
  );
};

export default AppearanceSection;
