interface PatientSelectProps {
  value: string | null | undefined
  onChange: (patientId: string | null) => void
  patients: { id: string; name: string }[]
  required?: boolean
}

export default function PatientSelect({ value, onChange, patients, required }: PatientSelectProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="form-input"
      required={required}
    >
      <option value="">— Seleccionar paciente —</option>
      {patients.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}