import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from '@zxing/library'

const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.CODABAR,
]

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gagal memuat foto'))
    }
    img.src = url
  })
}

function drawVariants(img) {
  const canvases = []
  const maxW = 1600
  const scale = Math.min(1, maxW / img.width)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  function makeCanvas(drawFn) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    drawFn(ctx, c)
    return c
  }

  // full
  canvases.push(makeCanvas((ctx) => {
    ctx.drawImage(img, 0, 0, w, h)
  }))

  // center crop ~70%
  canvases.push(makeCanvas((ctx, c) => {
    const cw = Math.round(img.width * 0.7)
    const ch = Math.round(img.height * 0.45)
    const sx = Math.round((img.width - cw) / 2)
    const sy = Math.round((img.height - ch) / 2)
    c.width = Math.round(cw * scale)
    c.height = Math.round(ch * scale)
    ctx.drawImage(img, sx, sy, cw, ch, 0, 0, c.width, c.height)
  }))

  // grayscale + contrast
  canvases.push(makeCanvas((ctx) => {
    ctx.drawImage(img, 0, 0, w, h)
    const imageData = ctx.getImageData(0, 0, w, h)
    const d = imageData.data
    const contrast = 1.45
    const intercept = 128 * (1 - contrast)
    for (let i = 0; i < d.length; i += 4) {
      let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      g = contrast * g + intercept
      g = Math.max(0, Math.min(255, g))
      d[i] = d[i + 1] = d[i + 2] = g
    }
    ctx.putImageData(imageData, 0, 0)
  }))

  // horizontal strip (barcode biasanya mendatar di tengah)
  canvases.push(makeCanvas((ctx, c) => {
    const ch = Math.round(img.height * 0.35)
    const sy = Math.round((img.height - ch) / 2)
    c.width = w
    c.height = Math.round(ch * scale)
    ctx.drawImage(img, 0, sy, img.width, ch, 0, 0, c.width, c.height)
  }))

  return canvases
}

function decodeCanvasZXing(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const { width, height } = canvas
  if (width < 20 || height < 20) return null
  const { data } = ctx.getImageData(0, 0, width, height)
  const luminances = new Uint8ClampedArray(width * height)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    luminances[j] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0
  }
  const source = new RGBLuminanceSource(luminances, width, height)
  const bitmap = new BinaryBitmap(new HybridBinarizer(source))
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS)
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new MultiFormatReader()
  reader.setHints(hints)
  try {
    const result = reader.decode(bitmap)
    return result?.getText?.() || null
  } catch {
    try {
      // invert attempt
      const inv = new Uint8ClampedArray(luminances.length)
      for (let i = 0; i < luminances.length; i++) inv[i] = 255 - luminances[i]
      const invSource = new RGBLuminanceSource(inv, width, height)
      const invBitmap = new BinaryBitmap(new HybridBinarizer(invSource))
      const result = reader.decode(invBitmap)
      return result?.getText?.() || null
    } catch {
      return null
    }
  } finally {
    reader.reset()
  }
}

async function decodeNative(fileOrCanvas) {
  if (typeof window.BarcodeDetector !== 'function') return null
  try {
    const detector = new window.BarcodeDetector({
      formats: [
        'ean_13', 'ean_8', 'upc_a', 'upc_e',
        'code_128', 'code_39', 'code_93', 'codabar',
        'itf', 'qr_code', 'data_matrix',
      ],
    })
    let input = fileOrCanvas
    if (fileOrCanvas instanceof HTMLCanvasElement) {
      input = await createImageBitmap(fileOrCanvas)
    }
    const codes = await detector.detect(input)
    if (input.close) input.close()
    return codes?.[0]?.rawValue || null
  } catch {
    return null
  }
}

/**
 * Baca barcode dari File foto — multi-engine + multi-preprocess.
 * @returns {Promise<string|null>}
 */
export async function decodeBarcodeFromFile(file) {
  if (!file) return null

  // native langsung dari file
  const nativeDirect = await decodeNative(file)
  if (nativeDirect) return String(nativeDirect).trim()

  const img = await loadImage(file)
  const variants = drawVariants(img)

  for (const canvas of variants) {
    const native = await decodeNative(canvas)
    if (native) return String(native).trim()

    const zxing = decodeCanvasZXing(canvas)
    if (zxing) return String(zxing).trim()
  }

  // html5-qrcode last resort
  try {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
    const regionId = 'file-scan-region'
    let el = document.getElementById(regionId)
    if (!el) {
      el = document.createElement('div')
      el.id = regionId
      el.style.cssText = 'width:1px;height:1px;overflow:hidden;position:fixed;left:-9999px'
      document.body.appendChild(el)
    }
    const scanner = new Html5Qrcode(regionId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    })
    try {
      const decoded = await scanner.scanFile(file, true)
      if (decoded) return String(decoded).trim()
    } finally {
      try { scanner.clear() } catch { /* ignore */ }
    }
  } catch {
    // ignore
  }

  return null
}
