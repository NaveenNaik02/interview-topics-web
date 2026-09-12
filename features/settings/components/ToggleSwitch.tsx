'use client';

const ToggleSwitch = ({
  on,
  onChange,
  id,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) => {
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
  );
};

export default ToggleSwitch;
