import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Maximize2,
  Minimize2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  Zap,
  DollarSign,
  X,
  Box,
  RefreshCw,
  Rotate3d,
} from 'lucide-react';
import { formatINR } from '../engine/calculator';
import { CounterfactualOutcome, DriverAnalysisResult, IndustryMiniatureNode, IndustryProfile, MiniatureNodeKind } from '../types';
import { getIndustryProfile } from '../config/industries';
import { useTheme } from '../context/ThemeContext';

/**
 * World-space height above each node's base where its label chip is anchored,
 * so the overlay text hovers ABOVE the model instead of covering it.
 */
const NODE_LABEL_OFFSET: Record<MiniatureNodeKind, number> = {
  cash: 6.6,       // tank top ~5.2
  supplier: 5.2,   // chimney top ~4.0
  inventory: 4.8,  // box stack top ~3.5
  operations: 4.8, // gears/beacon top ~3.3
  customer: 6.0,   // tower top 4.5
  service: 4.2,    // sphere top ~2.9
  recurring: 4.2,  // core top ~2.6
  expense: 4.6,    // pipe/rim top ~3.4
  generic: 4.2,    // cube top 2.8
};

interface DigitalTwin3DProps {
  currentCash: number;
  minCash: number;
  cashFloor: number;
  hasBreach: boolean;
  earliestBreachDate: string | null;
  supplierDelayDays: number;
  onSupplierDelayChange: (days: number) => void;
  counterfactuals?: CounterfactualOutcome[];
  activeCounterfactual?: string | null;
  onSelectCounterfactual?: (id: string | null) => void;
  onOpenDriverAnalysis?: () => void;
  driverAnalysis?: DriverAnalysisResult;
  industryProfile?: IndustryProfile;
}

/**
 * Industry-aware 3D Business Miniature Model.
 *
 * The node graph, connections and shock chain come from the selected
 * IndustryProfile.miniatureModel. Three.js ONLY visualizes values produced by
 * the deterministic financial engine — it never calculates financial numbers.
 */
export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  currentCash,
  minCash,
  cashFloor,
  hasBreach,
  earliestBreachDate,
  supplierDelayDays,
  onSupplierDelayChange,
  driverAnalysis,
  industryProfile: industryProfileProp,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const industryProfile: IndustryProfile = industryProfileProp || getIndustryProfile('manufacturing');
  const model = industryProfile.miniatureModel;
  const nodes = model.nodes;
  const edges = model.edges;
  const shockChain = model.shockChain;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isSimulatingPulse, setIsSimulatingPulse] = useState(false);
  const [pulseStep, setPulseStep] = useState<number>(-1); // index into shockChain
  const [autoRotate, setAutoRotate] = useState(false);

  // Mirrors of the pulse state for the requestAnimationFrame loop (which cannot
  // read React state from the effect closure without stale values).
  const isSimulatingPulseRef = useRef(false);
  const pulseStepRef = useRef(-1);
  const kindByIdRef = useRef<Record<string, MiniatureNodeKind>>({});

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const nodeMeshesRef = useRef<Record<string, THREE.Group | undefined>>({});
  const nodePositionsRef = useRef<Record<string, THREE.Vector3>>({});
  const liquidMeshRef = useRef<THREE.Mesh | null>(null);
  const liquidMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const nodeCardEls = useRef<Record<string, HTMLDivElement | null>>({});

  const isDelayed = supplierDelayDays > 0;
  const scenarioMinCash = minCash;
  const scenarioBreachDay = earliestBreachDate ? earliestBreachDate.replace(/^[^\d]*/, '') || earliestBreachDate : hasBreach ? '19' : 'NONE';
  const scenarioLiquidityGap = scenarioMinCash < cashFloor ? cashFloor - scenarioMinCash : 0;

  // Derived values from the engine's driver analysis (never computed here)
  const topOutflow = driverAnalysis?.topOutflows?.[0];
  const topInflow = driverAnalysis?.topInflows?.[0];

  const stopPulse = () => {
    setIsSimulatingPulse(false);
    isSimulatingPulseRef.current = false;
    setPulseStep(-1);
    pulseStepRef.current = -1;
  };

  const triggerCausalSimulation = () => {
    setIsSimulatingPulse(true);
    isSimulatingPulseRef.current = true;
    setPulseStep(0);
    pulseStepRef.current = 0;
    const steps = shockChain.map((_, i) => i);
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setPulseStep(step);
        pulseStepRef.current = step;
        if (idx === steps.length - 1) {
          setTimeout(stopPulse, 1200);
        }
      }, (idx + 1) * 450);
    });
  };

  // ── Per-kind 3D node geometry builders ────────────────────────────────────
  const buildNodeGeometry = (kind: MiniatureNodeKind, colorHex: number, accentHex: number): THREE.Group => {
    const group = new THREE.Group();

    if (kind === 'cash') {
      // Dominant liquid reservoir (shared by every industry)
      const tankGlassGeo = new THREE.CylinderGeometry(2.2, 2.2, 5.0, 32, 1, true);
      const tankGlassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transmission: 0.9, opacity: 0.85, transparent: true, roughness: 0.1, ior: 1.4,
      });
      const tankGlass = new THREE.Mesh(tankGlassGeo, tankGlassMat);
      tankGlass.position.y = 2.5;
      group.add(tankGlass);

      const rimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
      const baseRimGeo = new THREE.CylinderGeometry(2.4, 2.5, 0.4, 32);
      const baseRim = new THREE.Mesh(baseRimGeo, rimMat);
      baseRim.position.y = 0.2;
      group.add(baseRim);
      const topCap = new THREE.Mesh(baseRimGeo, rimMat);
      topCap.position.y = 5.0;
      group.add(topCap);

      // Safety floor ring
      const floorRingGeo = new THREE.TorusGeometry(2.22, 0.06, 16, 64);
      const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
      floorRing.rotation.x = Math.PI / 2;
      floorRing.position.y = 2.0;
      group.add(floorRing);

      const liquidGeo = new THREE.CylinderGeometry(2.05, 2.05, 3.2, 32);
      const liquidMat = new THREE.MeshStandardMaterial({
        color: 0x10b981, emissive: 0x047857, emissiveIntensity: 0.6,
        roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85,
      });
      const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
      liquidMesh.position.y = 1.6;
      group.add(liquidMesh);
      liquidMeshRef.current = liquidMesh;
      liquidMaterialRef.current = liquidMat;
      return group;
    }

    if (kind === 'supplier') {
      // Factory building
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.3 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 3), baseMat);
      base.position.y = 1.1;
      base.castShadow = true;
      group.add(base);
      for (let i = -1; i <= 1; i += 2) {
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1, 4), new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.3 }));
        roof.rotation.y = Math.PI / 4;
        roof.position.set(i * 0.9, 2.7, 0);
        group.add(roof);
      }
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 16), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 }));
      chimney.position.set(1.2, 2.5, -0.8);
      chimney.castShadow = true;
      group.add(chimney);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 16), new THREE.MeshBasicMaterial({ color: accentHex }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(1.2, 3.5, -0.8);
      group.add(ring);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.2, 32), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 }));
      pad.position.y = 0.1;
      group.add(pad);
      return group;
    }

    if (kind === 'inventory') {
      // Pallet + box stack
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 3.6), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 }));
      pallet.position.y = 0.125;
      pallet.castShadow = true;
      group.add(pallet);
      const boxGeo = new THREE.BoxGeometry(1.0, 0.9, 1.0);
      const boxMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.2 });
      const boxBorderMat = new THREE.LineBasicMaterial({ color: accentHex });
      // Create a 3x3 base with 2 to 3 layers
      for (let x = -1.05; x <= 1.05; x += 1.05) {
        for (let z = -1.05; z <= 1.05; z += 1.05) {
          // Randomize stack height between 2 and 3 layers so it's not a perfect cube
          const topY = Math.random() > 0.5 ? 2.6 : 1.6;
          for (let y = 0.7; y <= topY; y += 0.95) {
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.set(x, y, z);
            box.castShadow = true;
            box.receiveShadow = true;
            group.add(box);
            const edgesGeo = new THREE.EdgesGeometry(boxGeo);
            const line = new THREE.LineSegments(edgesGeo, boxBorderMat);
            box.add(line);
          }
        }
      }
      return group;
    }

    if (kind === 'operations') {
      // Machine station
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 }));
      body.position.y = 1.3;
      body.castShadow = true;
      group.add(body);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 1.4), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 }));
      belt.position.set(0, 1.5, 0);
      group.add(belt);
      const gearGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12);
      const gearMat = new THREE.MeshStandardMaterial({ color: accentHex, metalness: 0.8 });
      // Gears spin around their OWN axis (nested group keeps the spin axis clean)
      const gear1 = new THREE.Mesh(gearGeo, gearMat);
      gear1.userData.spin = { axis: 'y', speed: 2.4 };
      const gearSpin1 = new THREE.Group();
      gearSpin1.rotation.x = Math.PI / 2;
      gearSpin1.position.set(-0.8, 2.9, 0);
      gearSpin1.add(gear1);
      group.add(gearSpin1);
      const gear2 = new THREE.Mesh(gearGeo, gearMat);
      gear2.userData.spin = { axis: 'y', speed: -1.9 };
      const gearSpin2 = new THREE.Group();
      gearSpin2.rotation.x = Math.PI / 2;
      gearSpin2.position.set(0.8, 2.9, 0);
      gearSpin2.add(gear2);
      group.add(gearSpin2);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16), new THREE.MeshBasicMaterial({ color: accentHex }));
      beacon.position.set(1.3, 2.9, -0.8);
      group.add(beacon);
      return group;
    }

    if (kind === 'customer') {
      // Office tower
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.5, 2.8), new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.5, roughness: 0.2 }));
      tower.position.y = 2.25;
      tower.castShadow = true;
      group.add(tower);
      const windowMat = new THREE.MeshBasicMaterial({ color: accentHex });
      for (let y = 1.0; y <= 3.8; y += 0.8) {
        for (let x = -1.0; x <= 1.0; x += 0.9) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), windowMat);
          win.position.set(x, y, 1.41);
          group.add(win);
        }
      }
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.8), new THREE.MeshStandardMaterial({ color: 0x059669 }));
      canopy.position.set(0, 0.6, 1.6);
      group.add(canopy);
      return group;
    }

    if (kind === 'service') {
      // Podium with sphere (generic service node)
      const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.0, 24), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4 }));
      podium.position.y = 0.5;
      podium.castShadow = true;
      group.add(podium);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 24), new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.5, roughness: 0.3 }));
      sphere.position.y = 1.9;
      sphere.castShadow = true;
      group.add(sphere);
      return group;
    }

    if (kind === 'recurring') {
      // Recurring revenue ring with core
      const ringMat = new THREE.MeshStandardMaterial({ color: accentHex, metalness: 0.6, roughness: 0.3 });
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 12, 32), ringMat);
      ring1.rotation.x = Math.PI / 2;
      ring1.position.y = 1.3;
      group.add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.16, 12, 32), ringMat);
      ring2.rotation.y = Math.PI / 2;
      ring2.position.y = 1.3;
      group.add(ring2);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.6, 16), new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.5 }));
      core.position.y = 1.3;
      core.castShadow = true;
      group.add(core);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5 }));
      pad.position.y = 0.1;
      group.add(pad);
      return group;
    }

    if (kind === 'expense') {
      // Outflow block with pipe
      const block = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6, metalness: 0.2 }));
      block.position.y = 1.1;
      block.castShadow = true;
      group.add(block);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 }));
      pipe.position.set(0, 2.6, 0);
      pipe.castShadow = true;
      group.add(pipe);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 8, 16), new THREE.MeshBasicMaterial({ color: accentHex }));
      rim.rotation.x = Math.PI / 2;
      rim.position.set(0, 2.7, 0);
      group.add(rim);
      return group;
    }

    // generic
    const cube = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.8, 2.8), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.3 }));
    cube.position.y = 1.4;
    cube.castShadow = true;
    cube.receiveShadow = true;
    group.add(cube);
    const edgeLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 2.8, 2.8)), new THREE.LineBasicMaterial({ color: accentHex }));
    cube.add(edgeLine);
    return group;
  };

  // ── Three.js scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const bgHex = isLight ? 0xfafafa : 0x0a0a0a;
    const gridMain = isLight ? 0xd4d4d8 : 0x333333;
    const gridSec = isLight ? 0xeaeaea : 0x1f1f1f;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.007 : 0.012);
    sceneRef.current = scene;

    const aspect = width > 0 && height > 0 ? width / height : 1.6;

    // ── Layout: nodes on a gentle arc so the whole chain fits on screen ────
    const spacing = nodes.length > 5 ? 7.5 : 7;
    const positions: Record<string, THREE.Vector3> = {};
    const nodeGroups: Record<string, THREE.Group> = {};
    const nodeSpinSpeeds: Record<string, number> = {};
    const satellites: { mesh: THREE.Mesh; radius: number; speed: number; phase: number; y: number; center: THREE.Vector3 }[] = [];

    const halfAngle = Math.min(0.5, Math.max(0.25, (nodes.length - 1) * 0.085));
    const arcRadius = nodes.length > 1 ? ((nodes.length - 1) * spacing) / (2 * Math.sin(halfAngle)) : 0;

    nodes.forEach((node, i) => {
      const t = nodes.length > 1 ? i / (nodes.length - 1) : 0;
      const theta = (t - 0.5) * 2 * halfAngle;
      // Ends of the chain sit slightly farther from the camera (gentle arc)
      const pos = new THREE.Vector3(
        arcRadius * Math.sin(theta),
        0,
        -arcRadius * (1 - Math.cos(theta))
      );
      positions[node.id] = pos;
      kindByIdRef.current[node.id] = node.kind;

      const hexColor = parseInt(node.color.replace('#', ''), 16);
      const group = buildNodeGeometry(node.kind, hexColor, hexColor);
      group.position.copy(pos);
      group.rotation.y = Math.PI / 8; // Angle nodes dynamically to the camera
      scene.add(group);
      nodeGroups[node.id] = group;

      // Orbiting coins make the cash reservoir visibly "flow" (a spinning
      // cylinder alone looks static)
      if (node.kind === 'cash') {
        const coinGeo = new THREE.SphereGeometry(0.26, 12, 12);
        const coinMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24, metalness: 0.9, roughness: 0.25, emissive: 0xf59e0b, emissiveIntensity: 0.55,
        });
        for (let k = 0; k < 6; k++) {
          const coin = new THREE.Mesh(coinGeo, coinMat);
          scene.add(coin);
          satellites.push({
            mesh: coin,
            radius: 3.6,
            speed: 0.5 + k * 0.12,
            phase: (k / 6) * Math.PI * 2,
            y: 1.8 + (k % 3) * 0.8,
            center: pos,
          });
        }
      }
    });

    nodeMeshesRef.current = nodeGroups;
    nodePositionsRef.current = positions;

    // ── Camera framing: fit the ENTIRE chain (including cash) in view ───────
    const allPos = Object.values(positions);
    const halfWidth = Math.max(...allPos.map((p) => Math.abs(p.x)), 8);
    const depthExtent = Math.max(...allPos.map((p) => Math.abs(p.z)), 0);
    const vFov = 45;
    const camZ = Math.max(
      26,
      halfWidth / (Math.tan(THREE.MathUtils.degToRad(vFov) / 2) * Math.max(1, aspect)) + depthExtent + 7
    );
    const camera = new THREE.PerspectiveCamera(vFov, aspect, 0.1, 1000);
    camera.position.set(0, 13, camZ);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current || undefined,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    if (!canvasRef.current && containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 10;
    controls.maxDistance = camZ * 2.2;
    controls.target.set(0, 2.5, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.0 : 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, isLight ? 1.8 : 1.4);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    const bluePointLight = new THREE.PointLight(0x3b82f6, isLight ? 1.0 : 1.5, 30);
    bluePointLight.position.set(-8, 8, -5);
    scene.add(bluePointLight);
    const orangePointLight = new THREE.PointLight(0xf97316, isLight ? 1.5 : 2, 35);
    orangePointLight.position.set(16, 10, 5);
    scene.add(orangePointLight);

    const gridHelper = new THREE.GridHelper(60, 30, gridMain, gridSec);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.4 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── Connections (tubes + particles) ──────────────────────────────────
    const particleSystems: { mesh: THREE.Mesh; progress: number; speed: number; curve: THREE.Curve<THREE.Vector3> }[] = [];

    const createConnection = (fromId: string, toId: string, kind: 'goods' | 'inflow' | 'outflow') => {
      const p1 = positions[fromId];
      const p2 = positions[toId];
      if (!p1 || !p2) return;

      const laneIndex = Math.floor(Math.random() * 3) - 1;
      const zOff = laneIndex * 0.6;
      
      const start = new THREE.Vector3(p1.x, 1.2, p1.z + zOff);
      const end = new THREE.Vector3(p2.x, 1.2, p2.z + zOff);
      
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.y += 2.0;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

      const colorMap: Record<string, number> = { goods: 0x38bdf8, inflow: 0x34d399, outflow: 0xf87171 };
      const colorHex = colorMap[kind];
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, 0.12, 8, false),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.6 })
      );
      scene.add(tube);

      const pGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const count = kind === 'outflow' ? 8 : 5;
      for (let i = 0; i < count; i++) {
        const pMesh = new THREE.Mesh(pGeo, pMat);
        scene.add(pMesh);
        particleSystems.push({
          mesh: pMesh,
          progress: i / count,
          speed: 0.005 + Math.random() * 0.004,
          curve,
        });
      }
    };

    edges.forEach((edge) => createConnection(edge.from, edge.to, edge.kind));

    // ── Animation loop ───────────────────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Shock pulse: the node being hit scales up smoothly
      Object.entries(nodeGroups).forEach(([id, group]) => {
        const pulseIdx = shockChain.indexOf(id);
        const pulsing = isSimulatingPulseRef.current && pulseStepRef.current === pulseIdx;
        const targetScale = pulsing ? 1.22 : 1;
        group.scale.x += (targetScale - group.scale.x) * 0.18;
        group.scale.y = group.scale.x;
        group.scale.z = group.scale.x;
      });

      // Orbiting coins around the cash reservoir
      satellites.forEach((s) => {
        const a = elapsedTime * s.speed + s.phase;
        s.mesh.position.set(
          s.center.x + Math.cos(a) * s.radius,
          s.y,
          s.center.z + Math.sin(a) * s.radius
        );
      });

      particleSystems.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        p.mesh.position.copy(p.curve.getPoint(p.progress));
      });

      // Project node positions to 2D for the overlay cards, anchored ABOVE
      // each model so the text never covers the 3D objects.
      if (containerRef.current && cameraRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const projVec = new THREE.Vector3();
        const positionsMap = nodePositionsRef.current;
        Object.keys(positionsMap).forEach((id) => {
          const pos = positionsMap[id];
          const el = nodeCardEls.current[id];
          if (!el || !cameraRef.current || !pos) return;
          const offset = NODE_LABEL_OFFSET[kindByIdRef.current[id]] ?? 4.2;
          const topPos = new THREE.Vector3(pos.x, pos.y + offset, pos.z);
          projVec.copy(topPos);
          projVec.project(cameraRef.current);
          const behindCamera = projVec.z > 1;
          const x = (projVec.x * 0.5 + 0.5) * w;
          const y = (-(projVec.y * 0.5) + 0.5) * h;
          // Hide chips that would hang off the viewport edge instead of clipping
          const chipW = el.offsetWidth || 120;
          const chipH = el.offsetHeight || 40;
          const onScreen = !behindCamera && x > chipW * 0.5 - 12 && x < w - chipW * 0.5 + 12 && y > -chipH && y < h - 6;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.opacity = onScreen ? '1' : '0';
          el.style.pointerEvents = onScreen ? 'auto' : 'none';
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w < 2 || h < 2) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      liquidMeshRef.current = null;
      liquidMaterialRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLight, industryProfile.id]);

  // ── Camera auto-rotation (toggleable from the control bar) ───────────────
  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.autoRotate = autoRotate;
    controlsRef.current.autoRotateSpeed = autoRotate ? 0.6 : 0;
  }, [autoRotate]);

  // ── Cash tank liquid state ────────────────────────────────────────────────
  useEffect(() => {
    if (!liquidMaterialRef.current || !liquidMeshRef.current) return;
    if (hasBreach || scenarioMinCash < cashFloor) {
      liquidMaterialRef.current.color.setHex(0xef4444);
      liquidMaterialRef.current.emissive.setHex(0xb91c1c);
      liquidMeshRef.current.scale.set(1.0, 0.45, 1.0);
    } else {
      liquidMaterialRef.current.color.setHex(0x10b981);
      liquidMaterialRef.current.emissive.setHex(0x047857);
      liquidMeshRef.current.scale.set(1.0, 1.0, 1.0);
    }
  }, [hasBreach, scenarioMinCash, cashFloor]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const nodeSubValue = (node: IndustryMiniatureNode): string => {
    if (node.kind === 'supplier' && topOutflow) return `Payment: ${formatINR(topOutflow.amount)}`;
    if (node.kind === 'customer' && topInflow) return `Collection: ${formatINR(topInflow.amount)}`;
    return node.detail;
  };

  const nodeFacts = (node: IndustryMiniatureNode): { label: string; value: string; tone?: string }[] => {
    switch (node.kind) {
      case 'cash':
        return [
          { label: 'Current Cash', value: formatINR(currentCash) },
          { label: 'Safety Floor', value: formatINR(cashFloor), tone: 'text-emerald-400' },
          { label: 'Projected Minimum', value: formatINR(scenarioMinCash), tone: scenarioMinCash < cashFloor ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Liquidity Gap', value: formatINR(scenarioLiquidityGap), tone: 'text-red-400' },
          { label: 'Status', value: hasBreach ? `BREACH ON DAY ${scenarioBreachDay}` : 'SAFE', tone: hasBreach ? 'text-red-400' : 'text-emerald-400' },
        ];
      case 'supplier':
        return [
          { label: 'Payment Exposure', value: topOutflow ? formatINR(topOutflow.amount) : '—', tone: 'text-red-400' },
          { label: 'Shock Status', value: isDelayed ? `+${supplierDelayDays}d delay` : 'Baseline', tone: isDelayed ? 'text-orange-400' : 'text-emerald-400' },
        ];
      case 'inventory':
        return [{ label: 'Working Capital', value: 'Trapped in stock', tone: 'text-blue-400' }];
      case 'operations':
        return [{ label: 'Operating Status', value: 'ACTIVE', tone: 'text-emerald-400' }];
      case 'customer':
        return [
          { label: 'Expected Collection', value: topInflow ? formatINR(topInflow.amount) : '—', tone: 'text-emerald-400' },
          { label: 'Collection Shift', value: isDelayed ? `+${supplierDelayDays} days` : 'On schedule', tone: isDelayed ? 'text-amber-400' : 'text-emerald-400' },
        ];
      default:
        return [{ label: 'Node Detail', value: node.detail, tone: 'text-white/70' }];
    }
  };

  return (
    <div className={`border rounded-2xl relative overflow-hidden flex flex-col w-full transition-colors duration-300 ${
      isLight ? 'bg-white border-slate-200 text-slate-900 shadow-lg' : 'bg-[#050508] border-white/10 text-white shadow-2xl'
    }`}>
      {/* HEADER BAR */}
      <div className={`border-b p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 z-20 font-mono text-xs ${
        isLight ? 'bg-slate-100/90 border-slate-200 text-slate-900' : 'bg-black/85 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shrink-0" />
          <h2 className="font-extrabold tracking-wider uppercase flex items-center gap-2 text-xs">
            <span>FLOWSHIELD — {industryProfile.name.toUpperCase()} MINIATURE MODEL</span>
          </h2>
          <span className={`px-2 py-0.5 rounded text-[10px] hidden sm:inline ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/60'}`}>
            CAUSAL SCENARIO MODEL
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className={`px-2.5 sm:px-3 py-1 rounded-xl border font-mono font-bold text-[11px] sm:text-xs uppercase flex items-center gap-1.5 ${
            hasBreach
              ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          }`}>
            {hasBreach ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>CASH RISK: HIGH (Breach: Day {scenarioBreachDay})</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>CASH RISK: LOW (SAFE)</span>
              </>
            )}
          </div>
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D VIEWPORT */}
      <div ref={containerRef} className={`relative w-full h-[360px] sm:h-[520px] cursor-grab active:cursor-grabbing ${
        isLight ? 'bg-slate-50' : 'bg-[#050508]'
      }`}>
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* LEGEND */}
        <div className={`hidden sm:block absolute top-4 right-4 backdrop-blur-md border rounded-xl p-3 z-10 space-y-1 text-xs font-mono shadow-2xl ${
          isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-black/90 border-white/20 text-white'
        }`}>
          <div className={`uppercase font-black tracking-wider mb-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
            3D CAUSAL MAP LEGEND
          </div>
          <div className="flex items-center gap-2 text-sky-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
            <span>OPERATIONAL FLOW</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CASH INFLOW</span>
          </div>
          <div className="flex items-center gap-2 text-red-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>CASH OUTFLOW</span>
          </div>
        </div>

        {/* BASELINE VS SCENARIO */}
        <div className={`absolute top-4 left-4 backdrop-blur-md border rounded-xl p-3.5 z-10 space-y-2 text-left font-mono max-w-xs shadow-2xl ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-black/90 border-white/20 text-white'
        }`}>
          <div className={`flex items-center justify-between text-xs font-black uppercase tracking-wider border-b pb-1.5 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <span className="text-orange-500 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" /> BASELINE VS SCENARIO
            </span>
            <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>3D SIM</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-lg border space-y-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
              <div className={`font-bold uppercase text-[9px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>BASELINE</div>
              <div>Min: <span className="text-emerald-500 font-bold">{formatINR(currentCash)}</span></div>
              <div>Status: <span className="text-emerald-500 font-bold">ACTIVE</span></div>
            </div>
            <div className={`p-2 rounded-lg border space-y-1 ${isDelayed ? 'bg-red-500/10 border-red-500/40' : 'bg-emerald-500/10 border-emerald-500/40'}`}>
              <div className={`font-bold uppercase text-[9px] ${isLight ? 'text-slate-600' : 'text-white/70'}`}>SCENARIO (+{supplierDelayDays}d)</div>
              <div>Min: <span className={`font-bold ${scenarioMinCash < cashFloor ? 'text-red-500' : 'text-emerald-500'}`}>{formatINR(scenarioMinCash)}</span></div>
              <div>Status: <span className={`font-bold ${scenarioMinCash < cashFloor ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                {scenarioMinCash < cashFloor ? `BREACH (D${scenarioBreachDay})` : 'SAFE'}
              </span></div>
            </div>
          </div>
        </div>

        {/* NODE OVERLAY CARDS (dynamically built from the industry profile) */}
        {nodes.map((node, idx) => {
          const pulseIdx = shockChain.findIndex((id) => id === node.id);
          const isPulsing = isSimulatingPulse && pulseStep === pulseIdx;
          const isCash = node.kind === 'cash';
          const accent = node.color;
          const pulseClass = isPulsing ? 'border-orange-500 scale-110 shadow-lg' : '';
          const cashBorder = isCash
            ? hasBreach || scenarioMinCash < cashFloor ? 'border-red-500 shadow-xl' : 'border-emerald-500 shadow-xl'
            : '';
          const supplierDelay = !isCash && node.kind === 'supplier' && isDelayed ? 'border-orange-500 shadow-lg' : '';
          const align = isCash ? 'text-center' : idx % 2 === 0 ? 'text-left' : 'text-right';
          return (
            <div
              key={node.id}
              ref={(el) => { nodeCardEls.current[node.id] = el; }}
              onClick={() => setSelectedNode(node.id)}
              className={`absolute -translate-x-1/2 -translate-y-full border rounded-lg px-2.5 py-1.5 cursor-pointer hover:scale-105 transition-transform z-10 min-w-[112px] max-w-[160px] shadow-xl backdrop-blur-md ${
                isLight ? 'bg-white/85 border-slate-300 text-slate-900' : 'bg-[#151B23]/90 border-white/20 text-white'
              } ${cashBorder} ${supplierDelay} ${pulseClass}`}
              style={{ pointerEvents: 'auto' }}
            >
              <div className={`text-[10px] font-mono font-black uppercase flex items-center gap-1 border-b pb-1 ${
                isLight ? 'border-slate-200' : 'border-white/10'
              } ${align === 'text-right' ? 'justify-end' : align === 'text-center' ? 'justify-center' : ''}`}>
                <span style={{ color: accent }}>{String(idx + 1).padStart(2, '0')} — {node.label.toUpperCase()}</span>
              </div>
              <div className="text-[11px] font-mono font-bold mt-1 leading-snug">
                {isCash ? (
                  <>
                    <span className="flex items-center gap-1 justify-center">
                      <DollarSign className="w-3.5 h-3.5" style={{ color: accent }} />
                      <span className="text-sm font-black">{formatINR(currentCash)}</span>
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                      Floor: <span className="text-emerald-500 font-black">{formatINR(cashFloor)}</span>
                    </span>
                  </>
                ) : (
                  <span className={isLight ? 'text-slate-700' : 'text-white/85'}>{nodeSubValue(node)}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* NODE INSPECTOR MODAL */}
        {selectedNode && (() => {
          const node = nodes.find((n) => n.id === selectedNode);
          if (!node) return null;
          return (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex items-center justify-center p-4">
              <div className="bg-[#0b0c10] border-2 border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono relative">
                <button
                  onClick={() => setSelectedNode(null)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Box className="w-6 h-6" style={{ color: node.color }} />
                  <div>
                    <h3 className="text-lg font-bold text-white">{String(nodes.findIndex((n) => n.id === node.id) + 1).padStart(2, '0')} — {node.label.toUpperCase()}</h3>
                    <p className="text-xs text-white/50">{node.description}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {nodeFacts(node).map((f, i) => (
                    <div key={i} className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">{f.label}</span>
                      <span className={`font-bold ${f.tone || 'text-white'}`}>{f.value}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer text-xs uppercase"
                >
                  Close Node Inspector
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* CONTROLS BAR */}
      <div className={`p-3 font-mono text-xs border-t flex flex-col md:flex-row items-center justify-between gap-3 ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
      }`}>
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <Sliders className="w-4 h-4 text-[#A1A1AA] shrink-0" />
          <span className="font-medium uppercase shrink-0">{model.shockLabel}:</span>
          <input
            type="range"
            min="0"
            max={model.shockMax}
            step="1"
            value={Math.min(supplierDelayDays, model.shockMax)}
            onChange={(e) => onSupplierDelayChange(parseInt(e.target.value, 10))}
            className="w-full max-w-xs h-1.5 bg-[#222222] rounded appearance-none cursor-pointer accent-[#EDEDED]"
          />
          <span className={`font-mono text-xs px-2 py-0.5 rounded border shrink-0 ${
            isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' : 'bg-[#111111] border-[#222222] text-[#EDEDED]'
          }`}>
            +{supplierDelayDays} DAYS
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoRotate((v) => !v)}
            title="Toggle camera auto-rotation"
            className={`px-3 py-1.5 font-medium text-xs rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
              autoRotate
                ? (isLight ? 'bg-[#171717] text-[#FFFFFF] border-[#171717] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] border-[#EDEDED] hover:opacity-90')
                : (isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666] hover:bg-[#FAFAFA]' : 'bg-[#111111] border-[#222222] text-[#A1A1AA] hover:bg-[#1A1A1A]')
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>{autoRotate ? 'Auto-Rotate ON' : 'Auto-Rotate OFF'}</span>
          </button>
          <button
            onClick={() => {
              onSupplierDelayChange(model.defaultShockValue);
              triggerCausalSimulation();
            }}
            className={`px-3 py-1.5 font-medium text-xs rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isLight ? 'bg-[#171717] text-[#FFFFFF] border-[#171717] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] border-[#EDEDED] hover:opacity-90'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Simulate +{model.defaultShockValue}D Shock</span>
          </button>
          <button
            onClick={() => {
              onSupplierDelayChange(0);
              stopPulse();
            }}
            className={`px-3 py-1.5 font-medium text-xs rounded-md border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666] hover:bg-[#FAFAFA]' : 'bg-[#111111] border-[#222222] text-[#A1A1AA] hover:bg-[#1A1A1A]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset (0D)
          </button>
        </div>
      </div>

      {/* SHOCK CHAIN STRIP */}
      <div className={`p-4 font-mono text-xs border-t space-y-2 ${
        isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#000000] border-[#222222]'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>
            EVENT PROPAGATION — {industryProfile.name.toUpperCase()}
          </span>
          {hasBreach ? (
            <span className="text-[#EF4444] font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>CASH FLOOR BREACH: DAY {scenarioBreachDay}</span>
            </span>
          ) : (
            <span className="text-[#22C55E] font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>SAFE LIQUIDITY THRESHOLD</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {shockChain.map((nodeId, i) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) return null;
            const isPulsing = isSimulatingPulse && pulseStep === i;
            return (
              <React.Fragment key={nodeId}>
                <div className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                  isPulsing
                    ? 'border-orange-500 bg-orange-500/15 text-orange-500 scale-105'
                    : isLight
                      ? 'border-slate-200 bg-slate-50 text-slate-700'
                      : 'border-[#222222] bg-[#111111] text-zinc-300'
                }`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                  <span className="whitespace-nowrap">{node.label}</span>
                </div>
                {i < shockChain.length - 1 && (
                  <span className={`text-[10px] ${isLight ? 'text-slate-300' : 'text-zinc-600'}`}>↓</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};