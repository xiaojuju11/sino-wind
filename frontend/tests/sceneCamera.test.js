import { test } from 'node:test'
import assert from 'node:assert/strict'
import { captureCameraFrame, createCameraSession, cameraErrorMessage } from '../src/utils/sceneCamera.js'

function fakeStream() {
  const track = { stops: 0, stop() { this.stops++ } }
  return { track, getTracks: () => [track] }
}
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
test('camera requests video only, prefers rear initially and releases it before opening front', async () => {
  const rear = fakeStream(), front = fakeStream(), constraints = []
  const session = createCameraSession({ async getUserMedia(c) { constraints.push(c); if (constraints.length === 2) assert.equal(rear.track.stops, 1); return constraints.length === 1 ? rear : front } })
  assert.equal(await session.start(), rear)
  assert.equal(constraints[0].audio, false); assert.deepEqual(constraints[0].video.facingMode, { ideal: 'environment' })
  await session.start({ facing: 'user', exact: true })
  assert.deepEqual(constraints[1].video.facingMode, { exact: 'user' }); assert.equal(session.isCurrent(front), true)
  session.stop(); assert.equal(front.track.stops, 1)
})
test('device selector targets the selected camera without conflicting facing constraints', async () => {
  let constraints
  const session = createCameraSession({ async getUserMedia(c) { constraints = c; return fakeStream() } })
  await session.start({ deviceId: 'front-camera-id' })
  assert.deepEqual(constraints.video.deviceId, { exact: 'front-camera-id' }); assert.equal('facingMode' in constraints.video, false)
  session.stop()
})
test('permission resolving after close cannot attach a camera or leave its tracks live', async () => {
  const pending = deferred(), stream = fakeStream(), session = createCameraSession({ getUserMedia: () => pending.promise })
  const opened = session.start(); session.stop(); pending.resolve(stream)
  assert.equal(await opened, null); assert.equal(stream.track.stops, 1); assert.equal(session.isCurrent(stream), false)
})
test('rapid switching discards late streams and late failures from the previous request', async () => {
  const pending = deferred(), old = fakeStream(), next = fakeStream()
  let calls = 0
  const session = createCameraSession({ getUserMedia: () => ++calls === 1 ? pending.promise : Promise.resolve(next) })
  const first = session.start(); await session.start({ facing: 'user' }); pending.resolve(old)
  assert.equal(await first, null); assert.equal(old.track.stops, 1); assert.equal(next.track.stops, 0)
  session.stop()
  const rejection = deferred(), other = createCameraSession({ getUserMedia: () => rejection.promise })
  const stale = other.start(); other.stop(); rejection.reject(Object.assign(Error('Denied'), { name: 'NotAllowedError' }))
  assert.equal(await stale, null)
})
test('permission rejection is recoverable and no file chooser fallback is used', async () => {
  const stream = fakeStream(); let calls = 0
  const session = createCameraSession({ async getUserMedia() { if (++calls === 1) throw Object.assign(Error(), { name: 'NotAllowedError' }); return stream } })
  await assert.rejects(session.start(), { name: 'NotAllowedError' }); assert.equal(await session.start(), stream); session.stop()
  assert.match(cameraErrorMessage({ name: 'NotAllowedError' }), /权限/)
  assert.match(cameraErrorMessage({}, false), /HTTPS/)
})
test('capture saves the actual full camera frame at bounded resolution as JPEG', async () => {
  const draws = [], blob = new Blob(['frame'], { type: 'image/jpeg' })
  const canvas = { getContext: () => ({ drawImage: (...args) => draws.push(args) }), toBlob(fn, type, quality) { assert.equal(type, 'image/jpeg'); assert.equal(quality, .92); fn(blob) } }
  const video = { readyState: 4, videoWidth: 4000, videoHeight: 3000 }
  assert.equal(await captureCameraFrame(video, () => canvas), blob)
  assert.equal(canvas.width, 2560); assert.equal(canvas.height, 1920)
  assert.deepEqual(draws[0], [video, 0, 0, 2560, 1920])
  await assert.rejects(captureCameraFrame({ readyState: 1, videoWidth: 0, videoHeight: 0 }), /尚未就绪/)
})
