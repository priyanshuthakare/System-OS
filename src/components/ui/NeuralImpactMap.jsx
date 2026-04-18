import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { cn } from '../../lib/utils'

// ─── UV Region Config ─────────────────────────────────────────────────────────
const DEV_UV_DEBUG = false

const UV_REGIONS = {
    motorCortex: {
        blobs: [{ u: 0.50, v: 0.30 }],
        label: 'MOTOR CORTEX',
    },
    prefrontal: {
        blobs: [{ u: 0.50, v: 0.14 }],
        label: 'PREFRONTAL',
    },
    limbic: {
        blobs: [{ u: 0.50, v: 0.58 }],
        label: 'LIMBIC',
    },
    cerebellum: {
        blobs: [{ u: 0.50, v: 0.82 }],
        label: 'CEREBELLUM',
    },
    tempora: {
        blobs: [{ u: 0.18, v: 0.48 }, { u: 0.82, v: 0.48 }],
        label: 'TEMPORA',
    },
    amygdala: {
        blobs: [{ u: 0.32, v: 0.62 }, { u: 0.68, v: 0.62 }],
        label: 'AMYGDALA',
    },
}

const CANVAS_SIZE = 512
const BASE_BLOB_RADIUS = 90

/**
 * @intent Paints a white radial blob on the emissive mask canvas at UV position.
 *         White pixel = full orange-red emissive shown; black = no emissive.
 *         The emissive color is defined on the material; canvas only masks WHERE.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} u - UV horizontal (0–1)
 * @param {number} v - UV vertical (0–1)
 * @param {number} radius - blob radius in canvas pixels
 * @param {number} intensity - peak brightness 0–1
 */
function paintEmissiveBlob(ctx, u, v, radius, intensity) {
    const x = u * CANVAS_SIZE
    const y = (1 - v) * CANVAS_SIZE // flip V: WebGL UV origin is bottom-left

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0.00, `rgba(255,255,220,${intensity.toFixed(3)})`)
    gradient.addColorStop(0.25, `rgba(255,180, 60,${(intensity * 0.85).toFixed(3)})`)
    gradient.addColorStop(0.55, `rgba(200, 60,  0,${(intensity * 0.55).toFixed(3)})`)
    gradient.addColorStop(0.85, `rgba(120, 10,  0,${(intensity * 0.20).toFixed(3)})`)
    gradient.addColorStop(1.00, `rgba(  0,  0,  0,0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
}

function paintDebugGrid(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
        const pos = (i / 10) * CANVAS_SIZE
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, CANVAS_SIZE); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(CANVAS_SIZE, pos); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = '10px monospace'
        ctx.fillText((i / 10).toFixed(1), pos + 2, 14)
        if (i > 0) ctx.fillText((i / 10).toFixed(1), 2, pos - 2)
    }
}

/**
 * @intent Repaints the emissive mask: black base + faint ghost rings + active blobs.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ motorCortex: number, prefrontal: number, limbic: number, cerebellum: number, tempora: number, amygdala: number }} progress
 */
function repaintEmissive(ctx, progress) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Ghost blobs — 4% warm hint shows zone locations at rest
    for (const region of Object.values(UV_REGIONS)) {
        for (const { u, v } of region.blobs) {
            paintEmissiveBlob(ctx, u, v, BASE_BLOB_RADIUS * 0.75, 0.04)
        }
    }

    // Active blobs — intensity/radius scale with completion
    for (const [cat, region] of Object.entries(UV_REGIONS)) {
        const ratio = progress[cat] || 0
        if (ratio <= 0) continue
        const intensity = 0.50 + ratio * 0.50
        const radius    = BASE_BLOB_RADIUS * (0.80 + ratio * 0.20)
        for (const { u, v } of region.blobs) {
            paintEmissiveBlob(ctx, u, v, radius, intensity)
        }
    }

    if (DEV_UV_DEBUG) paintDebugGrid(ctx)
}

/**
 * @intent Neural Impact Map — matte white brain with orange-red emissive activation zones.
 *         Architecture: emissiveMap canvas masks WHERE the emissive shows on the mesh.
 *         animId is stored on stateRef every frame so cleanup reliably cancels it.
 * @param {{ motorCortex: number, prefrontal: number, limbic: number, cerebellum: number, tempora: number, amygdala: number }} regionProgress
 */
export default function NeuralImpactMap({ regionProgress }) {
    const mountRef   = useRef(null)
    const stateRef   = useRef({})
    const [loaded, setLoaded] = useState(false)
    const [error,  setError]  = useState(false)

    // ── Scene Initialization (once) ────────────────────────────────────────────
    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return

        // Mark this effect instance active — guards against React Strict Mode double-fire
        let active = true

        const W = mount.clientWidth  || 350
        const H = mount.clientHeight || 190

        // ── Emissive mask canvas
        const emissiveCanvas = document.createElement('canvas')
        emissiveCanvas.width  = CANVAS_SIZE
        emissiveCanvas.height = CANVAS_SIZE
        const emissiveCtx = emissiveCanvas.getContext('2d')
        emissiveCtx.fillStyle = '#000000'
        emissiveCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

        const emissiveTexture = new THREE.CanvasTexture(emissiveCanvas)
        emissiveTexture.colorSpace = THREE.SRGBColorSpace

        stateRef.current.emissiveCtx     = emissiveCtx
        stateRef.current.emissiveTexture = emissiveTexture

        // ── Three.js core
        const scene  = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
        camera.position.set(0, 0.1, 2.6)

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(W, H)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x000000, 0)
        mount.appendChild(renderer.domElement)

        // ── Lighting — HemisphereLight (GI-like) + strong key for AO-style sulci depth
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.6)
        scene.add(hemiLight)

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.8)
        keyLight.position.set(0.4, 3.5, 2.8)
        scene.add(keyLight)

        const fillLight = new THREE.DirectionalLight(0xeef0ff, 0.22)
        fillLight.position.set(-2.5, 0, 0.5)
        scene.add(fillLight)

        // ── Load brain.glb
        const loader = new GLTFLoader()
        loader.load(
            '/brain.glb',
            (gltf) => {
                if (!active) return // abort if this effect instance was cleaned up

                const model = gltf.scene
                model.traverse((child) => {
                    if (!child.isMesh) return
                    child.material = new THREE.MeshStandardMaterial({
                        color:             0xf5f5f5,  // matte white
                        roughness:         0.95,       // high roughness — no gloss
                        metalness:         0.0,        // low reflectance
                        emissive:          new THREE.Color(0xff4400), // orange-red activation
                        emissiveMap:       emissiveTexture,            // canvas masks WHERE it shows
                        emissiveIntensity: 1.8,
                    })
                })

                const box    = new THREE.Box3().setFromObject(model)
                const center = box.getCenter(new THREE.Vector3())
                const size   = box.getSize(new THREE.Vector3())
                model.position.sub(center)
                model.scale.setScalar(1.8 / Math.max(size.x, size.y, size.z))

                scene.add(model)
                stateRef.current.model = model
                setLoaded(true)
            },
            undefined,
            (err) => {
                if (!active) return
                console.error('[NeuralImpactMap] Failed to load brain.glb:', err)
                setError(true)
            }
        )

        // ── Animation loop — animId updated every frame so cleanup always cancels correctly
        const animate = () => {
            stateRef.current.animId = requestAnimationFrame(animate) // update on every tick
            if (stateRef.current.model) {
                stateRef.current.model.rotation.y += 0.004
            }
            renderer.render(scene, camera)
        }
        animate()

        // ── Resize observer
        const ro = new ResizeObserver(() => {
            if (!mount) return
            const nw = mount.clientWidth
            const nh = mount.clientHeight
            camera.aspect = nw / nh
            camera.updateProjectionMatrix()
            renderer.setSize(nw, nh)
        })
        ro.observe(mount)

        return () => {
            active = false // prevents stale callbacks from firing
            cancelAnimationFrame(stateRef.current.animId)
            ro.disconnect()

            // Clear state so the next effect instance starts fresh
            stateRef.current.emissiveCtx     = null
            stateRef.current.emissiveTexture  = null
            stateRef.current.model           = null

            renderer.dispose()
            if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
        }
    }, [])

    // ── Emissive Repaint (on every progress change) ─────────────────────────────
    useEffect(() => {
        const { emissiveCtx, emissiveTexture } = stateRef.current
        if (!emissiveCtx || !emissiveTexture) return
        repaintEmissive(emissiveCtx, regionProgress)
        emissiveTexture.needsUpdate = true
    }, [regionProgress])

    return (
        <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-[9px] tracking-[3px] uppercase text-text3">
                    // neural impact map
                </div>
                {DEV_UV_DEBUG && (
                    <div className="font-mono text-[7px] px-2 py-[2px] border border-amber-500/50 text-amber-500/70 tracking-[1px]">
                        UV DEBUG
                    </div>
                )}
            </div>

            <div className="relative bg-black border border-border overflow-hidden" style={{ height: '190px' }}>
                <div ref={mountRef} className="w-full h-full" />

                {!loaded && !error && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="font-mono text-[9px] text-zinc-500 tracking-[2px] animate-pulse">
                            LOADING NEURAL MAP...
                        </div>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="font-mono text-[9px] text-zinc-500 tracking-[2px]">
                            MODEL UNAVAILABLE
                        </div>
                    </div>
                )}
            </div>

            {/* Legend — dot color matches emissive orange-red */}
            <div className="flex items-center justify-between mt-2 px-1">
                {Object.entries(UV_REGIONS).map(([region, cfg]) => {
                    const progress = regionProgress?.[region] ?? 0
                    const isActive = progress > 0
                    const dotColor = isActive ? '#ff4400' : '#ff440033'
                    return (
                        <div key={region} className="flex items-center gap-[6px]">
                            <div
                                className="w-[6px] h-[6px] rounded-full transition-all duration-700"
                                style={{
                                    backgroundColor: dotColor,
                                    boxShadow: isActive ? '0 0 5px #ff440088' : 'none',
                                }}
                            />
                            <span className={cn(
                                "font-mono text-[7px] tracking-[1.5px] uppercase transition-colors duration-700",
                                isActive ? "text-white" : "text-text3"
                            )}>
                                {cfg.label}
                            </span>
                            <span className={cn(
                                "font-mono text-[7px] tracking-[1px] transition-colors duration-700",
                                isActive ? "text-orange-400" : "text-text3/30"
                            )}>
                                {Math.round(progress * 100)}%
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
