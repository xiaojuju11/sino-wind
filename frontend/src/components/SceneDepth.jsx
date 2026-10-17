import { useEffect, useRef, useState } from 'react'
import { loadImage } from '../utils/sceneImage'

// Small depth-guided image displacement. This is 2.5D, not unseen geometry reconstruction.
export default function SceneDepth({ scene, active }) {
  const ref = useRef(null), move = useRef(() => {}), [failed, setFailed] = useState(false)
  const { width, height, depth } = scene.analysis
  useEffect(() => {
    if (!active || !depth) return
    let alive = true, frame = 0, gl, program, buffer, textures = [], shaders = []
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const setup = async () => {
      const image = await loadImage(scene.image)
      if (!alive) return
      const canvas = ref.current
      gl = canvas.getContext('webgl', { alpha: false, antialias: false })
      if (!gl) throw new Error('WebGL unavailable')
      canvas.width = Math.min(1280, image.width); canvas.height = Math.round(canvas.width * height / width)
      const shader = (type, source) => { const value = gl.createShader(type); shaders.push(value); gl.shaderSource(value, source); gl.compileShader(value); if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('Shader error'); return value }
      program = gl.createProgram()
      gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 pos; varying vec2 uv; void main(){uv=vec2((pos.x+1.0)*0.5,(1.0-pos.y)*0.5);gl_Position=vec4(pos,0.0,1.0);}'))
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 uv; uniform sampler2D photo; uniform sampler2D distanceMap; uniform vec2 offset; void main(){float d=texture2D(distanceMap,uv).r;vec2 p=clamp(uv+offset*(d-0.5),vec2(0.001),vec2(0.999));gl_FragColor=texture2D(photo,p);}'))
      gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Link error'); gl.useProgram(program)
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
      const pos = gl.getAttribLocation(program, 'pos'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
      const texture = (unit, name) => {
        const value = gl.createTexture(); textures.push(value); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, value)
        for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE)
        for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR)
        gl.uniform1i(gl.getUniformLocation(program, name), unit)
      }
      texture(0, 'photo'); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
      texture(1, 'distanceMap'); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(depth))
      gl.viewport(0, 0, canvas.width, canvas.height)
      const offset = gl.getUniformLocation(program, 'offset')
      let target = [0, 0], current = [0, 0]
      const draw = () => {
        if (!alive) return
        current = current.map((v, i) => v + (target[i] - v) * .18)
        gl.uniform2f(offset, current[0], current[1]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        frame = Math.abs(current[0] - target[0]) + Math.abs(current[1] - target[1]) > .00005 ? requestAnimationFrame(draw) : 0
      }
      move.current = (x, y) => { if (reduced) return; target = [x * .018, y * .018]; if (!frame) frame = requestAnimationFrame(draw) }
      draw()
    }
    setup().catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; cancelAnimationFrame(frame); move.current = () => {}; if (gl) { textures.forEach(t => gl.deleteTexture(t)); shaders.forEach(s => gl.deleteShader(s)); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program) } }
  }, [scene.image, width, height, depth, active])
  return <div className='scene-depth' style={{ aspectRatio: `${width}/${height}` }} onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); move.current((event.clientX - rect.left) / rect.width - .5, (event.clientY - rect.top) / rect.height - .5) }} onPointerLeave={() => move.current(0, 0)}>
    <img src={scene.image} alt='诗境原图' />
    {active && depth && !failed && <canvas ref={ref} aria-label='轻移指尖，观赏景物远近层次' />}
    {failed && <span className='scene-picture__hint'>此设备暂不支持层次展示，已展开原图</span>}
  </div>
}
