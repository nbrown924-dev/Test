'use client'
import { useBuildStore } from '../../../state/useBuildStore'

function Box({ pos=[0,0,0], size=[1,1,1] }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size}/>
      <meshStandardMaterial />
    </mesh>
  )
}

export default function Scene(){
  const { platform, selectedParts } = useBuildStore()
  const tankCap = selectedParts?.tank?.params?.capacityGal || 100
  const reelZ = tankCap >= 200 ? -0.6 : -0.45

  return (
    <group>
      {platform === 'UTV' ? <Box pos={[0,0.075,0]} size={[1.2,0.15,1.8]} /> : <Box pos={[0,0.1,0]} size={[1.8,0.2,2.6]} />}
      {selectedParts?.tank && <Box pos={[0,0.35,0]} size={[0.9,0.5,0.9]}/>}
      {selectedParts?.reel && <Box pos={[0,0.6,reelZ]} size={[0.5,0.25,0.4]}/>}
      {selectedParts?.pump && <Box pos={[0.55,0.35,0.0]} size={[0.5,0.25,0.4]}/>}
      {selectedParts?.foam && <Box pos={[0.55,0.6,-0.2]} size={[0.35,0.2,0.35]}/>}
      {selectedParts?.box_left && <Box pos={[-0.7,0.45,0.0]} size={[0.4,0.35,0.9]}/>}
      {selectedParts?.box_right && <Box pos={[0.7,0.45,0.0]} size={[0.4,0.35,0.9]}/>}
    </group>
  )
}
