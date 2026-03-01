'use client'

import { useState, useCallback } from 'react'

const inputClass =
  'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface PercentageInputProps {
  name: string
  defaultValue?: number | null
  step?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Input de porcentaje: muestra % al usuario, envía decimal al FormData.
 * El usuario escribe "5" para 5%, se envía 0.05.
 * defaultValue recibe el decimal (0.05) y muestra 5.
 */
export function PercentageInput({
  name,
  defaultValue,
  step = '0.01',
  placeholder = '0.00',
  className,
  disabled,
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (defaultValue == null) return ''
    return String(Number((defaultValue * 100).toFixed(4)))
  })

  const decimalValue = displayValue
    ? Number((parseFloat(displayValue) / 100).toFixed(6))
    : 0

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value)
  }, [])

  return (
    <div className="relative">
      <input
        type="number"
        step={step}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className ?? inputClass}
        disabled={disabled}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
        %
      </span>
      <input type="hidden" name={name} value={decimalValue} />
    </div>
  )
}
