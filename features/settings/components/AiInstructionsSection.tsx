import SettingsSection from './SettingsSection';
import SettingsRow from './SettingsRow';
import AiModelPicker from './AiModelPicker';
import InstructionPresetsEditor from './InstructionPresetsEditor';

const AiInstructionsSection = () => {
  return (
    <SettingsSection title="AI answer instructions">
      <SettingsRow
        label="AI model"
        hint="Used everywhere a question or answer is generated. If a model is rate-limited, switch here and try again."
      >
        <div className="settings-row-control">
          <AiModelPicker />
        </div>
      </SettingsRow>
      <p className="settings-row-hint" style={{ margin: '-6px 0 var(--s-3)' }}>
        Every new question starts from one of two built-in defaults — one for
        regular (text) answers, one for implementation questions that expect
        just a code snippet. Add more versions to keep other formatting
        preferences on hand; you can pull any of them into a single question via
        &quot;Start from a saved version.&quot;
      </p>
      <InstructionPresetsEditor />
    </SettingsSection>
  );
};

export default AiInstructionsSection;
