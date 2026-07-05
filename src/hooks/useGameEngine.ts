import { useRef, useCallback, useEffect } from 'react';
import { GameEngine } from '../core/engine/GameEngine';

export function useGameEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onUpdate: (dt: number) => void,
  onRender: (ctx: CanvasRenderingContext2D) => void,
) {
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine();
    engineRef.current = engine;
    engine.start(canvas, onUpdate, onRender);
    return () => engine.stop();
  }, [canvasRef, onUpdate, onRender]);

  const pause = useCallback(() => engineRef.current?.pause(), []);
  const resume = useCallback(() => engineRef.current?.resume(), []);

  return { pause, resume };
}
