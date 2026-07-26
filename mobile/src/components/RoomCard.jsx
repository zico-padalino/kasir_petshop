import { rupiah } from '../utils/format'

const THEME = {
  anjing: {
    emoji: '🐶',
    label: 'Anjing',
    gradient: 'linear-gradient(145deg, #ffe8c2 0%, #f5b041 55%, #d68910 100%)',
    accent: '#d68910',
    pattern: '🦴',
  },
  kucing: {
    emoji: '🐱',
    label: 'Kucing',
    gradient: 'linear-gradient(145deg, #f3e5f5 0%, #ce93d8 55%, #8e24aa 100%)',
    accent: '#8e24aa',
    pattern: '🧶',
  },
  semua: {
    emoji: '🐾',
    label: 'Semua',
    gradient: 'linear-gradient(145deg, #e0f7fa 0%, #4dd0e1 55%, #00838f 100%)',
    accent: '#00838f',
    pattern: '⭐',
  },
}

export function roomTheme(petType) {
  return THEME[petType] || THEME.semua
}

/** Visual "foto" kamar bergaya ilustrasi hotel */
export function RoomCover({ petType = 'semua', code, occupied, compact = false }) {
  const t = roomTheme(petType)
  return (
    <div
      className={`room-cover ${compact ? 'compact' : ''} ${occupied ? 'occupied' : ''}`}
      style={{ background: t.gradient }}
    >
      <div className="room-cover-deco">
        <span className="deco-a">{t.pattern}</span>
        <span className="deco-b">{t.pattern}</span>
        <span className="deco-c">{t.emoji}</span>
      </div>
      <div className="room-cover-main">
        <div className="room-cover-icon">{t.emoji}</div>
        <div className="room-cover-bed">🛏</div>
      </div>
      <div className="room-cover-badge">{code}</div>
      {occupied && <div className="room-cover-status">TERISI</div>}
    </div>
  )
}

/** Kartu kamar untuk galeri / pilih kamar */
export function RoomCard({
  room,
  selected = false,
  selectable = false,
  onSelect,
  onEdit,
  onDelete,
  showActions = false,
}) {
  const t = roomTheme(room.pet_type)
  const occupied = Boolean(room.is_occupied)
  const inactive = !room.is_active

  return (
    <div
      className={`room-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''} ${inactive ? 'inactive' : ''}`}
      onClick={selectable && !inactive ? () => onSelect?.(room) : undefined}
      role={selectable ? 'button' : undefined}
    >
      <RoomCover petType={room.pet_type} code={room.code} occupied={occupied && !inactive} />
      <div className="room-card-body">
        <div className="room-card-top">
          <h3 className="room-card-title">{room.name}</h3>
          <span className="room-type-chip" style={{ background: `${t.accent}18`, color: t.accent }}>
            {t.emoji} {t.label}
          </span>
        </div>
        {room.description && <p className="room-card-desc">{room.description}</p>}
        <div className="room-card-meta">
          <span><i className="bi bi-people"></i> Kap. {room.capacity}</span>
          <span className="room-price">{rupiah(room.price_per_day)}<small>/hari</small></span>
        </div>
        <div className="room-card-footer">
          {!room.is_active ? (
            <span className="badge badge-danger">Nonaktif</span>
          ) : occupied ? (
            <span className="badge badge-warning">Sedang terisi</span>
          ) : (
            <span className="badge badge-success">Tersedia</span>
          )}
          {selected && <span className="badge badge-info">Dipilih</span>}
          {showActions && (
            <div className="room-card-actions" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => onEdit?.(room)} title="Edit">
                <i className="bi bi-pencil"></i>
              </button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => onDelete?.(room.id)} title="Hapus">
                <i className="bi bi-trash"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
