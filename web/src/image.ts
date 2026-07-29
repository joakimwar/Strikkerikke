/**
 * Skalerer ned og komprimerer et bilde så det ikke tar unødig mye plass.
 * Port av downscaledImageData i Theme.swift (1200 px, JPEG-kvalitet 0.7).
 */
export async function downscaleImage(file: Blob, maxDimension = 1200): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const maxSide = Math.max(bitmap.width, bitmap.height)
    const scale = maxSide > maxDimension ? maxDimension / maxSide : 1

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.7),
    )
    return blob ?? file
  } catch {
    // Klarer vi ikke å skalere, lagrer vi originalen.
    return file
  }
}
