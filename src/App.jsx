import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, Float, Center, useGLTF } from '@react-three/drei';
import { Users, Award, Shield, Cpu, Wind, Wrench, X, ChevronRight, ExternalLink } from 'lucide-react';
import * as THREE from 'three';

// ==========================================
// 1. DANE DZIAŁÓW, CZŁONKÓW I SPONSORÓW
// ==========================================
const HOTSPOTS_DATA = [
  {
    id: 'aero-front',
    title: 'Pakiet Aerodynamiczny (Front Wing)',
    department: 'Dział Aerodynamiki & Kompozytów',
    position: [0, 0.4, 2.3], // Współrzędne [X, Y, Z] w przestrzeni 3D
    icon: Wind,
    color: 'emerald',
    description: 'Wieloelementowe skrzydło przednie zoptymalizowane pod kątem generowania docisku przy niskich prędkościach (Autocross) oraz kierowania strugi wokół przednich kół.',
    specs: [
      { label: 'Docisk przy 60 km/h', val: '380 N' },
      { label: 'Waga pakietu', val: '2.8 kg (Prepreg Carbon)' },
      { label: 'Oprogramowanie CFD', val: 'ANSYS Fluent' },
    ],
    team: [
      { name: 'Kamil Nowak', role: 'Team Leader Aero' },
      { name: 'Zofia Wiśniewska', role: 'CFD & Surface Optimization' },
      { name: 'Piotr Zieliński', role: 'Wytwarzanie Kompozytów' },
    ],
    sponsors: [
      { name: 'CarbonTech Composites', contribution: 'Dostawa prepregu węglowego i autoklaw', tier: 'Główny Sponsor Działu' },
      { name: 'Altair / Ansys', contribution: 'Licencje na symulacje aerodynamiczne', tier: 'Partner Technologiczny' },
    ]
  },
  {
    id: 'powertrain-inverter',
    title: 'Akumulator HV & Układ Napędowy',
    department: 'Dział Powertrain & Elektroniki',
    position: [0, 0.7, -0.4],
    icon: Cpu,
    color: 'amber',
    description: 'Bateria trakcyjna 400V o pojemności 6.8 kWh oparta na ogniwach cylindrycznych 21700 z autorskim systemem BMS oraz chłodzeniem cieczowym.',
    specs: [
      { label: 'Napięcie znamionowe', val: '400 V' },
      { label: 'Moc maksymalna', val: '80 kW (Regulamin FS)' },
      { label: 'Moment obrotowy', val: '210 Nm na kołach' },
    ],
    team: [
      { name: 'Michał Lewandowski', role: 'BMS & HV Architecture' },
      { name: 'Anna Kowalska', role: 'Thermal Management' },
      { name: 'Jan Dąbrowski', role: 'Wiązki i Telemetria' },
    ],
    sponsors: [
      { name: 'CellEnergy Polska', contribution: 'Ogniwa Li-Ion 21700', tier: 'Sponsor Strategiczny' },
      { name: 'Phoenix Contact', contribution: 'Złącza przemysłowe i okablowanie HV', tier: 'Partner' },
    ]
  },
  {
    id: 'suspension-front',
    title: 'Zawieszenie Przednie & Kinematyka',
    department: 'Dział Konstrukcji & Zawieszenia',
    position: [0.95, 0.45, 1.2],
    icon: Wrench,
    color: 'sky',
    description: 'Układ z podwójnymi wahaczami poprzecznymi z rur ze stali chromowo-molibdenowej (4130), push-rod z regulowanymi amortyzatorami Öhlins TTX25.',
    specs: [
      { label: 'Konstrukcja', val: 'Podwójne wahacze, Push-rod' },
      { label: 'Amortyzatory', val: 'Öhlins TTX25 (Custom revalved)' },
      { label: 'Zwrotnice', val: 'Frezowane CNC Aluminium 7075-T6' },
    ],
    team: [
      { name: 'Tomasz Majewski', role: 'Kinematyka & Nastawy torowe' },
      { name: 'Bartosz Krawczyk', role: 'Projekt zwrotnic i piast CNC' },
    ],
    sponsors: [
      { name: 'MetalCNC Sp. z o.o.', contribution: 'Precyzyjna obróbka 5-osiowa zwrotnic', tier: 'Partner Produkcyjny' },
      { name: 'Öhlins Racing', contribution: 'Wsparcie techniczne amortyzatorów', tier: 'Partner Technologiczny' },
    ]
  },
  {
    id: 'chassis-monocoque',
    title: 'Monocoque z Włókna Węglowego',
    department: 'Dział Podwozia i Struktur Nośnych',
    position: [0, 0.85, 0.5],
    icon: Shield,
    color: 'rose',
    description: 'Jednoczęściowa struktura samonośna z przekładką aramidową Nomex, spełniająca rygorystyczne testy zgnieceniowe i zderzeniowe SES Formuły Student.',
    specs: [
      { label: 'Masa monocoque', val: '19.4 kg' },
      { label: 'Sztywność skrętna', val: '2400 Nm/deg' },
      { label: 'Pochłaniacz energii', val: 'Aluminiowy honeycomb crash-box' },
    ],
    team: [
      { name: 'Jakub Wójcik', role: 'Obliczenia MES / FEA' },
      { name: 'Aleksandra Kozłowska', role: 'Projekt struktur nośnych' },
    ],
    sponsors: [
      { name: 'Hexcel Composites', contribution: 'Materiały rdzeniowe Nomex', tier: 'Sponsor Materiałowy' },
      { name: 'Wydział Mechaniczny PW/AGH', contribution: 'Dostęp do maszyn wytrzymałościowych', tier: 'Partner Akademicki' },
    ]
  }
];
// ==========================================
// 2. MODEL 3D BOLIDU ORAZ INTERAKTYWNE CZĘŚCI
// ==========================================

// Materiał obwódki - pomarańczowy, renderowany od tyłu (backside) i lekko powiększony
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: '#f97316',
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.6,
});

// Komponent jednej interaktywnej części bolidu
function InteractivePart({ id, activeId, onSelect, meshes, outlineScale = 1.01 }) {
  const [hovered, setHovered] = useState(false);
  const isActive = activeId === id;
  const showOutline = hovered || isActive;
  const groupRef = useRef();

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => { document.body.style.cursor = 'auto'; };
  }, [hovered]);

  // Delikatna animacja emisji przy hover/active
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child) => {
      if (child.isMesh && child.material && child.material !== outlineMaterial && child.material.emissive) {
        const target = showOutline ? 0.15 : 0;
        child.material.emissiveIntensity = THREE.MathUtils.lerp(
          child.material.emissiveIntensity || 0,
          target,
          delta * 8
        );
        child.material.emissive = new THREE.Color('#f97316');
      }
    });
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect(HOTSPOTS_DATA.find((h) => h.id === id));
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      <group ref={groupRef}>
        {/* Oryginalne meshe */}
        {meshes.map((mesh, i) => (
          <primitive key={`mesh-${id}-${i}`} object={mesh} />
        ))}

        {/* Pomarańczowa obwódka (widoczna tylko przy hover/active) */}
        {showOutline && meshes.map((mesh, i) => (
          <mesh
            key={`outline-${id}-${i}`}
            geometry={mesh.geometry}
            material={outlineMaterial}
            position={mesh.position}
            rotation={mesh.rotation}
            scale={mesh.scale.clone().multiplyScalar(outlineScale)}
          />
        ))}
      </group>
    </group>
  );
}

// Mapowanie indeksów meshy z modelu na identyfikatory sekcji
// Mesh 0 = kadłub/monocoque (największy), Mesh 1 = element aero, Mesh 2-5 = opony
const MESH_TO_PART = {
  0: 'chassis-monocoque',
  1: 'aero-front',
  2: 'suspension-front',
  3: 'suspension-front',
  4: 'suspension-front',
  5: 'suspension-front',
};

function BolideModel({ activeId, onSelect }) {
  useGLTF.preload('/F1_Car.glb');
  const { scene } = useGLTF('/F1_Car.glb');
  const [partGroups, setPartGroups] = useState({});
  const [centerOffset, setCenterOffset] = useState([0, 0, 0]);

  useEffect(() => {
    const allMeshes = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        allMeshes.push(child);
      }
    });

    // Oblicz bounding box całej sceny, aby ręcznie wycentrować
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    setCenterOffset([-center.x, -center.y, -center.z]);

    const groups = {};
    allMeshes.forEach((mesh, index) => {
      const partId = MESH_TO_PART[index] || 'chassis-monocoque';
      if (!groups[partId]) groups[partId] = [];
      groups[partId].push(mesh);
    });

    setPartGroups(groups);
  }, [scene]);

  return (
    <group scale={0.012} rotation={[0, Math.PI, 0.07]}>
      <group position={centerOffset}>
        {Object.entries(partGroups).map(([partId, meshes]) => (
          <InteractivePart
            key={partId}
            id={partId}
            activeId={activeId}
            onSelect={onSelect}
            meshes={meshes}
            outlineScale={1.01}
          />
        ))}
      </group>
    </group>
  );
}

// ==========================================
// 4. GŁÓWNY KOMPONENT APLIKACJI
// ==========================================
export default function FormulaStudentShowcase() {
  const [selectedPart, setSelectedPart] = useState(null);
  const [cameraMode, setCameraMode] = useState('free'); // 'free' lub 'focus'

  return (
    
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      
      {/* GÓRNY PASEK ZESPOŁU */}
      <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-8 py-5 pointer-events-none bg-gradient-to-b from-slate-950 via-slate-950/60 to-transparent">
        <div className="pointer-events-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl text-black shadow-lg shadow-cyan-500/20">
            FS
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase">PROTON DYNAMIC</h1>
            <p className="text-xs text-cyan-400 font-mono tracking-widest">BOLID ELEKTRYCZNY 2026 • E84</p>
          </div>
        </div>

        <div className="pointer-events-auto hidden md:flex items-center gap-6 text-xs font-mono text-slate-400">
          <span>Obracaj myszką: <b className="text-white">LPM</b></span>
          <span>Zoom: <b className="text-white">Scroll</b></span>
          <span className="px-3 py-1 rounded bg-cyan-950/50 border border-cyan-800/40 text-cyan-300">
            Kliknij punkt, aby poznać dział i sponsorów
          </span>
        </div>
      </header>

      {/* SCENA 3D (THREE.JS / R3F) */}
      <div className="w-full h-full bg-[url(/team-foto.jpg)] bg-contain">
        <Canvas
          camera={{ position: [3.5, 0.5, 4.0], fov: 42 }}
          onPointerDown={() => {
            // Kliknięcie w pustą przestrzeń może zamknąć szczegóły
            // setSelectedPart(null);
          }}
        >
          <OrbitControls 
  minPolarAngle={Math.PI / 2} 
  maxPolarAngle={Math.PI / 2} 
/>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 10]} intensity={1.4} castShadow />
          <directionalLight position={[-10, 5, -10]} intensity={0.5} color="#38bdf8" />
          
          <Environment preset="city" />

          {/* Model bolidu */}
          <Suspense fallback={null}>
            <BolideModel 
              activeId={selectedPart?.id}
              onSelect={(part) => setSelectedPart(part)}
            />
          </Suspense>

          {/* Miękki cień pod bolidem */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.8}
            scale={8}
            blur={2.0}
            far={4}
          />

          {/* Kontrolki obrotu 360 */}
          <OrbitControls
            target={[0, 0, 0]}
            enablePan={false}
            minDistance={2.5}
            maxDistance={7.5}
            maxPolarAngle={Math.PI / 2 - 0.05} // Nie pozwala wjechać kamerą pod podłogę
            autoRotate={!selectedPart} // Obraca się automatycznie, dopóki użytkownik nie kliknie w dział
            autoRotateSpeed={0.8}
          />
        </Canvas>
      </div>

      {/* BOCZNY PANEL INFORMACYJNY (Gdy wybrano część) */}
      {selectedPart && (
        <aside className="absolute top-24 right-6 bottom-6 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl z-30 p-6 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-8 duration-300">
          
          {/* Header panelu */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                {selectedPart.department}
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                {selectedPart.title}
              </h2>
            </div>
            <button
              onClick={() => setSelectedPart(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-6 custom-scrollbar text-sm">
            
            {/* Opis inżynieryjny */}
            <p className="text-slate-300 leading-relaxed">
              {selectedPart.description}
            </p>

            {/* Specyfikacja techniczna */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold mb-3 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                Specyfikacja Techniczna
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {selectedPart.specs.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-slate-400 text-xs">{s.label}</span>
                    <span className="font-mono font-semibold text-cyan-300 text-xs">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Członkowie zespołu */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Twórcy / Zespół Projektowy
              </h3>
              <div className="space-y-2">
                {selectedPart.team.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/80">
                    <div>
                      <p className="font-semibold text-slate-200 text-xs">{member.name}</p>
                      <p className="text-[11px] text-slate-400">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsorzy wspierający ten podzespół */}
            <div>
              <h3 className="text-xs font-mono uppercase text-slate-400 font-bold mb-3 flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Sponsorzy & Partnerzy tego Działu
              </h3>
              <div className="space-y-2">
                {selectedPart.sponsors.map((spon, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-amber-300 text-xs">{spon.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {spon.tier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      <b className="text-slate-400">Wkład:</b> {spon.contribution}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Stopka panelu - CTA dla nowych sponsorów lub rekrutacji */}
          <div className="pt-3 border-t border-slate-800">
            <button className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
              Zostań Sponsorem Tego Działu
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </aside>
      )}

      {/* SZYBKA LISTA DZIAŁÓW NA DOLE EKRANU */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 max-w-[90vw] overflow-x-auto">
        {HOTSPOTS_DATA.map((spot) => (
          <button
            key={spot.id}
            onClick={() => setSelectedPart(spot)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedPart?.id === spot.id
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {spot.title.split('(')[0]}
          </button>
        ))}
      </nav>

    </div>
  );
}