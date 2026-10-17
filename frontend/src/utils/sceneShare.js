export function downloadSceneFile(file) {
  const url = URL.createObjectURL(file), anchor = document.createElement('a')
  anchor.href = url; anchor.download = file.name
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export async function shareSceneFile(file, { navigator = globalThis.navigator, download = downloadSceneFile } = {}) {
  try {
    if (typeof navigator?.share !== 'function' || !navigator.canShare?.({ files: [file] })) {
      download(file); return 'downloaded'
    }
    await navigator.share({ title: '云山竹简 · 我的诗境', files: [file] })
    return 'shared'
  } catch (error) {
    if (error.name === 'AbortError') return 'cancelled'
    download(file); return 'downloaded'
  }
}
