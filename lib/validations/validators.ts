/**
 * Validaciones puras compartidas client/server para el módulo de contratos.
 * No dependen de ningún framework ni runtime específico.
 */

// ── DNI ──────────────────────────────────────────────────────────────────────

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function getDNIExpectedLetter(num: number): string {
  return DNI_LETTERS[num % 23]
}

export function isValidDNI(dni: string): boolean {
  if (!dni) return false
  const cleaned = dni.toUpperCase().trim()
  const match = cleaned.match(/^(\d{8})([A-Z])$/)
  if (!match) return false
  const [, numStr, letter] = match
  return getDNIExpectedLetter(parseInt(numStr, 10)) === letter
}

// ── CIF ──────────────────────────────────────────────────────────────────────

export function isValidCIF(cif: string): boolean {
  if (!cif) return false
  const cleaned = cif.toUpperCase().trim()
  const match = cleaned.match(/^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([A-J0-9])$/)
  if (!match) return false

  const [, letraInicial, digits, control] = match
  const nums = digits.split('').map(Number)

  let sumEven = 0
  let sumOdd = 0

  for (let i = 0; i < nums.length; i++) {
    if (i % 2 === 0) {
      // Posiciones impares (1-indexed): multiplicar por 2
      const doubled = nums[i] * 2
      sumOdd += doubled >= 10 ? doubled - 9 : doubled
    } else {
      sumEven += nums[i]
    }
  }

  const total = sumEven + sumOdd
  const digitControl = (10 - (total % 10)) % 10
  const letterControl = String.fromCharCode(64 + digitControl) // A=1, B=2...

  // Según letra inicial, el control es numérico o alfabético
  const needsLetter = 'KLMNPQRSW'.includes(letraInicial)
  const needsDigit = 'ABEH'.includes(letraInicial)

  if (needsLetter) {
    return control === letterControl
  }
  if (needsDigit) {
    return control === String(digitControl)
  }
  // Resto: acepta ambos
  return control === String(digitControl) || control === letterControl
}

// ── IBAN ─────────────────────────────────────────────────────────────────────

export function isValidIBAN(iban: string): boolean {
  if (!iban) return false
  const cleaned = iban.toUpperCase().replace(/\s/g, '')
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false

  // Mover los 4 primeros caracteres al final
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)

  // Convertir letras a números (A=10, B=11, ..., Z=35)
  let numStr = ''
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numStr += (char.charCodeAt(0) - 55).toString()
    } else {
      numStr += char
    }
  }

  // Módulo 97 (procesando en chunks para evitar overflow)
  let remainder = 0
  for (let i = 0; i < numStr.length; i += 7) {
    const chunk = numStr.slice(i, i + 7)
    remainder = parseInt(String(remainder) + chunk, 10) % 97
  }

  return remainder === 1
}

// ── CUPS ─────────────────────────────────────────────────────────────────────

export function isValidCUPS(cups: string): boolean {
  if (!cups) return false
  const cleaned = cups.toUpperCase().trim()
  // 20-22 caracteres, empieza por ES
  return /^ES\d{16}[A-Z0-9]{0,4}$/.test(cleaned) && cleaned.length >= 20 && cleaned.length <= 22
}

// ── Teléfono español ─────────────────────────────────────────────────────────

export function isValidPhone(phone: string): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/\s/g, '')
  return /^[6789]\d{8}$/.test(cleaned)
}

// ── Email ────────────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
