import type { ServiceStatus } from "../../../shared/types";

type ServiceControlProps = {
  status: ServiceStatus;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function ServiceControl({ status, disabled, onStart, onStop }: ServiceControlProps) {
  const isOn = status.state === "available" || status.state === "starting";
  const description: Record<ServiceStatus["state"], string> = {
    available: "Ollama is running. Select to stop it.",
    starting: "Ollama is starting.",
    stopped: "Ollama is stopped. Select to start it.",
    unavailable: "Ollama is unavailable. Select to try again.",
  };

  return (
    <button
      type="button"
      className={`service-switch service-switch--${status.state}`}
      role="switch"
      aria-checked={isOn}
      aria-label={description[status.state]}
      title={description[status.state]}
      disabled={disabled || status.state === "starting"}
      onClick={isOn ? onStop : onStart}
    >
      <span className="service-switch-label">Ollama</span>
      <span className="service-switch-thumb" aria-hidden="true" />
    </button>
  );
}
