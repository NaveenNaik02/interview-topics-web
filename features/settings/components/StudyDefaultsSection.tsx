import SettingsSection from './SettingsSection';
import SettingsRow from './SettingsRow';
import SortOrderPicker from './SortOrderPicker';
import RememberFiltersToggle from './RememberFiltersToggle';
import DefaultPriorityPicker from './DefaultPriorityPicker';
import NavigateAfterMoveToggle from './NavigateAfterMoveToggle';

const StudyDefaultsSection = () => {
  return (
    <SettingsSection title="Study defaults">
      <SettingsRow
        label="Default sort order"
        hint="Applied when you open a section for the first time."
      >
        <SortOrderPicker />
      </SettingsRow>
      <SettingsRow
        label="Remember filters across subtopics"
        hint="Keep your priority filter, done/not-done filter, and sort order active as you move between subtopics."
        htmlFor="remember-filters-toggle"
      >
        <RememberFiltersToggle />
      </SettingsRow>
      <SettingsRow
        label="Default priority for new questions"
        hint={
          'Pre-selected priority when you open the Add Question form. Choose "None" to leave it unset.'
        }
      >
        <DefaultPriorityPicker />
      </SettingsRow>
      <SettingsRow
        label="Jump to a question's new section after moving it"
        hint="Off by default — you stay right where you are and just see a confirmation toast. Turn on to be taken to the destination subtopic instead."
        htmlFor="navigate-after-move-toggle"
      >
        <NavigateAfterMoveToggle />
      </SettingsRow>
    </SettingsSection>
  );
};

export default StudyDefaultsSection;
