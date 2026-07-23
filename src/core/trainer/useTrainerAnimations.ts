import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useFrame, useLoader } from '@react-three/fiber';
import { EXERCISE_CLIPS, IDLE_CLIP } from './manifest';
import { CROSSFADE_SECONDS } from './types';

/**
 * Loads the base avatar (Idle.fbx) once and pulls a bare AnimationClip out of
 * every other FBX in the trainer folder, binding them all to the same
 * skeleton/mixer. Mixamo exports of the same rig share bone names, so a clip
 * baked into one file's export plays correctly on another file's mesh.
 */
export function useTrainerAnimations() {
  const idleFbx = useLoader(FBXLoader, IDLE_CLIP.url);
  const exerciseFbxList = useLoader(
    FBXLoader,
    useMemo(() => EXERCISE_CLIPS.map(clip => clip.url), []),
  );

  const model = useMemo(() => {
    // Mixamo FBX exports are in centimeters — bake the conversion to meters
    // directly onto the model so there's no extra wrapping group to reason about.
    idleFbx.scale.setScalar(0.01);
    idleFbx.traverse(node => {
      if ((node as THREE.Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return idleFbx;
  }, [idleFbx]);

  const clipsById = useMemo(() => {
    const map = new Map<string, THREE.AnimationClip>();
    const idleClip = idleFbx.animations[0];
    if (idleClip) map.set(IDLE_CLIP.id, idleClip);
    EXERCISE_CLIPS.forEach((meta, i) => {
      const clip = exerciseFbxList[i]?.animations[0];
      if (clip) map.set(meta.id, clip);
    });
    return map;
  }, [idleFbx, exerciseFbxList]);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    actionsRef.current = new Map();
    currentActionRef.current = null;
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  }, [model]);

  const getAction = (clipId: string): THREE.AnimationAction | null => {
    const mixer = mixerRef.current;
    if (!mixer) return null;
    const cached = actionsRef.current.get(clipId);
    if (cached) return cached;
    const clip = clipsById.get(clipId);
    if (!clip) return null;
    const action = mixer.clipAction(clip);
    actionsRef.current.set(clipId, action);
    return action;
  };

  const playClip = (clipId: string, fadeSeconds = CROSSFADE_SECONDS) => {
    const next = getAction(clipId);
    if (!next || currentActionRef.current === next) return;
    next.reset().setEffectiveWeight(1).fadeIn(fadeSeconds).play();
    currentActionRef.current?.fadeOut(fadeSeconds);
    currentActionRef.current = next;
  };

  const setFrozen = (frozen: boolean) => {
    if (mixerRef.current) mixerRef.current.timeScale = frozen ? 0 : 1;
  };

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
  });

  return { model, playClip, setFrozen, ready: clipsById.size > 0 };
}
