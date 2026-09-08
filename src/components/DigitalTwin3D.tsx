import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sliders,
  TrendingDown,
  Zap,
  Info,
  Clock,
  DollarSign,
  Package,
  Layers,
  Building2,
  UserCheck,
  ArrowRight,
  Activity,
  Sparkles,
  HelpCircle,
  X,
} from 'lucide-react';
import { formatINR } from '../engine/calculator';
import { CounterfactualOutcome } from '../types';
import { useTheme } from '../context/ThemeContext';

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
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  currentCash,
  minCash,
  cashFloor,
  hasBreach,
  earliestBreachDate,
  supplierDelayDays,
  onSupplierDelayChange,
  counterfactuals = [],
  activeCounterfactual = null,
  onSelectCounterfactual = () => {},
  onOpenDriverAnalysis = () => {},
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<'SUPPLIER' | 'INVENTORY' | 'OPERATIONS' | 'CUSTOMER' | 'CASH' | null>(null);
  const [highlightedDriver, setHighlightedDriver] = useState<string | null>(null);
  const [isSimulatingPulse, setIsSimulatingPulse] = useState(false);
  const [pulseStep, setPulseStep] = useState<number>(-1); // 0=Supplier, 1=Inventory, 2=Operations, 3=Customer, 4=Cash

  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // References to 3D meshes for highlighting / animation
  const nodeMeshesRef = useRef<{
    supplier?: THREE.Group;
    inventory?: THREE.Group;
    operations?: THREE.Group;
    customer?: THREE.Group;
    cash?: THREE.Group;
  }>({});

  const liquidMeshRef = useRef<THREE.Mesh | null>(null);
  const liquidMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Card DOM refs for 3D world projection pinning
  const cardSupplierRef = useRef<HTMLDivElement>(null);
  const cardInventoryRef = useRef<HTMLDivElement>(null);
  const cardOperationsRef = useRef<HTMLDivElement>(null);
  const cardCustomerRef = useRef<HTMLDivElement>(null);
  const cardCashRef = useRef<HTMLDivElement>(null);

  // Derived Financial Values
  const isDelayed = supplierDelayDays > 0;
  const leadTimeTotal = 15 + supplierDelayDays;
  const collectionDayTotal = 42 + supplierDelayDays;
  const scenarioMinCash = minCash;
  const scenarioBreachDay = earliestBreachDate ? earliestBreachDate.replace(/^[^\d]*/, '') || earliestBreachDate : hasBreach ? '19' : 'NONE';
  const scenarioLiquidityGap = scenarioMinCash < cashFloor ? cashFloor - scenarioMinCash : 0;
  const isPrevented = activeCounterfactual !== null;

  // Trigger Causal Propagation Wave
  const triggerCausalSimulation = () => {
    setIsSimulatingPulse(true);
    setPulseStep(0);

    const steps = [0, 1, 2, 3, 4];
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setPulseStep(step);
        if (idx === steps.length - 1) {
          setTimeout(() => {
            setIsSimulatingPulse(false);
            setPulseStep(-1);
          }, 1200);
        }
      }, (idx + 1) * 450);
    });
  };

  // Three.js Scene Setup & Loop
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const bgHex = isLight ? 0xfafafa : 0x0a0a0a;
    const gridMain = isLight ? 0xd4d4d8 : 0x333333;
    const gridSec = isLight ? 0xeaeaea : 0x1f1f1f;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.007 : 0.012);
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 14, 32);
    cameraRef.current = camera;

    // RENDERER
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

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 12;
    controls.maxDistance = 55;
    controls.target.set(0, 2, 0);
    controlsRef.current = controls;

    // LIGHTING
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

    // GRID FLOOR
    const gridHelper = new THREE.GridHelper(60, 30, gridMain, gridSec);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // GROUND PLANE FOR SHADOWS
    const shadowPlaneGeo = new THREE.PlaneGeometry(80, 80);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Node Positions (Linear X alignment left-to-right)
    const POS_SUPPLIER = new THREE.Vector3(-16, 0, 0);
    const POS_INVENTORY = new THREE.Vector3(-8, 0, 0);
    const POS_OPERATIONS = new THREE.Vector3(0, 0, 0);
    const POS_CUSTOMER = new THREE.Vector3(8, 0, 0);
    const POS_CASH = new THREE.Vector3(16, 0, 0);

    const nodeGroups: typeof nodeMeshesRef.current = {};

    // ==========================================
    // NODE 1: SUPPLIER (3D Factory Model)
    // ==========================================
    const supplierGroup = new THREE.Group();
    supplierGroup.position.copy(POS_SUPPLIER);

    // Factory Base Building
    const factoryBaseGeo = new THREE.BoxGeometry(3.5, 2.2, 3);
    const factoryBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.3 });
    const factoryBase = new THREE.Mesh(factoryBaseGeo, factoryBaseMat);
    factoryBase.position.y = 1.1;
    factoryBase.castShadow = true;
    factoryBase.receiveShadow = true;
    supplierGroup.add(factoryBase);

    // Factory Roofs (Dual Gables)
    for (let i = -1; i <= 1; i += 2) {
      const roofGeo = new THREE.ConeGeometry(1.2, 1, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(i * 0.9, 2.7, 0);
      supplierGroup.add(roof);
    }

    // Industrial Smokestack Chimney
    const chimneyGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 16);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(1.2, 2.5, -0.8);
    chimney.castShadow = true;
    supplierGroup.add(chimney);

    // Smokestack Ring Accent
    const ringGeo = new THREE.TorusGeometry(0.32, 0.05, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(1.2, 3.5, -0.8);
    supplierGroup.add(ring);

    // Base Pad Light Ring
    const padGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.2, 32);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.1;
    supplierGroup.add(pad);

    scene.add(supplierGroup);
    nodeGroups.supplier = supplierGroup;

    // ==========================================
    // NODE 2: INVENTORY (Stack of Pallet Boxes)
    // ==========================================
    const inventoryGroup = new THREE.Group();
    inventoryGroup.position.copy(POS_INVENTORY);

    // Wooden Pallet Base
    const palletGeo = new THREE.BoxGeometry(3.6, 0.25, 3.6);
    const palletMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const pallet = new THREE.Mesh(palletGeo, palletMat);
    pallet.position.y = 0.125;
    pallet.castShadow = true;
    inventoryGroup.add(pallet);

    // Cardboard Box Stack Grid (3x2x2)
    const boxGeo = new THREE.BoxGeometry(1.0, 0.9, 1.0);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.5, metalness: 0.2 });
    const boxBorderMat = new THREE.LineBasicMaterial({ color: 0x60a5fa });

    for (let x = -1; x <= 1; x += 1.05) {
      for (let z = -0.8; z <= 0.8; z += 1.05) {
        for (let y = 0.6; y <= 1.5; y += 0.95) {
          const box = new THREE.Mesh(boxGeo, boxMat);
          box.position.set(x, y, z);
          box.castShadow = true;
          box.receiveShadow = true;
          inventoryGroup.add(box);

          const edges = new THREE.EdgesGeometry(boxGeo);
          const line = new THREE.LineSegments(edges, boxBorderMat);
          box.add(line);
        }
      }
    }

    scene.add(inventoryGroup);
    nodeGroups.inventory = inventoryGroup;

    // ==========================================
    // NODE 3: OPERATIONS (Assembly Machine Station)
    // ==========================================
    const opsGroup = new THREE.Group();
    opsGroup.position.copy(POS_OPERATIONS);

    // Machine Main Body Chassis
    const bodyGeo = new THREE.BoxGeometry(3.4, 1.8, 2.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    opsGroup.add(body);

    // Conveyor Belt Surface
    const beltGeo = new THREE.BoxGeometry(4.0, 0.2, 1.4);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 1.0, 0);
    opsGroup.add(belt);

    // Rotating Gear Cylinders
    const gearGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 12);
    const gearMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, metalness: 0.8 });
    const gear1 = new THREE.Mesh(gearGeo, gearMat);
    gear1.rotation.x = Math.PI / 2;
    gear1.position.set(-0.8, 2.1, 0);
    opsGroup.add(gear1);

    const gear2 = new THREE.Mesh(gearGeo, gearMat);
    gear2.rotation.x = Math.PI / 2;
    gear2.position.set(0.8, 2.1, 0);
    opsGroup.add(gear2);

    // Status Light Beacon on Top
    const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(1.3, 2.1, -0.8);
    opsGroup.add(beacon);

    scene.add(opsGroup);
    nodeGroups.operations = opsGroup;

    // ==========================================
    // NODE 4: CUSTOMER (Office Building Endpoint)
    // ==========================================
    const custGroup = new THREE.Group();
    custGroup.position.copy(POS_CUSTOMER);

    // Corporate Tower Main Body
    const towerGeo = new THREE.BoxGeometry(3.0, 4.5, 2.8);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, metalness: 0.5, roughness: 0.2 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 2.25;
    tower.castShadow = true;
    custGroup.add(tower);

    // Glass Window Grid Panels
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    for (let y = 1.0; y <= 3.8; y += 0.8) {
      for (let x = -1.0; x <= 1.0; x += 0.9) {
        const winGeo = new THREE.PlaneGeometry(0.5, 0.4);
        const winFront = new THREE.Mesh(winGeo, windowMat);
        winFront.position.set(x, y, 1.41);
        custGroup.add(winFront);
      }
    }

    // Entrance Canopy
    const canopyGeo = new THREE.BoxGeometry(1.8, 0.15, 0.8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x059669 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.6, 1.6);
    custGroup.add(canopy);

    scene.add(custGroup);
    nodeGroups.customer = custGroup;

    // ==========================================
    // NODE 5: CASH RESERVOIR (Dominant Liquid Core)
    // ==========================================
    const cashGroup = new THREE.Group();
    cashGroup.position.copy(POS_CASH);

    // Outer Glass Tank Reservoir Cylinder
    const tankGlassGeo = new THREE.CylinderGeometry(2.2, 2.2, 5.0, 32, 1, true);
    const tankGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      opacity: 0.85,
      transparent: true,
      roughness: 0.1,
      ior: 1.4,
    });
    const tankGlass = new THREE.Mesh(tankGlassGeo, tankGlassMat);
    tankGlass.position.y = 2.5;
    cashGroup.add(tankGlass);

    // Metal Base Rim
    const baseRimGeo = new THREE.CylinderGeometry(2.4, 2.5, 0.4, 32);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const baseRim = new THREE.Mesh(baseRimGeo, rimMat);
    baseRim.position.y = 0.2;
    cashGroup.add(baseRim);

    // Metal Top Cap Rim
    const topCap = new THREE.Mesh(baseRimGeo, rimMat);
    topCap.position.y = 5.0;
    cashGroup.add(topCap);

    // Safety Floor Horizontal Ring Indicator Line
    const floorRingGeo = new THREE.TorusGeometry(2.22, 0.06, 16, 64);
    const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRing.rotation.x = Math.PI / 2;
    floorRing.position.y = 2.0; // Represents ₹5L Safety Floor level height
    cashGroup.add(floorRing);

    // Liquid Body Core Mesh inside Tank
    const liquidGeo = new THREE.CylinderGeometry(2.05, 2.05, 3.2, 32);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    liquidMesh.position.y = 1.6;
    cashGroup.add(liquidMesh);

    liquidMeshRef.current = liquidMesh;
    liquidMaterialRef.current = liquidMat;

    scene.add(cashGroup);
    nodeGroups.cash = cashGroup;

    nodeMeshesRef.current = nodeGroups;

    // ==========================================
    // CONNECTING FLOW PATH PIPES / TUBES
    // ==========================================

    // Helper: Create Curved Tube between positions
    const createTube = (p1: THREE.Vector3, p2: THREE.Vector3, arcHeight: number, colorHex: number) => {
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.y += arcHeight;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.12, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.6 });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);
      return curve;
    };

    // PHYSICAL GOODS FLOW CURVES (Top cyan arcs)
    const curveGoods1 = createTube(
      new THREE.Vector3(-16, 2.5, 0),
      new THREE.Vector3(-8, 2.5, 0),
      1.2,
      0x38bdf8
    );
    const curveGoods2 = createTube(
      new THREE.Vector3(-8, 2.5, 0),
      new THREE.Vector3(0, 2.5, 0),
      1.2,
      0x38bdf8
    );
    const curveGoods3 = createTube(
      new THREE.Vector3(0, 2.5, 0),
      new THREE.Vector3(8, 2.5, 0),
      1.2,
      0x38bdf8
    );

    // FINANCIAL MONEY FLOW CURVES (Bottom green/red/purple arcs)
    // 1. Customer -> Cash (+₹30L Inflow: Green)
    const curveMoneyIn = createTube(
      new THREE.Vector3(8, 1.5, 1.0),
      new THREE.Vector3(16, 1.5, 1.0),
      -1.5,
      0x34d399
    );

    // 2. Cash -> Supplier (-₹8.2L Payment Outflow: Red)
    const curveMoneyOutSupplier = createTube(
      new THREE.Vector3(16, 1.0, -1.0),
      new THREE.Vector3(-16, 1.0, -1.0),
      -4.5,
      0xf87171
    );

    // 3. Cash -> Operations (-₹3.1L Operating Expense: Purple)
    const curveMoneyOutOps = createTube(
      new THREE.Vector3(16, 1.0, 0),
      new THREE.Vector3(0, 1.0, 0),
      -3.0,
      0xc084fc
    );

    // ==========================================
    // ANIMATED PARTICLES FOR FLOWS
    // ==========================================
    const createParticleSystem = (curve: THREE.QuadraticBezierCurve3, count: number, colorHex: number) => {
      const pGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const particles: { mesh: THREE.Mesh; progress: number; speed: number }[] = [];

      for (let i = 0; i < count; i++) {
        const pMesh = new THREE.Mesh(pGeo, pMat);
        scene.add(pMesh);
        particles.push({
          mesh: pMesh,
          progress: i / count,
          speed: 0.006 + Math.random() * 0.004,
        });
      }
      return particles;
    };

    const goodsParticles1 = createParticleSystem(curveGoods1, 5, 0x38bdf8);
    const goodsParticles2 = createParticleSystem(curveGoods2, 5, 0x38bdf8);
    const goodsParticles3 = createParticleSystem(curveGoods3, 5, 0x38bdf8);
    const moneyInParticles = createParticleSystem(curveMoneyIn, 6, 0x34d399);
    const moneyOutParticlesSupplier = createParticleSystem(curveMoneyOutSupplier, 8, 0xf87171);
    const moneyOutParticlesOps = createParticleSystem(curveMoneyOutOps, 6, 0xc084fc);

    const updateParticles = (list: typeof goodsParticles1) => {
      list.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        const pt = (p.mesh.parent ? curveGoods1 : curveGoods1).getPoint(p.progress); // dynamically evaluate curve
        p.mesh.position.copy(pt);
      });
    };

    // ANIMATION LOOP
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Rotate Gear machine on Operations node
      if (gear1 && gear2) {
        gear1.rotation.z = elapsedTime * 2;
        gear2.rotation.z = -elapsedTime * 2;
      }

      // Pulse chimney glow
      if (ring) {
        ring.scale.setScalar(1 + Math.sin(elapsedTime * 4) * 0.1);
      }

      // Update Goods Flow Particles
      [goodsParticles1, goodsParticles2, goodsParticles3].forEach((list, idx) => {
        const curve = idx === 0 ? curveGoods1 : idx === 1 ? curveGoods2 : curveGoods3;
        list.forEach((p) => {
          p.progress += p.speed;
          if (p.progress > 1) p.progress = 0;
          p.mesh.position.copy(curve.getPoint(p.progress));
        });
      });

      // Update Money Flow Particles
      moneyInParticles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;
        p.mesh.position.copy(curveMoneyIn.getPoint(p.progress));
      });

      moneyOutParticlesSupplier.forEach((p) => {
        p.progress += p.speed * 0.7;
        if (p.progress > 1) p.progress = 0;
        p.mesh.position.copy(curveMoneyOutSupplier.getPoint(p.progress));
      });

      moneyOutParticlesOps.forEach((p) => {
        p.progress += p.speed * 0.8;
        if (p.progress > 1) p.progress = 0;
        p.mesh.position.copy(curveMoneyOutOps.getPoint(p.progress));
      });

      // Project 3D World Positions of the 5 nodes directly to 2D Screen Coordinates
      if (containerRef.current && cameraRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        const projVec = new THREE.Vector3();

        const projectToScreen = (worldPos: THREE.Vector3, el: HTMLDivElement | null) => {
          if (!el || !cameraRef.current) return;
          projVec.copy(worldPos);
          projVec.project(cameraRef.current);
          const x = (projVec.x * 0.5 + 0.5) * w;
          const y = (-(projVec.y * 0.5) + 0.5) * h;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        };

        projectToScreen(new THREE.Vector3(-16, 4.2, 0), cardSupplierRef.current);
        projectToScreen(new THREE.Vector3(-8, 3.8, 0), cardInventoryRef.current);
        projectToScreen(new THREE.Vector3(0, 3.8, 0), cardOperationsRef.current);
        projectToScreen(new THREE.Vector3(8, 5.2, 0), cardCustomerRef.current);
        projectToScreen(new THREE.Vector3(16, 6.0, 0), cardCashRef.current);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // RESIZE HANDLER
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // UPDATE CASH TANK LIQUID VISUAL BASED ON BREACH / SAFETY STATE
  useEffect(() => {
    if (!liquidMaterialRef.current || !liquidMeshRef.current) return;

    if (hasBreach || scenarioMinCash < cashFloor) {
      // BREACH STATE: Red Liquid + Pulsing
      liquidMaterialRef.current.color.setHex(0xef4444);
      liquidMaterialRef.current.emissive.setHex(0xb91c1c);
      liquidMeshRef.current.scale.set(1.0, 0.45, 1.0); // Liquid level drops below safety floor
    } else {
      // SAFE STATE: Emerald Liquid
      liquidMaterialRef.current.color.setHex(0x10b981);
      liquidMaterialRef.current.emissive.setHex(0x047857);
      liquidMeshRef.current.scale.set(1.0, 1.0, 1.0); // Full liquid level
    }
  }, [hasBreach, scenarioMinCash, cashFloor]);

  // FULLSCREEN TOGGLE
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`border rounded-2xl relative overflow-hidden flex flex-col w-full transition-colors duration-300 ${
      isLight 
        ? 'bg-white border-slate-200 text-slate-900 shadow-lg' 
        : 'bg-[#050508] border-white/10 text-white shadow-2xl'
    }`}>
      {/* HEADER BAR OVERLAY */}
      <div className={`border-b p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 z-20 font-mono text-xs ${
        isLight ? 'bg-slate-100/90 border-slate-200 text-slate-900' : 'bg-black/85 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping shrink-0" />
          <h2 className={`font-extrabold tracking-wider uppercase flex items-center gap-2 text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <span>FLOWSHIELD — BUSINESS MINIATURE MODEL</span>
          </h2>
          <span className={`px-2 py-0.5 rounded text-[10px] hidden sm:inline ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-white/60'}`}>
            CAUSAL SCENARIO MODEL
          </span>
        </div>

        {/* Breach Status Pill */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div
            className={`px-2.5 sm:px-3 py-1 rounded-xl border font-mono font-bold text-[11px] sm:text-xs uppercase flex items-center gap-1.5 ${
              hasBreach
                ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
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

      {/* 3D CANVAS VIEWPORT AREA */}
      <div ref={containerRef} className={`relative w-full h-[360px] sm:h-[520px] cursor-grab active:cursor-grabbing ${
        isLight ? 'bg-slate-50' : 'bg-[#050508]'
      }`}>
        {/* CANVAS ELEMENT */}
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* 3D FIN-TWIN FLOW LEGEND (TOP RIGHT) */}
        <div className={`hidden sm:block absolute top-4 right-4 backdrop-blur-md border rounded-xl p-3 z-10 space-y-1 text-xs font-mono shadow-2xl ${
          isLight ? 'bg-white/90 border-slate-200 text-slate-800' : 'bg-black/90 border-white/20 text-white'
        }`}>
          <div className={`uppercase font-black tracking-wider mb-1 text-[10px] ${isLight ? 'text-slate-500' : 'text-white/40'}`}>
            3D CAUSAL MAP LEGEND
          </div>
          <div className="flex items-center gap-2 text-sky-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
            <span>PHYSICAL GOODS FLOW</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>CUSTOMER INFLOW (+₹30L)</span>
          </div>
          <div className="flex items-center gap-2 text-red-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>SUPPLIER OUTFLOW (-₹8.2L)</span>
          </div>
          <div className="flex items-center gap-2 text-purple-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>OPEX OUTFLOW (-₹3.1L)</span>
          </div>
        </div>

        {/* BASELINE VS SCENARIO PANEL (TOP LEFT OVERLAY) */}
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
            {/* Baseline Column */}
            <div className={`p-2 rounded-lg border space-y-1 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
            }`}>
              <div className={`font-bold uppercase text-[9px] ${isLight ? 'text-slate-500' : 'text-white/50'}`}>BASELINE (0d)</div>
              <div>Lead: <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>15d</span></div>
              <div>Collect: <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Day 42</span></div>
              <div>Min: <span className="text-emerald-500 font-bold">₹6.2L</span></div>
              <div>Status: <span className="text-emerald-500 font-bold">SAFE</span></div>
            </div>

            {/* Scenario Column */}
            <div className={`p-2 rounded-lg border space-y-1 ${isDelayed ? 'bg-red-500/10 border-red-500/40' : 'bg-emerald-500/10 border-emerald-500/40'}`}>
              <div className={`font-bold uppercase text-[9px] ${isLight ? 'text-slate-600' : 'text-white/70'}`}>SCENARIO (+{supplierDelayDays}d)</div>
              <div>Lead: <span className="text-orange-500 font-bold">{leadTimeTotal}d</span></div>
              <div>Collect: <span className="text-orange-500 font-bold">Day {collectionDayTotal}</span></div>
              <div>Min: <span className={`font-bold ${scenarioMinCash < cashFloor ? 'text-red-500' : 'text-emerald-500'}`}>{formatINR(scenarioMinCash)}</span></div>
              <div>Status: <span className={`font-bold ${scenarioMinCash < cashFloor ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>{scenarioMinCash < cashFloor ? `BREACH (D${scenarioBreachDay})` : 'SAFE'}</span></div>
            </div>
          </div>
        </div>

        {/* 5 DYNAMICALLY 3D-PINNED CLICKABLE NODE OVERLAY CARDS */}
        
        {/* NODE 1: SUPPLIER */}
        <div
          ref={cardSupplierRef}
          onClick={() => setSelectedNode('SUPPLIER')}
          className={`absolute -translate-x-1/2 -translate-y-[115%] border-2 p-3 rounded-2xl text-left cursor-pointer hover:scale-105 transition-transform z-10 space-y-1 min-w-[170px] shadow-2xl ${
            isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#151B23] text-white border-[#2A3441]'
          } ${
            isDelayed ? 'border-orange-500 shadow-lg' : ''
          } ${pulseStep === 0 ? 'border-orange-500 scale-110' : ''}`}
        >
          <div className={`text-xs font-mono text-orange-500 font-black uppercase flex items-center gap-1 border-b pb-1 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <Building2 className="w-3.5 h-3.5 text-orange-500" />
            <span>01 — SUPPLIER</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Lead Time: <span className="text-orange-500 font-black">{leadTimeTotal} days</span> {isDelayed && `(+${supplierDelayDays}d)`}
          </div>
          <div className="text-xs font-mono font-bold">
            Payment: <span className="text-red-500 font-black">₹8.2L</span>
          </div>
        </div>

        {/* NODE 2: INVENTORY */}
        <div
          ref={cardInventoryRef}
          onClick={() => setSelectedNode('INVENTORY')}
          className={`absolute -translate-x-1/2 -translate-y-[115%] border-2 p-3 rounded-2xl text-left cursor-pointer hover:scale-105 transition-transform z-10 space-y-1 min-w-[170px] shadow-2xl ${
            isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#151B23] text-white border-[#2A3441]'
          } ${
            pulseStep === 1 ? 'border-blue-500 scale-110' : ''
          }`}
        >
          <div className={`text-xs font-mono text-blue-500 font-black uppercase flex items-center gap-1 border-b pb-1 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <Package className="w-3.5 h-3.5 text-blue-500" />
            <span>02 — INVENTORY</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Stock: <span className={`font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>1,250 units</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Capital: <span className="text-blue-500 font-black">₹12.4L</span>
          </div>
        </div>

        {/* NODE 3: OPERATIONS */}
        <div
          ref={cardOperationsRef}
          onClick={() => setSelectedNode('OPERATIONS')}
          className={`absolute -translate-x-1/2 -translate-y-[115%] border-2 p-3 rounded-2xl text-center cursor-pointer hover:scale-105 transition-transform z-10 space-y-1 min-w-[170px] shadow-2xl ${
            isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#151B23] text-white border-[#2A3441]'
          } ${
            pulseStep === 2 ? 'border-purple-500 scale-110' : ''
          }`}
        >
          <div className={`text-xs font-mono text-purple-500 font-black uppercase flex items-center justify-center gap-1 border-b pb-1 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span>03 — OPERATIONS</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Cost: <span className="text-purple-400 font-black">₹3.1L</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Status: <span className="text-emerald-500 font-black">ACTIVE</span>
          </div>
        </div>

        {/* NODE 4: CUSTOMER */}
        <div
          ref={cardCustomerRef}
          onClick={() => setSelectedNode('CUSTOMER')}
          className={`absolute -translate-x-1/2 -translate-y-[115%] border-2 p-3 rounded-2xl text-right cursor-pointer hover:scale-105 transition-transform z-10 space-y-1 min-w-[170px] shadow-2xl ${
            isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#151B23] text-white border-[#2A3441]'
          } ${
            pulseStep === 3 ? 'border-emerald-500 scale-110' : ''
          }`}
        >
          <div className={`text-xs font-mono text-emerald-500 font-black uppercase flex items-center justify-end gap-1 border-b pb-1 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <span>04 — CUSTOMER</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xs font-mono font-bold">
            Order: <span className="text-emerald-500 font-black">₹30L</span>
          </div>
          <div className="text-xs font-mono font-bold">
            Collection: <span className="text-orange-500 font-black">Day {collectionDayTotal}</span>
          </div>
        </div>

        {/* NODE 5: CASH RESERVOIR (VISUALLY DOMINANT) */}
        <div
          ref={cardCashRef}
          onClick={() => setSelectedNode('CASH')}
          className={`absolute -translate-x-1/2 -translate-y-[115%] border-2 p-3.5 rounded-2xl text-center cursor-pointer hover:scale-105 transition-transform z-10 space-y-1 min-w-[200px] shadow-2xl ${
            isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#151B23] text-white border-[#2A3441]'
          } ${
            hasBreach || scenarioMinCash < cashFloor
              ? 'border-red-500 shadow-xl'
              : 'border-emerald-500 shadow-xl'
          } ${pulseStep === 4 ? 'scale-110' : ''}`}
        >
          <div className="text-xs font-mono text-orange-500 uppercase font-black tracking-widest flex items-center justify-center gap-1">
            <DollarSign className="w-4 h-4 text-orange-500" />
            <span>05 — CASH RESERVOIR</span>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            CASH: {formatINR(currentCash)}
          </div>
          <div className={`text-xs font-mono border-t pt-1 font-bold ${
            isLight ? 'border-slate-200 text-slate-700' : 'border-white/10 text-white/80'
          }`}>
            Safety Floor: <span className="text-emerald-500 font-black">{formatINR(cashFloor)}</span>
          </div>
          <div className={`text-xs font-mono font-bold ${isLight ? 'text-slate-700' : 'text-white/80'}`}>
            Min: <span className={`font-black ${scenarioMinCash < cashFloor ? 'text-red-500' : 'text-emerald-500'}`}>{formatINR(scenarioMinCash)}</span>
          </div>

          <div className="pt-1">
            {hasBreach || scenarioMinCash < cashFloor ? (
              <span className="px-2.5 py-1 rounded-xl bg-red-500/20 border border-red-500 text-red-500 font-mono text-xs font-black uppercase inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span>LIQUIDITY BREACH</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-500 font-mono text-xs font-black uppercase inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>SAFE</span>
              </span>
            )}
          </div>
        </div>

        {/* NODE DETAIL MODAL INSPECTOR OVERLAY */}
        {selectedNode && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="bg-[#0b0c10] border-2 border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono relative">
              <button
                onClick={() => setSelectedNode(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white text-lg font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {selectedNode === 'SUPPLIER' && (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Building2 className="w-6 h-6 text-orange-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">01 — SUPPLIER DETAILS</h3>
                      <p className="text-xs text-white/50">Shakti Components Vendor (Component Supply)</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Lead Time</span>
                      <span className="text-orange-400 font-bold">{leadTimeTotal} days ({supplierDelayDays > 0 ? `+${supplierDelayDays}d delay` : 'Baseline'})</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Payment Amount</span>
                      <span className="text-red-400 font-bold">₹8.2L</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Reliability Score</span>
                      <span className="text-emerald-400 font-bold">92%</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-white/60">Cash Impact</span>
                      <span className="text-red-400 font-extrabold">-₹8.2L Direct Outflow</span>
                    </div>
                  </div>
                </>
              )}

              {selectedNode === 'INVENTORY' && (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Package className="w-6 h-6 text-blue-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">02 — INVENTORY DETAILS</h3>
                      <p className="text-xs text-white/50">Raw Component Stock Warehouse</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Stock Level</span>
                      <span className="text-blue-300 font-bold">1,250 units</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Capital Locked</span>
                      <span className="text-blue-300 font-bold">₹12.4L</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Days of Inventory</span>
                      <span className="text-white font-bold">24 Days</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-white/60">Cash Impact</span>
                      <span className="text-blue-400 font-extrabold">-₹12.4L Trapped Working Capital</span>
                    </div>
                  </div>
                </>
              )}

              {selectedNode === 'OPERATIONS' && (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Layers className="w-6 h-6 text-purple-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">03 — OPERATIONS DETAILS</h3>
                      <p className="text-xs text-white/50">Manufacturing Assembly Station</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Production Cost</span>
                      <span className="text-purple-300 font-bold">₹3.1L</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Status</span>
                      <span className="text-emerald-400 font-bold">ACTIVE</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Daily OPEX</span>
                      <span className="text-white font-bold">₹42K / Day</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-white/60">Cash Impact</span>
                      <span className="text-purple-400 font-extrabold">-₹3.1L Operating Expense</span>
                    </div>
                  </div>
                </>
              )}

              {selectedNode === 'CUSTOMER' && (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <UserCheck className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">04 — CUSTOMER DETAILS</h3>
                      <p className="text-xs text-white/50">TechCorp Ltd (Order #892)</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Contract Order Value</span>
                      <span className="text-emerald-400 font-bold">₹30.0L</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Scheduled Collection</span>
                      <span className="text-orange-400 font-bold">Day {collectionDayTotal}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Supplier Delay Shift</span>
                      <span className="text-amber-400 font-bold">+{supplierDelayDays} days</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-white/60">Cash Impact</span>
                      <span className="text-emerald-400 font-extrabold">+₹30.0L Delayed Inflow</span>
                    </div>
                  </div>
                </>
              )}

              {selectedNode === 'CASH' && (
                <>
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <DollarSign className="w-6 h-6 text-orange-400" />
                    <div>
                      <h3 className="text-lg font-bold text-white">05 — CASH RESERVOIR METRICS</h3>
                      <p className="text-xs text-white/50">Primary Liquidity Core</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Current Cash</span>
                      <span className="text-white font-bold">{formatINR(currentCash)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Safety Floor</span>
                      <span className="text-emerald-400 font-bold">{formatINR(cashFloor)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Projected Minimum</span>
                      <span className={`font-bold ${scenarioMinCash < cashFloor ? 'text-red-400' : 'text-emerald-400'}`}>{formatINR(scenarioMinCash)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/60">Liquidity Deficit Gap</span>
                      <span className="text-red-400 font-bold">{formatINR(scenarioLiquidityGap)}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-white/60">Status</span>
                      <span className={`font-extrabold ${hasBreach ? 'text-red-400' : 'text-emerald-400'}`}>
                        {hasBreach ? `LIQUIDITY BREACH ON DAY ${scenarioBreachDay}` : 'SAFE'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => setSelectedNode(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer text-xs uppercase"
              >
                Close Node Inspector
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS BAR: WHAT-IF SIMULATION + SIMULATE BUTTON */}
      <div className={`p-3 font-mono text-xs border-t flex flex-col md:flex-row items-center justify-between gap-3 ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]' : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
      }`}>
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <Sliders className="w-4 h-4 text-[#A1A1AA] shrink-0" />
          <span className="font-medium uppercase shrink-0">Supplier Shock Delay:</span>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={supplierDelayDays}
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
            onClick={() => {
              onSupplierDelayChange(20);
              triggerCausalSimulation();
            }}
            className={`px-3 py-1.5 font-medium text-xs rounded-md transition-opacity cursor-pointer flex items-center gap-1.5 ${
              isLight ? 'bg-[#171717] text-[#FFFFFF] hover:opacity-90' : 'bg-[#EDEDED] text-[#000000] hover:opacity-90'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Simulate +20D Shock</span>
          </button>

          <button
            onClick={() => {
              onSupplierDelayChange(0);
              setIsSimulatingPulse(false);
            }}
            className={`px-3 py-1.5 font-medium text-xs rounded-md border transition-colors cursor-pointer ${
              isLight ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666] hover:bg-[#FAFAFA]' : 'bg-[#111111] border-[#222222] text-[#A1A1AA] hover:bg-[#1A1A1A]'
            }`}
          >
            Reset (0D)
          </button>
        </div>
      </div>

      {/* 90-DAY SPATIAL TIMELINE (UNDERNEATH 3D SCENE) */}
      <div className={`p-4 font-mono text-xs border-t space-y-2 ${
        isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#000000] border-[#222222]'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${isLight ? 'text-[#666666]' : 'text-[#A1A1AA]'}`}>90-DAY EVENT PROPAGATION TIMELINE</span>
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

        {/* Timeline Axis Line & Ticks */}
        <div className={`w-full h-9 rounded border flex items-center px-4 text-xs ${
          isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
        }`}>
          <div className="w-full flex justify-between items-center relative font-mono text-[11px]">
            <div className="flex flex-col items-center">
              <span className={`font-medium ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>TODAY</span>
              <span className={`text-[9px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Day 0</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium text-[#EAB308]">DAY 15</span>
              <span className={`text-[9px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Supplier Pay</span>
            </div>
            {hasBreach && (
              <div className="flex flex-col items-center">
                <span className="px-1.5 py-0.5 rounded border border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444] font-semibold text-[10px]">
                  DAY {scenarioBreachDay} BREACH
                </span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="font-medium text-[#3B82F6]">DAY 30</span>
              <span className={`text-[9px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Production</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium text-[#A1A1AA]">DAY 45</span>
              <span className={`text-[9px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Arrival</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium text-[#22C55E]">DAY 60</span>
              <span className={`text-[9px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>Collection</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`font-medium ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>DAY 90</span>
              <span className={`text-[9px] ${isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}`}>End</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
