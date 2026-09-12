import type { ReactNode } from 'react';

const SettingsRow = ({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint: string;
  htmlFor?: string;
  children: ReactNode;
}) => {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        {htmlFor ? (
          <label className="settings-row-label" htmlFor={htmlFor}>
            {label}
          </label>
        ) : (
          <div className="settings-row-label">{label}</div>
        )}
        <div className="settings-row-hint">{hint}</div>
      </div>
      {children}
    </div>
  );
};

export default SettingsRow;
