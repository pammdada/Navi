export function CaptionsToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <label className="navi-toggle"><input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} />Activar subtítulos disponibles</label>;
}
