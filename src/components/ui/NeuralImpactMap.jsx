import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { cn } from '../../lib/utils'

// ─── UV Region Config ─────────────────────────────────────────────────────────
// Regions now map to the redesigned brain model: dysregulation → regulation arc.
// Each region has UV coordinates for blob placement on the brain mesh.

const UV_REGIONS = {
    motorCortex: {
        blobs: [{ u: 0.50, v: 0.30 }],
        label: 'MOTOR CORTEX',
    },
    prefrontal: {
        blobs: [{ u: 0.50, v: 0.14 }],
        label: 'PREFRONTAL',
    },
    insula: {
        blobs: [{ u: 0.30, v: 0.52 }, { u: 0.70, v: 0.52 }],
        label: 'INSULA',
    },
    anteriorCingulate: {
        blobs: [{ u: 0.50, v: 0.42 }],
        label: 'ANT. CINGULATE',
    },
    dorsolateralPFC: {
        blobs: [{ u: 0.35, v: 0.20 }, { u: 0.65, v: 0.20 }],
        label: 'DLPFC',
    },
    amygdala: {
        blobs: [{ u: 0.32, v: 0.62 }, { u: 0.68, v: 0.62 }],
        label: 'AMYGDALA',
    },
}

const CANVAS_SIZE = 512
const BASE_BLOB_RADIUS = 90

/**
 * @intent Dysregulation color gradient — maps a 0–1 dysregulation value to an RGB color.
 *         0.0 (regulated)    → #1a9fff (cool blue)
 *         0.3                → #39d353 (green)
 *         0.6                → #f0b429 (yellow)
 *         0.8                → #f97316 (orange)
 *         1.0 (dysregulated) → #ef4444 (red)
 */
function dysregulationColor(level) {
    const stops = [
        { t: 0.0, r: 26,  g: 159, b: 255 }, // cool blue
        { t: 0.3, r: 57,  g: 211, b: 83  }, // green
        { t: 0.6, r: 240, g: 180, b: 41  }, // yellow
        { t: 0.8, r: 249, g: 115, b: 22  }, // orange
        { t: 1.0, r: 239, g: 68,  b: 68  }, // red
    ]

    const clamped = Math.max(0, Math.min(1, level))

    // Find the two stops to interpolate between
    let lo = stops[0], hi = stops[stops.length - 1]
    for (let i = 0; i < stops.length - 1; i++) {
        if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
            lo = stops[i]
            hi = stops[i + 1]
            break
        }
    }

    const range = hi.t - lo.t
    const frac = range > 0 ? (clamped - lo.t) / range : 0
    return {
        r: Math.round(lo.r + (hi.r - lo.r) * frac),
        g: Math.round(lo.g + (hi.g - lo.g) * frac),
        b: Math.round(lo.b + (hi.b - lo.b) * frac),
    }
}

/**
 * @intent Returns a CSS hex color string for a dysregulation level (for legend dots).
 */
function dysregulationHex(level) {
    const { r, g, b } = dysregulationColor(level)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * @intent Paints a gaussian heatmap blob on the emissive canvas at UV position.
 *         Color is determined by dysregulation level (red=high, blue=low).
 *         Multiple overlapping blobs create the "glow field" heatmap look.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} u - UV horizontal (0–1)
 * @param {number} v - UV vertical (0–1)
 * @param {number} radius - blob radius in canvas pixels
 * @param {number} intensity - peak brightness 0–1
 * @param {number} dysregLevel - dysregulation level 0–1 (determines color)
 */
function paintEmissiveBlob(ctx, u, v, radius, intensity, dysregLevel) {
    const x = u * CANVAS_SIZE
    const y = (1 - v) * CANVAS_SIZE // flip V: WebGL UV origin is bottom-left

    const { r, g, b } = dysregulationColor(dysregLevel)

    // Brighter core, fading to transparent edge
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0.00, `rgba(${r},${g},${b},${intensity.toFixed(3)})`)
    gradient.addColorStop(0.30, `rgba(${r},${g},${b},${(intensity * 0.75).toFixed(3)})`)
    gradient.addColorStop(0.60, `rgba(${r},${g},${b},${(intensity * 0.40).toFixed(3)})`)
    gradient.addColorStop(0.85, `rgba(${r},${g},${b},${(intensity * 0.12).toFixed(3)})`)
    gradient.addColorStop(1.00, `rgba(${r},${g},${b},0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
}

/**
 * @intent Repaints the emissive canvas with heatmap blobs per region.
 *         Dysregulation level determines both color (red→blue) and spread.
 *         High dysregulation = wide spread, hot color. Low = tight, cool.
 *         Multiple overlapping blobs per region create the gaussian "glow field" look.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ motorCortex: number, prefrontal: number, insula: number, anteriorCingulate: number, dorsolateralPFC: number, amygdala: number }} dysregulation - 0–1 per region
 */
function repaintEmissive(ctx, dysregulation) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Ghost blobs — faint hint shows zone locations even when fully regulated
    for (const region of Object.values(UV_REGIONS)) {
        for (const { u, v } of region.blobs) {
            paintEmissiveBlob(ctx, u, v, BASE_BLOB_RADIUS * 0.6, 0.03, 0.15)
        }
    }

    // Active heatmap blobs — gaussian spread scales with dysregulation
    for (const [regionKey, regionCfg] of Object.entries(UV_REGIONS)) {
        const dysreg = dysregulation[regionKey] ?? 0
        if (dysreg < 0.01) continue // fully regulated, skip

        // More dysregulated = more blobs, wider spread, higher intensity
        const blobCount = Math.round(4 + dysreg * 8)
        const spread = 0.04 + dysreg * 0.10
        const baseIntensity = 0.35 + dysreg * 0.55
        const baseRadius = BASE_BLOB_RADIUS * (0.6 + dysreg * 0.5)

        for (const { u, v } of regionCfg.blobs) {
            // Central blob — strongest
            paintEmissiveBlob(ctx, u, v, baseRadius, baseIntensity, dysreg)

            // Surrounding gaussian scatter blobs
            for (let i = 0; i < blobCount; i++) {
                // Deterministic scatter using golden angle for even distribution
                const angle = i * 2.399 // golden angle in radians
                const dist = spread * (0.3 + (i / blobCount) * 0.7)
                const su = u + Math.cos(angle) * dist
                const sv = v + Math.sin(angle) * dist

                // Clamp to UV space
                if (su < 0 || su > 1 || sv < 0 || sv > 1) continue

                const falloff = 1 - (i / blobCount) * 0.6
                paintEmissiveBlob(
                    ctx, su, sv,
                    baseRadius * falloff * 0.7,
                    baseIntensity * falloff * 0.5,
                    dysreg
                )
            }
        }
    }
}

/**
 * @intent Neural Impact Map — matte white brain with heatmap emissive zones.
 *         Dysregulation model: regions start hot (red) and cool (blue) as streaks grow.
 *         emissiveMap canvas provides both color AND position of the heatmap.
 *         emissive is set to white so the canvas color shows through directly.
 * @param {{ motorCortex: number, prefrontal: number, insula: number, anteriorCingulate: number, dorsolateralPFC: number, amygdala: number }} regionProgress - dysregulation 0–1
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
                        emissive:          new THREE.Color(0xffffff), // white — canvas provides actual color
                        emissiveMap:       emissiveTexture,            // canvas provides color + position
                        emissiveIntensity: 2.0,
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

            {/* Legend — dot color reflects dysregulation level (red=high, blue=low) */}
            <div className="grid grid-cols-3 gap-y-3 gap-x-2 mt-3 px-1">
                {Object.entries(UV_REGIONS).map(([region, cfg]) => {
                    const dysreg = regionProgress?.[region] ?? 0
                    const dotColor = dysregulationHex(dysreg)
                    const regulated = dysreg < 0.15
                    return (
                        <div key={region} className="flex items-center gap-[6px]">
                            <div
                                className="w-[6px] h-[6px] rounded-full shrink-0 transition-all duration-700"
                                style={{
                                    backgroundColor: dotColor,
                                    boxShadow: dysreg > 0.3 ? `0 0 5px ${dotColor}88` : 'none',
                                }}
                            />
                            <div className="flex items-baseline gap-1 min-w-0">
                                <span className={cn(
                                    "font-mono text-[7px] tracking-[1.5px] uppercase truncate transition-colors duration-700",
                                    regulated ? "text-text3" : "text-white"
                                )}>
                                    {cfg.label}
                                </span>
                                <span className="font-mono text-[7px] tracking-[1px] shrink-0 transition-colors duration-700"
                                    style={{ color: dotColor }}
                                >
                                    {Math.round((1 - dysreg) * 100)}%
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
