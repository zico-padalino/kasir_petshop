const KEY = 'kasir_dzikra_att_unlock'
const TTL_MS = 30 * 60 * 1000 // 30 menit

export function unlockAttendanceSession() {
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch { /* ignore */ }
}

export function isAttendanceUnlocked() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return false
    const at = Number(raw)
    if (!at || Date.now() - at > TTL_MS) {
      sessionStorage.removeItem(KEY)
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
  } catch { /* ignore */ }
}
