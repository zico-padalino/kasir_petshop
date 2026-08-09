const KEY = 'pet_shop_att_unlock'
const KEY_LEGACY = 'kasir_dzikra_att_unlock'
const TTL_MS = 30 * 60 * 1000 // 30 menit

export function unlockAttendanceSession() {
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
    sessionStorage.removeItem(KEY_LEGACY)
  } catch { /* ignore */ }
}

export function isAttendanceUnlocked() {
  try {
    const raw = sessionStorage.getItem(KEY) || sessionStorage.getItem(KEY_LEGACY)
    if (!raw) return false
    const at = Number(raw)
    if (!at || Date.now() - at > TTL_MS) {
      sessionStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY_LEGACY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function clearAttendanceSession() {
  try {
    sessionStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY_LEGACY)
  } catch { /* ignore */ }
}
