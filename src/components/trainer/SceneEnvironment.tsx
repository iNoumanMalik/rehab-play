import { ContactShadows } from '@react-three/drei';

/** Warm, premium physio-studio backdrop — matches the app's terracotta/cream brand palette. */
export function SceneEnvironment() {
  return (
    <>
      <color attach="background" args={['#1a120e']} />
      <fog attach="fog" args={['#1a120e', 8, 22]} />

      {/* Key light — warm, slightly above and to the front-side of the avatar. */}
      <directionalLight
        position={[3, 5, 4]}
        intensity={2.2}
        color="#ffe4d1"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0004}
      />
      {/* Fill light — cool, low intensity, opposite the key, keeps shadows from crushing to black. */}
      <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#8fb8d9" />
      {/* Rim light — separates the avatar silhouette from the dark backdrop. */}
      <pointLight position={[0, 3, -4]} intensity={3} color="#f0997d" distance={10} decay={2} />
      <ambientLight intensity={0.25} color="#fff8f0" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#2b1f19" roughness={0.35} metalness={0.15} />
      </mesh>
      <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={8} blur={2.2} far={3} color="#000000" />
    </>
  );
}
