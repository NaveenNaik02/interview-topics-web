import SettingsSection from './SettingsSection';
import OfflineAccessControl from './OfflineAccessControl';

const OfflineAccessSection = () => {
  return (
    <SettingsSection title="Offline access">
      <div className="settings-row">
        <OfflineAccessControl />
      </div>
    </SettingsSection>
  );
};

export default OfflineAccessSection;
