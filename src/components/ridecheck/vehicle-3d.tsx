'use client'

/**
 * Vehicle3D — minimalist 3D vehicle viewer (react-three-fiber).
 *
 * Built entirely from primitives (box / cylinder / torus / sphere / RoundedBox),
 * flat matte colors, no textures, no HDR environment, no external models.
 * The parent must mount this via next/dynamic with ssr:false (WebGL).
 *
 * Rotation is handled by OrbitControls (auto-rotate + user drag 360°),
 * so the vehicle group itself is never rotated — only a tiny idle bob.
 */

import { useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, RoundedBox } from '@react-three/drei'
import type { Group } from 'three'

/* ------------------------------- palette ------------------------------- */

const BODY = '#1e1c1a' // matte black (scooter body panels)
const BODY_HI = '#2a2724' // lighter charcoal — layered panel accents
const BRONZE = '#a8703d' // signature bronze wheel rims, shock spring
const BRONZE_HI = '#b0794a' // bronze accent stripe, brake caliper
const BLACK = '#18181b' // tires, seat, grips, headlight fascia
const SILVER = '#d4d4d8' // rims (car default), exhaust end cap
const DARK_METAL = '#3f3f46' // fork, shock, axle carrier, car cabin
const ENGINE = '#27272a' // engine block, swingarm
const DISC = '#9ca3af' // brake disc
const SCREEN = '#1a1a1a' // windscreen tint
const CAR_BODY = '#52525b' // charcoal gray (car body)
const HEADLIGHT = '#fffbe6' // car headlights
const TAILLIGHT = '#dc2626' // tail lights
const LED = '#e8f4ff' // scooter LED strips

type Vec3 = [number, number, number]

/* ----------------------------- shared parts ----------------------------- */

interface WheelProps {
  position: Vec3
  /** outer tire radius */
  radius: number
  /** tire tube thickness */
  tube: number
  /** rim disc radius */
  rim: number
  /** rim disc width along the axle (Z) */
  width?: number
  /** rim color — car keeps silver, scooter passes bronze */
  rimColor?: string
}

/** Torus tire + inner cylinder disc rim, axle along Z, touching y=0 when position.y = radius. */
function Wheel({ position, radius, tube, rim, width = 0.1, rimColor = SILVER }: WheelProps) {
  return (
    <group position={position}>
      {/* tire */}
      <mesh>
        <torusGeometry args={[radius - tube, tube, 12, 36]} />
        <meshStandardMaterial color={BLACK} roughness={0.9} />
      </mesh>
      {/* rim disc (cylinder axis rotated onto Z = wheel axle) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rim, rim, width, 24]} />
        <meshStandardMaterial color={rimColor} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

interface LightDotProps {
  position: Vec3
  color: string
  intensity: number
  radius?: number
}

function LightDot({ position, color, intensity, radius = 0.06 }: LightDotProps) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        roughness={0.35}
      />
    </mesh>
  )
}

/* ------------------------------- scooter ------------------------------- */

interface LightStripProps {
  position: Vec3
  /** box size [x, y, z] */
  size: Vec3
  rotation?: Vec3
  color?: string
  intensity?: number
}

/** Thin emissive bar — LED headlight strips & tail light strip. */
function LightStrip({
  position,
  size,
  rotation = [0, 0, 0],
  color = LED,
  intensity = 2,
}: LightStripProps) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.3} />
    </mesh>
  )
}

/**
 * Scooter (Honda Vario 160 style) from primitives.
 * Matte black layered body, signature bronze rims, X-shaped LED headlight.
 * Natural units ≈ meters: length ~1.9, height ~1.3, wheel radius 0.26.
 * Faces -X (front), ground at y=0.
 */
function Scooter() {
  return (
    <group>
      {/* wheels — signature bronze rims */}
      <Wheel position={[-0.66, 0.26, 0]} radius={0.26} tube={0.07} rim={0.14} width={0.09} rimColor={BRONZE} />
      <Wheel position={[0.64, 0.26, 0]} radius={0.26} tube={0.07} rim={0.14} width={0.11} rimColor={BRONZE} />

      {/* front disc brake: steel disc + bronze caliper (right side) */}
      <mesh position={[-0.66, 0.26, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.016, 32]} />
        <meshStandardMaterial color={DISC} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-0.52, 0.35, 0.08]}>
        <boxGeometry args={[0.1, 0.1, 0.05]} />
        <meshStandardMaterial color={BRONZE_HI} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* axle carrier bridging the fork legs */}
      <mesh position={[-0.66, 0.27, 0]}>
        <boxGeometry args={[0.07, 0.07, 0.19]} />
        <meshStandardMaterial color={DARK_METAL} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* telescopic fork: twin dark metal tubes */}
      <mesh position={[-0.6, 0.64, 0.08]} rotation={[0, 0, -0.23]}>
        <cylinderGeometry args={[0.03, 0.033, 0.7, 12]} />
        <meshStandardMaterial color={DARK_METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.6, 0.64, -0.08]} rotation={[0, 0, -0.23]}>
        <cylinderGeometry args={[0.03, 0.033, 0.7, 12]} />
        <meshStandardMaterial color={DARK_METAL} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* front + rear fenders hugging the wheel tops */}
      <mesh position={[-0.66, 0.26, 0]}>
        <torusGeometry args={[0.31, 0.04, 10, 24, Math.PI]} />
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0.64, 0.26, 0]}>
        <torusGeometry args={[0.31, 0.04, 10, 24, Math.PI]} />
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </mesh>

      {/* floorboard */}
      <RoundedBox args={[0.82, 0.05, 0.44]} radius={0.02} smoothness={3} position={[-0.04, 0.24, 0]}>
        <meshStandardMaterial color={BODY_HI} roughness={0.6} metalness={0.15} />
      </RoundedBox>

      {/* lower leg shield (leans back towards the rider) */}
      <RoundedBox
        args={[0.36, 0.5, 0.42]}
        radius={0.05}
        smoothness={3}
        position={[-0.48, 0.5, 0]}
        rotation={[0, 0, -0.1]}
      >
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* upper front apron — layered panel */}
      <RoundedBox
        args={[0.22, 0.4, 0.36]}
        radius={0.04}
        smoothness={3}
        position={[-0.56, 0.9, 0]}
        rotation={[0, 0, -0.06]}
      >
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* dark headlight fascia recessed into the apron */}
      <mesh position={[-0.675, 0.93, 0]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[0.015, 0.28, 0.3]} />
        <meshStandardMaterial color={BLACK} roughness={0.6} />
      </mesh>

      {/* X-shaped LED headlight: two diagonal strips + lower DRL bar + projector dot */}
      <LightStrip position={[-0.69, 0.95, 0]} size={[0.02, 0.24, 0.028]} rotation={[Math.PI / 4, 0, 0]} />
      <LightStrip position={[-0.69, 0.95, 0]} size={[0.02, 0.24, 0.028]} rotation={[-Math.PI / 4, 0, 0]} />
      <LightStrip position={[-0.69, 0.868, 0]} size={[0.02, 0.022, 0.22]} intensity={1.4} />
      <LightDot position={[-0.7, 0.925, 0]} color={LED} intensity={2} radius={0.033} />

      {/* sharp visor brow above the headlight */}
      <RoundedBox
        args={[0.28, 0.12, 0.3]}
        radius={0.03}
        smoothness={3}
        position={[-0.6, 1.13, 0]}
        rotation={[0, 0, 0.22]}
      >
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* dark translucent windscreen */}
      <mesh position={[-0.54, 1.25, 0]} rotation={[0, 0, -0.12]}>
        <boxGeometry args={[0.03, 0.16, 0.22]} />
        <meshStandardMaterial color={SCREEN} transparent opacity={0.55} roughness={0.2} metalness={0.1} />
      </mesh>

      {/* handlebar: stem + T-bar + grips */}
      <mesh position={[-0.53, 1.05, 0]} rotation={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.026, 0.026, 0.2, 12]} />
        <meshStandardMaterial color={BLACK} roughness={0.7} />
      </mesh>
      <mesh position={[-0.52, 1.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.54, 12]} />
        <meshStandardMaterial color={BLACK} roughness={0.7} />
      </mesh>
      <mesh position={[-0.52, 1.14, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.13, 12]} />
        <meshStandardMaterial color={BLACK} roughness={0.9} />
      </mesh>
      <mesh position={[-0.52, 1.14, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.033, 0.033, 0.13, 12]} />
        <meshStandardMaterial color={BLACK} roughness={0.9} />
      </mesh>

      {/* mirrors on thin stalks angling outward */}
      <mesh position={[-0.51, 1.21, 0.335]} rotation={[0.45, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.15, 8]} />
        <meshStandardMaterial color={BLACK} roughness={0.6} />
      </mesh>
      <mesh position={[-0.505, 1.28, 0.375]} scale={[1, 0.65, 0.7]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>
      <mesh position={[-0.51, 1.21, -0.335]} rotation={[-0.45, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.15, 8]} />
        <meshStandardMaterial color={BLACK} roughness={0.6} />
      </mesh>
      <mesh position={[-0.505, 1.28, -0.375]} scale={[1, 0.65, 0.7]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={BLACK} roughness={0.5} />
      </mesh>

      {/* rear side panel (mid body) */}
      <RoundedBox
        args={[0.62, 0.4, 0.44]}
        radius={0.06}
        smoothness={3}
        position={[0.12, 0.55, 0]}
        rotation={[0, 0, -0.1]}
      >
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* subtle bronze accent stripes on both side panels */}
      <mesh position={[0.17, 0.6, 0.225]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.42, 0.025, 0.015]} />
        <meshStandardMaterial color={BRONZE_HI} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0.17, 0.6, -0.225]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.42, 0.025, 0.015]} />
        <meshStandardMaterial color={BRONZE_HI} metalness={0.55} roughness={0.35} />
      </mesh>

      {/* seat bucket (upper rear panel) */}
      <RoundedBox
        args={[0.58, 0.26, 0.4]}
        radius={0.06}
        smoothness={3}
        position={[0.42, 0.8, 0]}
        rotation={[0, 0, -0.08]}
      >
        <meshStandardMaterial color={BODY_HI} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* sculpted two-level seat: rider seat + higher pillion step */}
      <RoundedBox args={[0.44, 0.1, 0.34]} radius={0.04} smoothness={3} position={[0.16, 0.9, 0]} rotation={[0, 0, -0.03]}>
        <meshStandardMaterial color={BLACK} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.3, 0.13, 0.32]} radius={0.04} smoothness={3} position={[0.5, 0.97, 0]} rotation={[0, 0, -0.06]}>
        <meshStandardMaterial color={BLACK} roughness={0.8} />
      </RoundedBox>

      {/* body-coloured grab rail behind the pillion step */}
      <RoundedBox args={[0.22, 0.05, 0.24]} radius={0.02} smoothness={3} position={[0.72, 0.93, 0]} rotation={[0, 0, -0.15]}>
        <meshStandardMaterial color={BODY_HI} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* sharp pointed tail */}
      <RoundedBox
        args={[0.36, 0.16, 0.34]}
        radius={0.03}
        smoothness={3}
        position={[0.74, 0.86, 0]}
        rotation={[0, 0, -0.18]}
      >
        <meshStandardMaterial color={BODY} roughness={0.55} metalness={0.2} />
      </RoundedBox>

      {/* wide red tail light strip across the rear */}
      <LightStrip
        position={[0.91, 0.82, 0]}
        size={[0.025, 0.05, 0.26]}
        rotation={[0, 0, -0.18]}
        color={TAILLIGHT}
        intensity={1.2}
      />

      {/* engine block + twin swingarms */}
      <mesh position={[0.3, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.26]} />
        <meshStandardMaterial color={ENGINE} roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0.5, 0.28, 0.09]}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color={ENGINE} roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0.5, 0.28, -0.09]}>
        <boxGeometry args={[0.3, 0.05, 0.05]} />
        <meshStandardMaterial color={ENGINE} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* rear shock absorber with bronze spring hint */}
      <mesh position={[0.5, 0.4, 0.14]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.026, 0.026, 0.2, 10]} />
        <meshStandardMaterial color={DARK_METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.5, 0.4, 0.14]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.042, 0.042, 0.09, 10]} />
        <meshStandardMaterial color={BRONZE} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* black exhaust muffler (right side) with brushed-metal end cap */}
      <mesh position={[0.52, 0.26, 0.17]} rotation={[0, 0, -Math.PI / 2 + 0.06]}>
        <cylinderGeometry args={[0.058, 0.058, 0.42, 16]} />
        <meshStandardMaterial color={BLACK} roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[0.735, 0.275, 0.17]} rotation={[0, 0, -Math.PI / 2 + 0.06]}>
        <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
        <meshStandardMaterial color={SILVER} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* --------------------------------- car --------------------------------- */

const CAR_WHEELS: Vec3[] = [
  [-1.15, 0.3, 0.66],
  [-1.15, 0.3, -0.66],
  [1.15, 0.3, 0.66],
  [1.15, 0.3, -0.66],
]

/**
 * Compact hatchback from primitives.
 * Natural units ≈ meters: length ~3.6, height ~1.6, wheel radius 0.3.
 * Faces -X (front), ground at y=0.
 */
function Car() {
  return (
    <group>
      {/* body */}
      <RoundedBox args={[3.5, 0.78, 1.6]} radius={0.24} smoothness={4} position={[0, 0.64, 0]}>
        <meshStandardMaterial color={CAR_BODY} roughness={0.45} metalness={0.25} />
      </RoundedBox>

      {/* cabin / greenhouse */}
      <RoundedBox
        args={[1.85, 0.62, 1.4]}
        radius={0.2}
        smoothness={4}
        position={[0.12, 1.28, 0]}
        rotation={[0, 0, -0.05]}
      >
        <meshStandardMaterial color={DARK_METAL} roughness={0.5} metalness={0.2} />
      </RoundedBox>

      {/* dark underbody skirt */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[3.3, 0.18, 1.46]} />
        <meshStandardMaterial color={DARK_METAL} roughness={0.8} />
      </mesh>

      {/* wheels */}
      {CAR_WHEELS.map((pos) => (
        <Wheel key={pos.join('-')} position={pos} radius={0.3} tube={0.08} rim={0.14} width={0.1} />
      ))}

      {/* lights: white front, red rear */}
      <LightDot position={[-1.73, 0.75, 0.5]} color={HEADLIGHT} intensity={0.9} radius={0.07} />
      <LightDot position={[-1.73, 0.75, -0.5]} color={HEADLIGHT} intensity={0.9} radius={0.07} />
      <LightDot position={[1.73, 0.78, 0.5]} color={TAILLIGHT} intensity={0.45} radius={0.07} />
      <LightDot position={[1.73, 0.78, -0.5]} color={TAILLIGHT} intensity={0.45} radius={0.07} />
    </group>
  )
}

/* ------------------------------ scene bits ------------------------------ */

/** Subtle idle bob (amplitude 0.02, world units) — rotation is left to OrbitControls. */
function BobGroup({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    const g = ref.current
    if (!g) return
    g.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.02
  })
  return <group ref={ref}>{children}</group>
}

/* --------------------------------- main --------------------------------- */

export default function Vehicle3D({
  type,
  className,
}: {
  type: 'motor' | 'mobil' | string
  className?: string
}) {
  const isCar = type === 'mobil'
  const scale = isCar ? 1.55 : 2.55
  const targetY = isCar ? 1.2 : 1.35

  return (
    <Canvas
      className={className || 'h-full w-full'}
      dpr={[1, 2]}
      frameloop="always"
      flat
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [4.4, 2.6, 5.6], fov: 40, near: 0.1, far: 100 }}
    >
      {/* flat studio lighting — no environment / HDR */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 8, 4]} intensity={1.0} />
      <directionalLight position={[-6, 5, -4]} intensity={0.45} />
      <pointLight position={[0, 3, 2.5]} intensity={6} />

      <BobGroup>
        <group scale={scale}>{isCar ? <Car /> : <Scooter />}</group>
      </BobGroup>

      {/* soft grounding */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.35}
        scale={12}
        blur={2.2}
        far={5}
        color="#000000"
      />

      {/* slow auto-spin + user 360° horizontal drag */}
      <OrbitControls
        makeDefault
        target={[0, targetY, 0]}
        autoRotate
        autoRotateSpeed={1.2}
        enableZoom={false}
        enablePan={false}
        enableDamping
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  )
}
