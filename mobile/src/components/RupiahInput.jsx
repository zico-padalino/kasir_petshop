import { formatRupiahInput, parseRupiah } from '../utils/format'

/**
 * Input uang dengan format Rupiah saat mengetik.
 * value = number, onChange(number)
 */
export default function RupiahInput({
  value,
  onChange,
  className = 'form-control',
  placeholder = '0',
  disabled = false,
  required = false,
  id,
  name,
  autoFocus = false,
}) {
  const display = formatRupiahInput(value)

  return (
    <div className="rupiah-field">
      <span className="rupiah-field-prefix">Rp</span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        className={`rupiah-field-input ${className}`}
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => onChange(parseRupiah(e.target.value))}
        onFocus={(e) => e.target.select()}
      />
    </div>
  )
}
