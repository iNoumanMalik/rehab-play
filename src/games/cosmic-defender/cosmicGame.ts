import type { PoseData } from '../../types';
import { Scene, type SceneState } from '../../core/engine/Scene';
import { ParticleSystem } from '../../core/engine/ParticleSystem';
import { ComboSystem } from '../../core/engine/ComboSystem';
import { Renderer } from '../../core/engine/Renderer';
import { audioManager } from '../../core/services/AudioManager';
import { settingsStore } from '../../core/services/SettingsStore';
import { AmbientField } from '../../core/engine/AmbientField';
import { EncounterDirector } from '../../core/engine/EncounterDirector';
import { PowerUpManager } from '../../core/engine/PowerUpManager';
import { GestureEngine, type GestureFrame, type HandSide } from '../../core/movement/GestureEngine';
import { reachExtension, wristToScreen, upperBodyTracked, handHitRadius } from '../../core/exercise';
import { danger, safe, warn } from '../../core/engine/palette';
import type { ExerciseDefinition, ExerciseFrame, GameRegistration } from '../../core/exercise';

export const cosmicExercise: ExerciseDefinition = {
  id: 'cosmic-defender',
  name: 'Cosmic Defender',
  rehabFocus: 'Reaction time, reach, lean, head mobility & shoulder circles',
  mode: 'reach',
  effort: (lm) => Math.max(reachExtension(lm, 'left'), reachExtension(lm, 'right')),
  engageThreshold: 0.3,
  repThreshold: 0.85,
  releaseThreshold: 0.28,
  minHoldMs: 0,
  // Punching/pushing is SUPPOSED to be fast here — never flag speed.
  maxRepVelocity: 40,
  // Leaning is a dodge input in this game, so it must not be a compensation.
  checkTrunkLean: false,
  checkAsymmetry: false,
  maxTrunkLeanDeg: 90,
  maxAsymmetry: 2,
  coachRules: [
    { id: 'fire', severity: 'cue', test: (c) => (c.phase === 'idle' && c.activation < 0.2 ? 'Reach toward a target, then push out fast to fire' : null) },
  ],
  calibration: {
    neutralPrompt: 'Rest your hands close to your chest',
    maxPrompt: 'Push one arm straight out, as far as you can',
  },
};

// ---------------------------------------------------------------------------

type EnemyKind =
  | 'drone' | 'interceptor' | 'bomber' | 'missile' | 'bomb' | 'asteroid'
  | 'fragment' | 'mine' | 'cloaked' | 'turret' | 'generator' | 'mothership';

interface Enemy {
  kind: EnemyKind;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  health: number; maxHealth: number;
  active: boolean;
  seed: number;
  hitTime: number;
  /** cloaked: visible until this time. turret: phase timer. bomber: bomb timer. */
  t1: number;
  /** turret: 0 idle, 1 telegraph, 2 firing. generator: orbit angle. */
  t2: number;
  side: 'left' | 'right';
}

interface Bolt {
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;
  plasma: boolean;
  life: number;
}

interface Shockwave { x: number; y: number; r: number; maxR: number; color: string; life: number; }

interface Core { x: number; y: number; drift: number; golden: boolean; side: 'left' | 'right'; active: boolean; pulse: number; }

type CapsuleKind = 'overdrive' | 'slowmo' | 'surge' | 'repair';
interface Capsule { x: number; y: number; kind: CapsuleKind; active: boolean; pulse: number; }

const CAPSULE_STYLE: Record<CapsuleKind, { color: string; label: string }> = {
  overdrive: { color: '#40C4FF', label: 'OVERDRIVE' },
  slowmo: { color: '#B388FF', label: 'TIME DILATION' },
  surge: { color: '#FFD740', label: 'SCORE SURGE' },
  repair: { color: '#69F0AE', label: 'HULL REPAIR' },
};

const SCORE: Partial<Record<EnemyKind, number>> = {
  drone: 25, interceptor: 40, bomber: 120, missile: 30, bomb: 15, asteroid: 45,
  fragment: 15, mine: 20, cloaked: 55, turret: 90, generator: 150, mothership: 600,
};

const BOSS_HP = 26;
const LASER_CHARGE_SEC = 1.3;
const LASER_FIRE_SEC = 1.5;
const VICTORY_SEQUENCE_SEC = 2.2;
const STATION_DODGE_RANGE = 0.17; // fraction of width the station can shift per side

/**
 * Cosmic Defender — the whole session is one continuous escalation authored
 * as ~13 encounter beats (a new mechanic every 20–30s). Every rehab movement
 * is a combat verb: reach = aim, push = fire, cross-body = salvage cores,
 * lean = evasive thrusters, overhead = shields / laser charge, head turns =
 * radar sweeps, arm circles = reactor repair.
 */
export class CosmicScene extends Scene {
  private director = new EncounterDirector([
    { id: 'onboard', startsAt: 0, label: 'Defense Grid Online', objective: 'Reach toward a drone and push out fast to fire' },
    { id: 'interceptors', startsAt: 26, label: 'Interceptor Wing', objective: 'Track the fast interceptors — aim and fire' },
    { id: 'missiles', startsAt: 54, label: 'Missile Barrage', objective: 'Lean left or right to dodge the homing missiles' },
    { id: 'cores', startsAt: 82, label: 'Power Core Salvage', objective: 'Reach ACROSS your body to grab the drifting cores' },
    { id: 'asteroids', startsAt: 108, label: 'Asteroid Field', objective: 'Blast the asteroids — watch for the fragments' },
    { id: 'turrets', startsAt: 136, label: 'Turret Ambush', objective: 'Raise an arm overhead to shield against the beams' },
    { id: 'storm', startsAt: 164, label: 'Ion Storm', objective: 'Turn your head to sweep the radar and reveal cloaked ships' },
    { id: 'reactor', startsAt: 192, label: 'Reactor Failure', objective: 'Circle your arm like a crank to spin the repair rotor' },
    { id: 'swarm', startsAt: 218, label: 'Drone Swarm', objective: 'Push BOTH arms out together to fire the EMP pulse' },
    { id: 'bonus', startsAt: 244, label: 'Overcharge Bonus', objective: 'Time dilation active — salvage everything!' },
    { id: 'bombers', startsAt: 268, label: 'Heavy Bombers', objective: 'Hold BOTH arms overhead to charge the laser cannon' },
    { id: 'mothership', startsAt: 300, label: 'Mothership Detected', objective: 'Destroy the shield generators guarding the mothership' },
    { id: 'finale', startsAt: 340, label: 'Final Assault', objective: 'The core is exposed — unleash everything!' },
  ]);

  private gestures = new GestureEngine();
  private particles = new ParticleSystem();
  private combo = new ComboSystem();
  private powerUps = new PowerUpManager();
  private ambient = new AmbientField({ kind: 'mote', colors: ['#40C4FF', '#B388FF', '#80DEEA'], count: 30, maxAlpha: 0.35 });

  private enemies: Enemy[] = [];
  private bolts: Bolt[] = [];
  private shockwaves: Shockwave[] = [];
  private cores: Core[] = [];
  private capsules: Capsule[] = [];
  private stars: { x: number; y: number; z: number; tw: number }[] = [];

  private score = 0;
  private success = 0;
  private attempts = 0;
  private integrity = 100;
  private elapsed = 0;
  private worldTime = 0;
  private lastSpawn = 0;
  private over = false;
  private won = false;
  private feedback: string[] = [];
  private successPulse = false;
  private guidance: { x: number; y: number } | null = null;
  private objective = 'Reach toward a drone and push out fast to fire';
  private shake = 0;
  private flash = 0;

  // Station & movement state
  private stationX = 0;
  private gesture: GestureFrame | null = null;
  private crosshair = { x: 0, y: 0 };

  // Weapons
  private plasmaUnlocked = false;
  private empCharges = 0;
  private laserUnlocked = false;
  private laserCharge = 0;
  private laserFiring = 0;
  private laserDir = { x: 0, y: -1 };
  private autoFireTimer = 0;

  // Shield
  private shieldEnergy = 100;
  private shieldActive = false;
  private shieldBlockFlash = 0;

  // Radar / storm
  private scanCooldown = 0;
  private scanFlash = 0;

  // Reactor repair
  private repairProgress = 0;
  private repairDone = false;
  private rotorAngle = 0;

  // Boss
  private bossDefeated = false;
  private victoryTimer = 0;

  private hintCooldown = 0;

  init(width: number, height: number): void {
    super.init(width, height);
    this.stationX = width / 2;
    this.crosshair = { x: width / 2, y: height * 0.4 };
    this.stars = [];
    const count = settingsStore.get().reducedMotion ? 40 : 110;
    for (let i = 0; i < count; i++) {
      this.stars.push({ x: Math.random() * width, y: Math.random() * height, z: 0.3 + Math.random() * 0.7, tw: Math.random() * Math.PI * 2 });
    }
  }

  // ------------------------------------------------------------------ update

  update(dt: number, _frame: ExerciseFrame, pose: PoseData | null): void {
    void _frame; // gestures are read directly off the pose — richer than one activation channel
    this.elapsed += dt;
    this.ambient.update(dt, this.width, this.height);
    this.successPulse = false;
    this.feedback = [];
    this.shake = Math.max(0, this.shake - dt * 3.2);
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.shieldBlockFlash = Math.max(0, this.shieldBlockFlash - dt * 3);
    this.scanFlash = Math.max(0, this.scanFlash - dt);
    this.hintCooldown = Math.max(0, this.hintCooldown - dt);
    this.updateShockwaves(dt);

    if (this.over) { this.particles.update(dt); return; }

    if (this.bossDefeated) {
      this.victoryTimer += dt;
      this.particles.update(dt);
      if (Math.random() < dt * 4) {
        this.particles.emitBurst(Math.random() * this.width, Math.random() * this.height * 0.6,
          { colors: ['#FFD740', '#40C4FF', '#B388FF', '#69F0AE'], count: 12, speed: 80, lifetime: 0.9 });
      }
      if (this.victoryTimer >= VICTORY_SEQUENCE_SEC) { this.over = true; this.won = true; }
      return;
    }

    const slow = this.powerUps.isActive('slowmo') || this.director.current().id === 'bonus';
    const timeScale = slow ? 0.6 : 1;
    const wdt = dt * timeScale;
    this.worldTime += wdt;

    this.combo.update(dt);
    this.powerUps.update(this.elapsed);
    this.director.update(this.elapsed);
    const beat = this.director.current();
    const entered = this.director.justEntered();
    if (entered) this.onBeatEnter(entered.id, entered.label);
    this.objective = this.dynamicObjective(beat.id);

    // --- Read the body ----------------------------------------------------
    const g = this.gestures.update(dt, pose, this.width, this.height);
    this.gesture = g;
    const lm = pose?.predictedLandmarks ?? [];
    const tracked = pose != null && upperBodyTracked(lm);

    if (g.aim) {
      // Smooth crosshair toward the reaching hand.
      this.crosshair.x += (g.aim.x - this.crosshair.x) * Math.min(1, dt * 14);
      this.crosshair.y += (g.aim.y - this.crosshair.y) * Math.min(1, dt * 14);
    }

    // Evasive thrusters: lean steers the station.
    const leanNorm = Math.max(-1, Math.min(1, g.leanDeg / 16));
    const targetX = this.width / 2 + leanNorm * this.width * STATION_DODGE_RANGE;
    this.stationX += (targetX - this.stationX) * Math.min(1, dt * 6);

    // Shield: any arm overhead (also stays up while charging the laser).
    const wantShield = g.overheadCount >= 1 && this.shieldEnergy > 4;
    if (wantShield && !this.shieldActive) audioManager.playTone(520, 0.12, 'triangle', 0.3);
    this.shieldActive = wantShield;
    this.shieldEnergy = Math.max(0, Math.min(100,
      this.shieldEnergy + (this.shieldActive ? -22 : 15) * dt));

    // Laser cannon: both arms overhead, sustained.
    if (this.laserUnlocked && this.laserFiring <= 0) {
      if (g.overheadCount === 2) {
        const prev = this.laserCharge;
        this.laserCharge = Math.min(1, g.overheadHoldSec / LASER_CHARGE_SEC);
        if (this.laserCharge >= 1 && prev < 1) this.fireLaser();
      } else {
        this.laserCharge = Math.max(0, this.laserCharge - dt * 1.4);
      }
    }
    if (this.laserFiring > 0) {
      this.laserFiring -= dt;
      this.applyLaserDamage(wdt);
    }

    // Fire on push.
    for (const side of g.pushes) this.fireBolt(side);
    if (g.doublePush && this.empCharges > 0) this.fireEmp();

    // Overdrive: sustained aim auto-fires.
    if (this.powerUps.isActive('overdrive')) {
      this.autoFireTimer -= dt;
      if (this.autoFireTimer <= 0 && g.reach > 0.5) {
        this.autoFireTimer = 0.24;
        this.fireBolt(g.aimSide, true);
      }
    }

    // Reactor repair (arm circles) — active during the reactor beat.
    if (beat.id === 'reactor' && !this.repairDone) {
      if (g.rotationSpeed > 1.1) {
        this.rotorAngle += g.rotationSpeed * wdt;
        this.repairProgress = Math.min(1, this.repairProgress + (g.rotationSpeed / (Math.PI * 4)) * wdt);
        if (Math.random() < dt * 6) {
          this.particles.emit(this.width / 2, this.height * 0.42, { color: '#69F0AE', count: 2, speed: 60, lifetime: 0.5 });
        }
        if (this.repairProgress >= 1) this.completeRepair();
      }
    }

    // Radar scan (look up) during storm & boss beats.
    this.scanCooldown = Math.max(0, this.scanCooldown - dt);
    if (g.lookUp && this.scanCooldown <= 0 && (beat.id === 'storm' || beat.id === 'mothership' || beat.id === 'finale')) {
      this.scanCooldown = 6;
      this.scanFlash = 1;
      this.score += 40;
      this.successPulse = true;
      audioManager.playTone(980, 0.18, 'sine', 0.35);
      this.feedback = ['Deep scan — all contacts revealed!'];
      for (const e of this.enemies) if (e.kind === 'cloaked') e.t1 = this.elapsed + 5;
    }

    // Radar cone passively reveals cloaked ships.
    if (beat.id === 'storm' || beat.id === 'finale') this.applyRadarReveal(g.headYaw);

    // --- Spawning ----------------------------------------------------------
    const assist = this.integrity < 40 ? 1.35 : 1; // struggling → gentler pacing
    if (this.elapsed - this.lastSpawn > this.spawnInterval(beat.id) * assist) {
      this.lastSpawn = this.elapsed;
      this.spawnForBeat(beat.id);
    }

    // --- Simulate entities ---------------------------------------------------
    this.updateEnemies(wdt, beat.id);
    this.updateBolts(wdt);
    this.updateCores(wdt, g, lm, tracked);
    this.updateCapsules(wdt, lm, tracked);
    this.particles.update(dt);

    // Guidance arrow: the thing the body should reach for right now.
    this.guidance = this.pickGuidance(beat.id);

    // Contextual hints (rate-limited).
    this.maybeHint(beat.id, g);

    if (this.integrity <= 0 && !this.over) {
      this.over = true;
      this.won = false;
      audioManager.playGameOver();
    }
  }

  // ---------------------------------------------------------------- beats

  private onBeatEnter(id: string, label: string): void {
    this.feedback = [label];
    this.flash = 0.5;
    audioManager.playTone(330, 0.14, 'triangle', 0.3);
    window.setTimeout(() => audioManager.playTone(494, 0.2, 'triangle', 0.3), 130);

    if (id === 'missiles') {
      audioManager.playTone(220, 0.3, 'square', 0.2);
    }
    if (id === 'bombers') this.laserUnlocked = true;
    if (id === 'swarm' && this.empCharges === 0) this.empCharges = 1; // never gate the beat on earlier success
    if (id === 'bonus') {
      this.powerUps.activate('surge', 'Score Surge', 24, this.elapsed);
    }
    if (id === 'mothership') {
      this.spawnMothership();
    }
    if (id === 'finale') {
      // Guarantee the finale is winnable: generators fall with the beat.
      for (const e of this.enemies) if (e.kind === 'generator') this.killEnemy(e, false);
      this.laserUnlocked = true;
      if (this.empCharges === 0) this.empCharges = 1;
    }
  }

  private dynamicObjective(beatId: string): string {
    if (beatId === 'cores' && this.cores.some(c => c.active)) {
      const c = this.cores.find(c => c.active)!;
      return c.side === 'left' ? 'Core on the LEFT — reach across with your RIGHT arm' : 'Core on the RIGHT — reach across with your LEFT arm';
    }
    if (beatId === 'reactor') {
      return this.repairDone ? 'Reactor stable — keep circling for bonus repairs' : 'Circle your arm like a crank to spin the repair rotor';
    }
    if (beatId === 'turrets' && this.enemies.some(e => e.kind === 'turret' && e.t2 === 1)) {
      return 'Beam incoming — arm overhead to shield, or lean away!';
    }
    if (beatId === 'mothership' && !this.enemies.some(e => e.kind === 'generator')) {
      return 'Shields down — hit the mothership core!';
    }
    return this.director.current().objective;
  }

  private maybeHint(beatId: string, g: GestureFrame): void {
    if (this.feedback.length || this.hintCooldown > 0) return;
    const hint = (text: string) => { this.feedback = [text]; this.hintCooldown = 4; };

    const missileClose = this.enemies.some(e => e.kind === 'missile' && e.y > this.height * 0.45);
    if (missileClose && Math.abs(g.leanDeg) < 4) return hint('Missile locked on — lean away from it!');
    if (beatId === 'swarm' && this.empCharges > 0 && this.enemies.filter(e => e.active).length > 6) {
      return hint('Swarm detected — push BOTH arms out for the EMP!');
    }
    if (beatId === 'bombers' && this.laserCharge === 0 && this.enemies.some(e => e.kind === 'bomber')) {
      return hint('Bomber armor is heavy — charge the laser overhead');
    }
  }

  // ---------------------------------------------------------------- weapons

  private fireBolt(side: HandSide, silent = false): void {
    const sx = this.stationX;
    const sy = this.height - 46;
    const dx = this.crosshair.x - sx;
    const dy = this.crosshair.y - sy;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = 950;
    this.attempts++;
    this.bolts.push({
      x: sx, y: sy,
      vx: (dx / len) * speed, vy: (dy / len) * speed,
      tx: this.crosshair.x, ty: this.crosshair.y,
      plasma: this.plasmaUnlocked,
      life: 1.2,
    });
    if (!silent) audioManager.playTone(this.plasmaUnlocked ? 620 : 760, 0.07, 'square', 0.22);
    void side;
  }

  private fireEmp(): void {
    this.empCharges--;
    this.shake = Math.min(1, this.shake + 0.5);
    this.successPulse = true;
    this.shockwaves.push({ x: this.stationX, y: this.height - 46, r: 30, maxR: Math.hypot(this.width, this.height), color: '#B388FF', life: 1 });
    audioManager.playTone(180, 0.4, 'sawtooth', 0.4);
    audioManager.playTone(90, 0.6, 'sine', 0.4);
    this.feedback = ['EMP PULSE!'];
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.kind === 'mothership' || e.kind === 'generator') continue;
      if (e.kind === 'missile' || e.kind === 'bomb' || e.kind === 'mine') { this.killEnemy(e, true); continue; }
      e.health -= 3;
      e.hitTime = this.elapsed;
      if (e.health <= 0) this.killEnemy(e, true);
    }
  }

  private fireLaser(): void {
    const sx = this.stationX;
    const sy = this.height - 46;
    const dx = this.crosshair.x - sx;
    const dy = this.crosshair.y - sy;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.laserDir = { x: dx / len, y: dy / len };
    this.laserFiring = LASER_FIRE_SEC;
    this.laserCharge = 0;
    this.shake = Math.min(1, this.shake + 0.4);
    this.flash = 0.6;
    this.feedback = ['LASER CANNON!'];
    audioManager.playTone(140, 0.9, 'sawtooth', 0.35);
    audioManager.playTone(1200, 0.5, 'sine', 0.2);
  }

  private applyLaserDamage(wdt: number): void {
    const sx = this.stationX, sy = this.height - 46;
    const hasGenerators = this.enemies.some(e => e.kind === 'generator' && e.active);
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.kind === 'cloaked' && e.t1 < this.elapsed) continue;
      if (e.kind === 'mothership' && hasGenerators) continue;
      // Distance from enemy to the beam ray.
      const px = e.x - sx, py = e.y - sy;
      const t = Math.max(0, px * this.laserDir.x + py * this.laserDir.y);
      const cx = sx + this.laserDir.x * t, cy = sy + this.laserDir.y * t;
      if (Math.hypot(e.x - cx, e.y - cy) < 60 + e.size * 0.4) {
        e.health -= 7 * wdt;
        e.hitTime = this.elapsed;
        if (Math.random() < wdt * 8) this.particles.emit(e.x, e.y, { color: '#FF5252', count: 2, speed: 90, lifetime: 0.4 });
        if (e.health <= 0) this.killEnemy(e, true);
      }
    }
  }

  // ---------------------------------------------------------------- spawning

  private spawnInterval(beatId: string): number {
    switch (beatId) {
      case 'onboard': return 1.7;
      case 'interceptors': return 1.15;
      case 'missiles': return 2.3;
      case 'cores': return 1.6;
      case 'asteroids': return 1.5;
      case 'turrets': return 1.9;
      case 'storm': return 1.25;
      case 'reactor': return 4.5;
      case 'swarm': return 0.55;
      case 'bonus': return 0.9;
      case 'bombers': return 2.1;
      case 'mothership': return 2.4;
      case 'finale': return 1.5;
      default: return 1.5;
    }
  }

  private spawnForBeat(beatId: string): void {
    const cap = beatId === 'swarm' ? 14 : 9;
    const activeCount = this.enemies.filter(e => e.active).length;

    switch (beatId) {
      case 'onboard':
        if (activeCount < 4) this.spawnEnemy('drone');
        break;
      case 'interceptors':
        if (activeCount < 6) this.spawnEnemy(Math.random() < 0.6 ? 'interceptor' : 'drone');
        break;
      case 'missiles':
        this.spawnEnemy('missile');
        if (Math.random() < 0.5 && activeCount < 6) this.spawnEnemy('drone');
        break;
      case 'cores':
        if (this.cores.filter(c => c.active).length < 2) this.spawnCore(false);
        if (Math.random() < 0.6 && activeCount < 5) this.spawnEnemy(Math.random() < 0.5 ? 'interceptor' : 'drone');
        break;
      case 'asteroids':
        if (activeCount < 7) this.spawnEnemy(Math.random() < 0.65 ? 'asteroid' : 'drone');
        break;
      case 'turrets':
        if (!this.enemies.some(e => e.kind === 'turret')) { this.spawnTurret('left'); this.spawnTurret('right'); }
        if (activeCount < 6 && Math.random() < 0.7) this.spawnEnemy('drone');
        break;
      case 'storm':
        if (activeCount < 8) this.spawnEnemy(Math.random() < 0.55 ? 'cloaked' : 'drone');
        break;
      case 'reactor':
        if (activeCount < 2 && Math.random() < 0.4) this.spawnEnemy('drone');
        break;
      case 'swarm':
        if (activeCount < cap) this.spawnEnemy(Math.random() < 0.85 ? 'drone' : 'mine');
        break;
      case 'bonus':
        if (this.cores.filter(c => c.active).length < 3) this.spawnCore(true);
        if (activeCount < 6) this.spawnEnemy('drone');
        if (this.capsules.filter(c => c.active).length < 1 && Math.random() < 0.4) this.spawnCapsule();
        break;
      case 'bombers':
        if (this.enemies.filter(e => e.kind === 'bomber').length < 2) this.spawnEnemy('bomber');
        if (activeCount < 7 && Math.random() < 0.5) this.spawnEnemy('interceptor');
        break;
      case 'mothership':
      case 'finale': {
        const boss = this.enemies.find(e => e.kind === 'mothership');
        if (!boss) this.spawnMothership();
        if (Math.random() < 0.5 && activeCount < 8) this.spawnEnemy(Math.random() < 0.4 ? 'interceptor' : 'drone');
        if (beatId === 'finale' && Math.random() < 0.3) this.spawnEnemy('missile');
        break;
      }
    }
  }

  private spawnEnemy(kind: EnemyKind): void {
    const x = 50 + Math.random() * (this.width - 100);
    const base: Enemy = {
      kind, x, y: -40, vx: 0, vy: 60, size: 22, health: 1, maxHealth: 1,
      active: true, seed: Math.random() * 1000, hitTime: -1, t1: 0, t2: 0,
      side: Math.random() < 0.5 ? 'left' : 'right',
    };
    switch (kind) {
      case 'drone':
        base.vy = 55 + Math.random() * 35; base.vx = (Math.random() - 0.5) * 40; break;
      case 'interceptor':
        base.vy = 135 + Math.random() * 50; base.vx = (Math.random() - 0.5) * 160; base.size = 19; break;
      case 'bomber':
        base.vy = 22; base.size = 40; base.health = base.maxHealth = 5; base.t1 = 2.5; break;
      case 'missile':
        base.vy = 95 + Math.random() * 25; base.size = 13; break;
      case 'asteroid':
        base.vy = 60 + Math.random() * 30; base.vx = (Math.random() - 0.5) * 50;
        base.size = 34; base.health = base.maxHealth = 2; break;
      case 'mine':
        base.vy = 40; base.vx = (Math.random() - 0.5) * 60; base.size = 16; break;
      case 'cloaked':
        base.vy = 50 + Math.random() * 30; base.size = 21; base.t1 = 0; break;
      default: break;
    }
    this.enemies.push(base);
  }

  private spawnTurret(side: 'left' | 'right'): void {
    this.enemies.push({
      kind: 'turret', x: side === 'left' ? 26 : this.width - 26, y: this.height * (0.3 + Math.random() * 0.2),
      vx: 0, vy: 0, size: 26, health: 3, maxHealth: 3, active: true,
      seed: Math.random() * 1000, hitTime: -1, t1: 2 + Math.random() * 1.5, t2: 0, side,
    });
  }

  private spawnMothership(): void {
    if (this.enemies.some(e => e.kind === 'mothership')) return;
    this.enemies.push({
      kind: 'mothership', x: this.width / 2, y: 110, vx: 0, vy: 0, size: 78,
      health: BOSS_HP, maxHealth: BOSS_HP, active: true, seed: 0, hitTime: -1, t1: 3, t2: 0, side: 'left',
    });
    for (const dir of [-1, 1]) {
      this.enemies.push({
        kind: 'generator', x: this.width / 2 + dir * 150, y: 130, vx: 0, vy: 0, size: 24,
        health: 4, maxHealth: 4, active: true, seed: dir, hitTime: -1, t1: 0,
        t2: dir > 0 ? 0 : Math.PI, side: dir > 0 ? 'right' : 'left',
      });
    }
    audioManager.playTone(110, 0.8, 'sawtooth', 0.35);
    this.shake = Math.min(1, this.shake + 0.5);
  }

  private spawnCore(golden: boolean): void {
    const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
    this.cores.push({
      x: side === 'left' ? this.width * (0.08 + Math.random() * 0.12) : this.width * (0.8 + Math.random() * 0.12),
      y: this.height * (0.3 + Math.random() * 0.28),
      drift: Math.random() * Math.PI * 2,
      golden, side, active: true, pulse: 0,
    });
  }

  private spawnCapsule(): void {
    const kinds: CapsuleKind[] = ['overdrive', 'slowmo', 'surge', 'repair'];
    this.capsules.push({
      x: 60 + Math.random() * (this.width - 120), y: -30,
      kind: kinds[Math.floor(Math.random() * kinds.length)],
      active: true, pulse: 0,
    });
  }

  // ---------------------------------------------------------------- entities

  private updateEnemies(wdt: number, beatId: string): void {
    const hasGenerators = this.enemies.some(e => e.kind === 'generator' && e.active);
    const boss = this.enemies.find(e => e.kind === 'mothership' && e.active);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.active) { this.enemies.splice(i, 1); continue; }

      switch (e.kind) {
        case 'drone':
        case 'cloaked':
          e.x += (e.vx + Math.sin(this.worldTime * 1.5 + e.seed) * 30) * wdt;
          e.y += e.vy * wdt;
          break;
        case 'interceptor':
          e.x += Math.sin(this.worldTime * 4 + e.seed) * 210 * wdt;
          e.y += e.vy * wdt;
          break;
        case 'bomber':
          e.x += Math.sin(this.worldTime * 0.8 + e.seed) * 26 * wdt;
          e.y += e.vy * wdt;
          e.t1 -= wdt;
          if (e.t1 <= 0 && e.y > 60) {
            e.t1 = 3.2;
            this.enemies.push({
              kind: 'bomb', x: e.x, y: e.y + e.size * 0.6, vx: 0, vy: 150, size: 11,
              health: 1, maxHealth: 1, active: true, seed: 0, hitTime: -1, t1: 0, t2: 0, side: 'left',
            });
            audioManager.playTone(300, 0.1, 'square', 0.15);
          }
          break;
        case 'bomb':
        case 'fragment':
          e.x += e.vx * wdt; e.y += e.vy * wdt;
          break;
        case 'missile': {
          // Homing with limited turn rate — leaning genuinely outruns it.
          const steer = Math.sign(this.stationX - e.x) * 60;
          e.vx += steer * wdt;
          e.vx = Math.max(-130, Math.min(130, e.vx));
          e.x += e.vx * wdt; e.y += e.vy * wdt;
          if (Math.random() < wdt * 20) this.particles.emit(e.x, e.y - 10, { color: '#FF8A65', count: 1, speed: 30, lifetime: 0.3 });
          break;
        }
        case 'asteroid':
          e.x += e.vx * wdt; e.y += e.vy * wdt;
          break;
        case 'mine':
          e.x += (e.vx + Math.sin(this.worldTime * 2 + e.seed) * 40) * wdt;
          e.y += e.vy * wdt;
          break;
        case 'turret': {
          e.t1 -= wdt;
          if (e.t2 === 0 && e.t1 <= 0) { e.t2 = 1; e.t1 = 1.4; audioManager.playTone(880, 0.12, 'square', 0.2); }
          else if (e.t2 === 1 && e.t1 <= 0) {
            e.t2 = 2; e.t1 = 0.55;
            this.resolveTurretBeam(e);
          } else if (e.t2 === 2 && e.t1 <= 0) { e.t2 = 0; e.t1 = 3 + Math.random() * 2; }
          break;
        }
        case 'generator': {
          if (boss) {
            e.t2 += wdt * 0.9;
            e.x = boss.x + Math.cos(e.t2) * 150;
            e.y = boss.y + 24 + Math.sin(e.t2) * 34;
          }
          break;
        }
        case 'mothership': {
          e.x = this.width / 2 + Math.sin(this.worldTime * 0.4) * this.width * 0.22;
          e.t1 -= wdt;
          if (e.t1 <= 0) {
            e.t1 = hasGenerators ? 6 : 4;
            const volley = beatId === 'finale' ? 2 : 1;
            for (let v = 0; v < volley; v++) {
              this.enemies.push({
                kind: 'missile', x: e.x + (v - 0.5) * 60, y: e.y + 40, vx: 0, vy: 110, size: 13,
                health: 1, maxHealth: 1, active: true, seed: 0, hitTime: -1, t1: 0, t2: 0, side: 'left',
              });
            }
          }
          break;
        }
      }

      // Reached the station line / left the screen.
      if (e.y > this.height - 60 && e.kind !== 'turret' && e.kind !== 'mothership' && e.kind !== 'generator') {
        const nearStation = Math.abs(e.x - this.stationX) < 90;
        e.active = false;
        if (e.kind === 'missile' || e.kind === 'bomb') {
          if (nearStation) this.damageStation(e.kind === 'missile' ? 12 : 10, e.x);
          else this.particles.emitBurst(e.x, this.height - 50, { color: '#607D8B', count: 6, speed: 50 });
        } else if (e.kind !== 'mine' && nearStation) {
          this.damageStation(8, e.x);
        }
        continue;
      }
      if (e.x < -80 || e.x > this.width + 80) { e.active = false; continue; }
    }
  }

  private resolveTurretBeam(turret: Enemy): void {
    // The beam was telegraphed pointing at the station; shield blocks it.
    audioManager.playTone(200, 0.3, 'sawtooth', 0.3);
    this.particles.emit(turret.x, turret.y, { color: danger(), count: 6, speed: 70, lifetime: 0.4 });
    if (this.shieldActive) {
      this.shieldBlockFlash = 1;
      this.score += 15;
      this.successPulse = true;
      this.feedback = ['Shield absorbed the beam!'];
      audioManager.playTone(700, 0.15, 'triangle', 0.3);
    } else {
      this.damageStation(14, this.stationX);
      this.feedback = ['Beam hit — raise an arm to shield next time'];
    }
  }

  private updateBolts(wdt: number): void {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= wdt;
      b.x += b.vx * wdt; b.y += b.vy * wdt;
      const reachedTarget = (b.vx === 0 && b.vy === 0) ||
        ((b.x - b.tx) * b.vx + (b.y - b.ty) * b.vy) >= 0; // passed the aim point
      let exploded = false;

      for (const e of this.enemies) {
        if (!e.active) continue;
        if (e.kind === 'cloaked' && e.t1 < this.elapsed) continue; // can't hit what you can't see
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.size + 14) {
          this.explodeBolt(b);
          exploded = true;
          break;
        }
      }
      if (!exploded && (reachedTarget || b.life <= 0 || b.y < -20 || b.x < -20 || b.x > this.width + 20)) {
        this.explodeBolt(b);
        exploded = true;
      }
      if (exploded) this.bolts.splice(i, 1);
    }
  }

  /** Bolts explode with a blast radius — forgiving aim by design. */
  private explodeBolt(b: Bolt): void {
    const radius = b.plasma ? 105 : 75;
    const dmg = b.plasma ? 2 : 1;
    const color = b.plasma ? '#FFAB40' : '#40C4FF';
    this.particles.emitBurst(b.x, b.y, { color, count: b.plasma ? 14 : 9, speed: 120, lifetime: 0.45 });
    this.shockwaves.push({ x: b.x, y: b.y, r: 6, maxR: radius, color, life: 0.5 });

    const hasGenerators = this.enemies.some(e => e.kind === 'generator' && e.active);
    let hit = false;
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (e.kind === 'cloaked' && e.t1 < this.elapsed) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) > radius + e.size * 0.5) continue;
      if (e.kind === 'mothership' && hasGenerators) {
        this.particles.emitBurst(e.x, e.y + e.size * 0.5, { color: '#B388FF', count: 8, speed: 70 });
        this.feedback = ['Mothership shielded — destroy the generators!'];
        continue;
      }
      e.health -= dmg;
      e.hitTime = this.elapsed;
      hit = true;
      if (e.health <= 0) this.killEnemy(e, true);
    }
    if (hit) audioManager.playTone(240, 0.12, 'sawtooth', 0.18);
  }

  private killEnemy(e: Enemy, scored: boolean): void {
    e.active = false;
    this.particles.emitBurst(e.x, e.y, {
      colors: e.kind === 'mothership' ? ['#FFD740', '#FF5252', '#40C4FF'] : undefined,
      color: e.kind === 'asteroid' || e.kind === 'fragment' ? '#BCAAA4' : '#40C4FF',
      count: e.kind === 'mothership' ? 40 : e.size > 30 ? 20 : 12,
      speed: e.kind === 'mothership' ? 220 : 130,
      lifetime: 0.7,
    });

    if (e.kind === 'asteroid') {
      for (const dir of [-1, 1]) {
        this.enemies.push({
          kind: 'fragment', x: e.x + dir * 12, y: e.y, vx: dir * 90, vy: 90, size: 15,
          health: 1, maxHealth: 1, active: true, seed: Math.random() * 100, hitTime: -1, t1: 0, t2: 0, side: 'left',
        });
      }
    }
    if (e.kind === 'mine') {
      // Chain reaction — mines are opportunities, not just threats.
      this.shockwaves.push({ x: e.x, y: e.y, r: 10, maxR: 130, color: danger(), life: 0.6 });
      for (const other of this.enemies) {
        if (!other.active || other === e || other.kind === 'mothership' || other.kind === 'generator') continue;
        if (Math.hypot(other.x - e.x, other.y - e.y) < 130) {
          other.health -= 2;
          if (other.health <= 0) this.killEnemy(other, scored);
        }
      }
    }

    if (!scored) return;
    const mult = this.combo.registerHit() * (this.powerUps.isActive('surge') ? 2 : 1);
    this.score += Math.round((SCORE[e.kind] ?? 20) * mult);
    this.success++;
    this.successPulse = true;
    if (this.combo.combo > 0 && this.combo.combo % 5 === 0) audioManager.playCombo();

    if (e.kind === 'mothership') {
      this.bossDefeated = true;
      this.shake = 1;
      audioManager.playVictory();
      return;
    }
    if (e.kind === 'generator') {
      this.feedback = this.enemies.some(o => o.kind === 'generator' && o.active)
        ? ['Generator down — one left!']
        : ['Shields offline — attack the mothership!'];
      audioManager.playSuccess();
    }
    // Occasional power-up drop.
    if (Math.random() < 0.07 && this.capsules.filter(c => c.active).length < 2) {
      this.capsules.push({ x: e.x, y: e.y, kind: (['overdrive', 'slowmo', 'surge', 'repair'] as CapsuleKind[])[Math.floor(Math.random() * 4)], active: true, pulse: 0 });
    }
  }

  private updateCores(wdt: number, g: GestureFrame, lm: PoseData['predictedLandmarks'], tracked: boolean): void {
    for (let i = this.cores.length - 1; i >= 0; i--) {
      const c = this.cores[i];
      if (!c.active) { this.cores.splice(i, 1); continue; }
      c.pulse += wdt * 3;
      c.y += Math.sin(c.pulse) * 0.3;
      c.x += Math.cos(c.pulse * 0.7 + c.drift) * 0.4;

      if (!tracked) continue;
      // The crossing hand must be the arm OPPOSITE the core's screen side.
      const requiredHand: HandSide = c.side === 'left' ? 'right' : 'left';
      if (g.crossBody !== requiredHand) continue;
      const hand = wristToScreen(lm, requiredHand, this.width, this.height);
      if (Math.hypot(c.x - hand.x, c.y - hand.y) < handHitRadius(lm, this.height, 0.5)) {
        c.active = false;
        this.attempts++;
        const mult = this.combo.registerHit() * (this.powerUps.isActive('surge') ? 2 : 1);
        this.score += Math.round((c.golden ? 60 : 35) * mult);
        this.success++;
        this.successPulse = true;
        audioManager.playCollect();
        this.particles.emitBurst(c.x, c.y, { colors: ['#FFD740', '#40C4FF', '#69F0AE'], count: 16, speed: 100 });
        if (!this.plasmaUnlocked && !c.golden) {
          this.plasmaUnlocked = true;
          this.feedback = ['PLASMA CANNON ONLINE — bigger blasts!'];
          audioManager.playLevelUp();
        }
      }
    }
  }

  private updateCapsules(wdt: number, lm: PoseData['predictedLandmarks'], tracked: boolean): void {
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const c = this.capsules[i];
      if (!c.active) { this.capsules.splice(i, 1); continue; }
      c.pulse += wdt * 4;
      c.y += 45 * wdt;
      if (c.y > this.height + 30) { c.active = false; continue; }
      if (!tracked) continue;
      for (const side of ['left', 'right'] as const) {
        const hand = wristToScreen(lm, side, this.width, this.height);
        if (Math.hypot(c.x - hand.x, c.y - hand.y) < handHitRadius(lm, this.height, 0.45)) {
          c.active = false;
          this.collectCapsule(c);
          break;
        }
      }
    }
  }

  private collectCapsule(c: Capsule): void {
    this.successPulse = true;
    this.success++;
    audioManager.playCollect();
    this.particles.emitBurst(c.x, c.y, { color: CAPSULE_STYLE[c.kind].color, count: 14, speed: 90 });
    this.feedback = [CAPSULE_STYLE[c.kind].label + '!'];
    if (c.kind === 'repair') {
      this.integrity = Math.min(100, this.integrity + 12);
    } else {
      this.powerUps.activate(c.kind, CAPSULE_STYLE[c.kind].label, c.kind === 'slowmo' ? 5 : 7, this.elapsed);
    }
  }

  private completeRepair(): void {
    this.repairDone = true;
    this.integrity = Math.min(100, this.integrity + 25);
    this.empCharges += 2;
    this.successPulse = true;
    this.flash = 0.6;
    this.feedback = ['Reactor restored! EMP charges loaded (+2)'];
    audioManager.playLevelUp();
    this.shockwaves.push({ x: this.width / 2, y: this.height * 0.42, r: 20, maxR: 260, color: safe(), life: 1 });
  }

  private applyRadarReveal(headYaw: number): void {
    const sx = this.stationX, sy = this.height - 46;
    const beamAngle = -Math.PI / 2 + Math.max(-1, Math.min(1, headYaw)) * 0.95;
    for (const e of this.enemies) {
      if (e.kind !== 'cloaked' || !e.active) continue;
      const ang = Math.atan2(e.y - sy, e.x - sx);
      let diff = Math.abs(ang - beamAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.42) e.t1 = Math.max(e.t1, this.elapsed + 4);
    }
  }

  private damageStation(amount: number, atX: number): void {
    this.integrity = Math.max(0, this.integrity - amount);
    this.combo.registerMiss();
    this.shake = Math.min(1, this.shake + 0.45);
    audioManager.playHit();
    this.particles.emitBurst(atX, this.height - 50, { color: danger(), count: 16, speed: 110 });
  }

  private pickGuidance(beatId: string): { x: number; y: number } | null {
    const core = this.cores.find(c => c.active);
    if (core && (beatId === 'cores' || beatId === 'bonus')) return { x: core.x, y: core.y };
    const capsule = this.capsules.find(c => c.active);
    if (capsule) return { x: capsule.x, y: capsule.y };
    if (beatId === 'reactor' && !this.repairDone) return { x: this.width / 2, y: this.height * 0.42 };
    return null;
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const w = this.shockwaves[i];
      w.r += dt * 480;
      w.life -= dt * 1.8;
      if (w.life <= 0 || w.r > w.maxR) this.shockwaves.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- render

  render(ctx: CanvasRenderingContext2D): void {
    const reduced = settingsStore.get().reducedMotion;
    ctx.save();
    if (this.shake > 0.01 && !reduced) {
      ctx.translate((Math.random() - 0.5) * this.shake * 16, (Math.random() - 0.5) * this.shake * 16);
    }

    Renderer.clear(ctx, this.width, this.height);
    Renderer.drawVignette(ctx, this.width, this.height, '#020818', 0.66);
    this.renderStarfield(ctx, reduced);
    this.ambient.render(ctx);

    const beat = this.director.current().id;

    // Ion storm veil.
    if (beat === 'storm') {
      ctx.fillStyle = 'rgba(10, 18, 48, 0.4)';
      ctx.fillRect(0, 0, this.width, this.height);
      if (!reduced) {
        for (let i = 0; i < 6; i++) {
          const y = ((this.worldTime * 140) + i * this.height / 6) % this.height;
          ctx.strokeStyle = 'rgba(130,170,255,0.08)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(this.width, y + 40);
          ctx.stroke();
        }
      }
    }

    // Radar cone (storm & boss phases).
    if ((beat === 'storm' || beat === 'mothership' || beat === 'finale') && this.gesture?.tracked) {
      this.renderRadar(ctx);
    }

    if (beat === 'reactor') this.renderRotor(ctx);

    for (const c of this.cores) this.renderCore(ctx, c);
    for (const c of this.capsules) this.renderCapsule(ctx, c);
    for (const e of this.enemies) this.renderEnemy(ctx, e);
    for (const b of this.bolts) this.renderBolt(ctx, b);
    if (this.laserFiring > 0) this.renderLaser(ctx);

    for (const w of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, w.life);
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = w.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this.particles.render(ctx);
    this.renderStation(ctx);
    if (this.gesture?.tracked && !this.over && !this.bossDefeated) this.renderCrosshair(ctx);
    this.renderWeaponHud(ctx);

    // Slow-mo tint.
    if ((this.powerUps.isActive('slowmo') || beat === 'bonus') && !this.over) {
      ctx.fillStyle = 'rgba(120, 90, 255, 0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.flash > 0 && !reduced) {
      ctx.fillStyle = `rgba(140, 200, 255, ${this.flash * 0.12})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.scanFlash > 0) {
      ctx.strokeStyle = `rgba(64, 196, 255, ${this.scanFlash * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.stationX, this.height - 46, (1 - this.scanFlash) * this.height * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.bossDefeated && !this.over) {
      Renderer.drawText(ctx, 'STATION SECURED', this.width / 2, this.height * 0.4, {
        size: 42, align: 'center', color: '#FFD740', weight: '900',
      });
    }

    ctx.restore();
  }

  private renderStarfield(ctx: CanvasRenderingContext2D, reduced: boolean): void {
    // Nebulae.
    const n1x = this.width * 0.25 + Math.sin(this.worldTime * 0.03) * 40;
    const n2x = this.width * 0.75 + Math.cos(this.worldTime * 0.02) * 50;
    for (const [nx, ny, r, color] of [
      [n1x, this.height * 0.3, 240, '#3949ab'],
      [n2x, this.height * 0.55, 280, '#6a1b9a'],
    ] as const) {
      const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
      grad.addColorStop(0, color + '2e');
      grad.addColorStop(1, color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(nx - r, ny - r, r * 2, r * 2);
    }
    // Stars (two parallax speeds).
    for (const s of this.stars) {
      if (!reduced) {
        s.y += s.z * 22 * (1 / 60);
        if (s.y > this.height) { s.y = 0; s.x = Math.random() * this.width; }
      }
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this.worldTime * 1.5 + s.tw));
      ctx.globalAlpha = twinkle * (0.3 + s.z * 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x, s.y, s.z > 0.7 ? 2 : 1, s.z > 0.7 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  private renderRadar(ctx: CanvasRenderingContext2D): void {
    const sx = this.stationX, sy = this.height - 46;
    const yaw = Math.max(-1, Math.min(1, this.gesture?.headYaw ?? 0));
    const angle = -Math.PI / 2 + yaw * 0.95;
    const len = this.height * 0.85;
    ctx.save();
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, len);
    grad.addColorStop(0, 'rgba(64,196,255,0.16)');
    grad.addColorStop(1, 'rgba(64,196,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, len, angle - 0.42, angle + 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderRotor(ctx: CanvasRenderingContext2D): void {
    const cx = this.width / 2, cy = this.height * 0.42;
    const r = 74;
    ctx.save();
    Renderer.drawGlow(ctx, cx, cy, r * 1.6, this.repairDone ? safe() : warn());
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Progress arc.
    ctx.strokeStyle = this.repairDone ? safe() : warn();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + this.repairProgress * Math.PI * 2);
    ctx.stroke();
    // Crank handle follows the player's circling.
    const hx = cx + Math.cos(this.rotorAngle) * r;
    const hy = cy + Math.sin(this.rotorAngle) * r;
    Renderer.drawCircle(ctx, hx, hy, 12, '#fff');
    Renderer.drawText(ctx, this.repairDone ? 'REACTOR STABLE' : 'CRANK THE ROTOR', cx, cy - r - 30, { size: 15, align: 'center', color: '#FFE082' });
    ctx.restore();
  }

  private renderCore(ctx: CanvasRenderingContext2D, c: Core): void {
    if (!c.active) return;
    const pulse = 1 + Math.sin(c.pulse) * 0.12;
    const color = c.golden ? '#FFD740' : '#40C4FF';
    Renderer.drawGlow(ctx, c.x, c.y, 46 * pulse, color);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.pulse * 0.4);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 16 * pulse;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    Renderer.drawCircle(ctx, c.x, c.y, 6, '#E1F5FE');
    Renderer.drawText(ctx, c.side === 'left' ? '↩ opposite arm' : 'opposite arm ↪', c.x, c.y + 30, { size: 11, align: 'center', color: 'rgba(255,255,255,0.75)' });
  }

  private renderCapsule(ctx: CanvasRenderingContext2D, c: Capsule): void {
    if (!c.active) return;
    const style = CAPSULE_STYLE[c.kind];
    const pulse = 1 + Math.sin(c.pulse) * 0.1;
    Renderer.drawGlow(ctx, c.x, c.y, 34 * pulse, style.color);
    ctx.save();
    ctx.fillStyle = style.color;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 12;
    Renderer.roundedRect(ctx, c.x - 13, c.y - 18, 26, 36, 12);
    ctx.fill();
    ctx.restore();
    Renderer.drawCircle(ctx, c.x, c.y - 5, 5, '#ffffff');
  }

  private renderBolt(ctx: CanvasRenderingContext2D, b: Bolt): void {
    const color = b.plasma ? '#FFAB40' : '#40C4FF';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = b.plasma ? 5 : 3.5;
    ctx.lineCap = 'round';
    const len = 0.028;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * len, b.y - b.vy * len);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  private renderLaser(ctx: CanvasRenderingContext2D): void {
    const sx = this.stationX, sy = this.height - 46;
    const ex = sx + this.laserDir.x * this.height * 1.5;
    const ey = sy + this.laserDir.y * this.height * 1.5;
    const fade = Math.min(1, this.laserFiring / 0.3);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = '#FF5252';
    ctx.shadowColor = '#FF5252';
    ctx.shadowBlur = 30;
    ctx.lineWidth = 26 + Math.sin(this.elapsed * 40) * 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#FFF3E0';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  private renderEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
    if (!e.active) return;
    ctx.save();
    const flash = this.elapsed - e.hitTime < 0.1;
    const bob = Math.sin(this.worldTime * 3 + e.seed) * 2;

    switch (e.kind) {
      case 'drone':
      case 'cloaked': {
        const revealed = e.kind === 'drone' || e.t1 >= this.elapsed;
        ctx.globalAlpha = revealed ? 1 : 0.07;
        const color = e.kind === 'cloaked' ? '#80DEEA' : '#4FC3F7';
        Renderer.drawGlow(ctx, e.x, e.y + bob, e.size * 1.7, color);
        ctx.fillStyle = flash ? '#fff' : '#263238';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        Renderer.drawCircle(ctx, e.x, e.y + bob, e.size * 0.36, color);
        if (e.kind === 'cloaked' && revealed) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#40C4FF';
          ctx.beginPath();
          ctx.arc(e.x, e.y + bob, e.size + 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
      }
      case 'interceptor': {
        Renderer.drawGlow(ctx, e.x, e.y, e.size * 1.6, '#FF4081');
        ctx.translate(e.x, e.y);
        ctx.fillStyle = flash ? '#fff' : '#AD1457';
        ctx.strokeStyle = '#FF4081';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, e.size);
        ctx.lineTo(-e.size * 0.8, -e.size * 0.7);
        ctx.lineTo(0, -e.size * 0.3);
        ctx.lineTo(e.size * 0.8, -e.size * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'bomber': {
        Renderer.drawGlow(ctx, e.x, e.y + bob, e.size * 1.5, '#FF9800');
        ctx.translate(e.x, e.y + bob);
        ctx.fillStyle = flash ? '#fff' : '#4E342E';
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, e.size, e.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(-e.size * 0.85, -4, e.size * 0.35, 8);
        ctx.fillRect(e.size * 0.5, -4, e.size * 0.35, 8);
        Renderer.drawProgressBar(ctx, -e.size, -e.size * 0.55 - 14, e.size * 2, 5, e.health / e.maxHealth, warn());
        break;
      }
      case 'missile': {
        const ang = Math.atan2(e.vy, e.vx) + Math.PI / 2;
        Renderer.drawGlow(ctx, e.x, e.y, 26, danger());
        ctx.translate(e.x, e.y);
        ctx.rotate(ang);
        ctx.fillStyle = flash ? '#fff' : danger();
        ctx.beginPath();
        ctx.moveTo(0, -e.size);
        ctx.lineTo(-e.size * 0.5, e.size);
        ctx.lineTo(e.size * 0.5, e.size);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'bomb': {
        Renderer.drawGlow(ctx, e.x, e.y, 20, '#FF7043');
        Renderer.drawCircle(ctx, e.x, e.y, e.size, flash ? '#fff' : '#BF360C');
        break;
      }
      case 'asteroid':
      case 'fragment': {
        ctx.translate(e.x, e.y);
        ctx.rotate(this.worldTime * 0.5 + e.seed);
        ctx.fillStyle = flash ? '#fff' : '#6D4C41';
        ctx.strokeStyle = '#A1887F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = e.size * (0.75 + 0.25 * Math.sin(e.seed * 7 + i * 3));
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'mine': {
        const pulse = 1 + Math.sin(this.worldTime * 5 + e.seed) * 0.15;
        Renderer.drawGlow(ctx, e.x, e.y, 30 * pulse, danger());
        ctx.translate(e.x, e.y);
        ctx.fillStyle = flash ? '#fff' : '#B71C1C';
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.worldTime;
          ctx.fillRect(Math.cos(a) * e.size - 2, Math.sin(a) * e.size - 2, 4, 8);
        }
        ctx.beginPath();
        ctx.arc(0, 0, e.size * pulse * 0.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'turret': {
        const color = e.t2 === 1 ? warn() : e.t2 === 2 ? danger() : '#78909C';
        Renderer.drawGlow(ctx, e.x, e.y, 40, color);
        ctx.fillStyle = flash ? '#fff' : '#37474F';
        Renderer.roundedRect(ctx, e.x - 20, e.y - 24, 40, 48, 8);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        // Telegraph / beam toward the station.
        if (e.t2 >= 1) {
          ctx.strokeStyle = e.t2 === 1 ? 'rgba(255,215,64,0.35)' : 'rgba(239,83,80,0.9)';
          ctx.lineWidth = e.t2 === 1 ? 3 : 12;
          ctx.shadowColor = danger();
          ctx.shadowBlur = e.t2 === 2 ? 22 : 0;
          if (e.t2 === 1) ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(this.stationX, this.height - 52);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        Renderer.drawProgressBar(ctx, e.x - 18, e.y - 38, 36, 5, e.health / e.maxHealth, warn());
        break;
      }
      case 'generator': {
        Renderer.drawGlow(ctx, e.x, e.y, 42, '#B388FF');
        ctx.translate(e.x, e.y);
        ctx.rotate(this.worldTime * 1.5);
        ctx.fillStyle = flash ? '#fff' : '#4A148C';
        ctx.strokeStyle = '#B388FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -e.size);
        ctx.lineTo(e.size, 0);
        ctx.lineTo(0, e.size);
        ctx.lineTo(-e.size, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-this.worldTime * 1.5);
        Renderer.drawProgressBar(ctx, -20, -e.size - 16, 40, 5, e.health / e.maxHealth, '#B388FF');
        break;
      }
      case 'mothership': {
        const dmg = 1 - e.health / e.maxHealth;
        const hasGens = this.enemies.some(o => o.kind === 'generator' && o.active);
        Renderer.drawGlow(ctx, e.x, e.y, e.size * 2.2, dmg > 0.6 ? danger() : '#7C4DFF');
        ctx.translate(e.x, e.y + bob);
        // Hull.
        ctx.fillStyle = flash ? '#fff' : '#1A1040';
        ctx.strokeStyle = dmg > 0.6 ? danger() : '#7C4DFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 10, e.size, e.size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Dome.
        ctx.fillStyle = flash ? '#fff' : '#311B92';
        ctx.beginPath();
        ctx.arc(0, -8, e.size * 0.5, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        // Running lights.
        for (let i = -2; i <= 2; i++) {
          const lit = Math.sin(this.worldTime * 4 + i) > 0;
          Renderer.drawCircle(ctx, i * e.size * 0.32, 12, 4, lit ? '#FFD740' : '#5E35B1');
        }
        // Shield shimmer while generators live.
        if (hasGens) {
          ctx.globalAlpha = 0.3 + Math.sin(this.worldTime * 3) * 0.1;
          ctx.strokeStyle = '#B388FF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(0, 4, e.size * 1.25, e.size * 0.75, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.rotate(0);
        Renderer.drawProgressBar(ctx, -e.size, -e.size * 0.75 - 18, e.size * 2, 8, e.health / e.maxHealth, dmg > 0.6 ? danger() : warn());
        break;
      }
    }
    ctx.restore();
  }

  private renderStation(ctx: CanvasRenderingContext2D): void {
    const sx = this.stationX, sy = this.height - 40;
    ctx.save();

    // Shield dome.
    if (this.shieldActive) {
      const r = 120;
      const grad = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r);
      const c = this.shieldBlockFlash > 0 ? '255,215,64' : '64,196,255';
      grad.addColorStop(0, `rgba(${c},0.02)`);
      grad.addColorStop(1, `rgba(${c},${0.22 + this.shieldBlockFlash * 0.4})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(${c},${0.65 + this.shieldBlockFlash * 0.35})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#40C4FF';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(sx, sy, r, Math.PI, 0);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Laser charge ring.
    if (this.laserCharge > 0 && this.laserFiring <= 0) {
      ctx.strokeStyle = '#FF5252';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#FF5252';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(sx, sy - 6, 52, -Math.PI / 2, -Math.PI / 2 + this.laserCharge * Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (this.laserCharge >= 0.99) {
        Renderer.drawText(ctx, 'FIRING!', sx, sy - 96, { size: 16, align: 'center', color: '#FF8A80', weight: '900' });
      } else {
        Renderer.drawText(ctx, 'CHARGING…', sx, sy - 96, { size: 13, align: 'center', color: '#FF8A80' });
      }
    }

    // Thruster glow when dodging.
    const leanNorm = (this.stationX - this.width / 2) / (this.width * STATION_DODGE_RANGE);
    if (Math.abs(leanNorm) > 0.25) {
      const dir = Math.sign(leanNorm);
      Renderer.drawGlow(ctx, sx - dir * 66, sy + 6, 34, '#40C4FF');
    }

    // Platform.
    Renderer.drawGlow(ctx, sx, sy, 90, '#40C4FF');
    ctx.fillStyle = '#0D1B3E';
    ctx.strokeStyle = '#40C4FF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx - 64, sy + 26);
    ctx.lineTo(sx - 44, sy - 8);
    ctx.lineTo(sx + 44, sy - 8);
    ctx.lineTo(sx + 64, sy + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Turret dome + barrel toward crosshair.
    ctx.beginPath();
    ctx.arc(sx, sy - 8, 20, Math.PI, 0);
    ctx.fillStyle = '#15254F';
    ctx.fill();
    ctx.stroke();
    const ang = Math.atan2(this.crosshair.y - (sy - 12), this.crosshair.x - sx);
    ctx.strokeStyle = this.plasmaUnlocked ? '#FFAB40' : '#40C4FF';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 12);
    ctx.lineTo(sx + Math.cos(ang) * 30, sy - 12 + Math.sin(ang) * 30);
    ctx.stroke();

    ctx.restore();
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.crosshair;
    const color = this.plasmaUnlocked ? '#FFAB40' : '#40C4FF';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.elapsed * 1.6);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0.25, Math.PI / 2 - 0.25);
      ctx.stroke();
    }
    ctx.restore();
    Renderer.drawCircle(ctx, x, y, 3.5, color);
  }

  private renderWeaponHud(ctx: CanvasRenderingContext2D): void {
    // A backdrop for legibility over a busy starfield — kept clear of the
    // FeedbackOverlay/TrackingStatusBanner bands above it.
    Renderer.drawHudBand(ctx, this.width, this.height - 74, 74);
    const y = this.height - 14;
    const items: { label: string; on: boolean; color: string }[] = [
      { label: this.plasmaUnlocked ? 'PLASMA' : 'BLASTER', on: true, color: this.plasmaUnlocked ? '#FFAB40' : '#40C4FF' },
      { label: `EMP ×${this.empCharges}`, on: this.empCharges > 0, color: '#B388FF' },
      { label: 'LASER', on: this.laserUnlocked, color: '#FF5252' },
      { label: `SHIELD ${Math.round(this.shieldEnergy)}%`, on: this.shieldEnergy > 4, color: '#69F0AE' },
    ];
    let x = 16;
    for (const it of items) {
      ctx.globalAlpha = it.on ? 0.95 : 0.35;
      Renderer.drawText(ctx, it.label, x, y, { size: 12, color: it.color, baseline: 'bottom', weight: '800' });
      x += ctx.measureText(it.label).width + 22;
    }
    ctx.globalAlpha = 1;

    for (const p of this.powerUps.list()) {
      Renderer.drawText(ctx, p.label, this.width / 2, this.height - 58, { size: 14, align: 'center', color: '#FFD740', weight: '800' });
    }
  }

  // ---------------------------------------------------------------- state

  getState(): SceneState {
    return {
      score: this.score,
      success: this.success,
      reps: this.gesture?.rotationTurns ?? 0,
      combo: this.combo.combo,
      multiplier: this.combo.getMultiplier() * (this.powerUps.isActive('surge') ? 2 : 1),
      maxCombo: this.combo.maxCombo,
      level: this.director.index() + 1,
      accuracy: this.attempts ? Math.min(100, Math.round((this.success / this.attempts) * 100)) : 100,
      feedback: this.feedback,
      over: this.over,
      won: this.won,
      health: { current: Math.round(this.integrity), max: 100 },
      objective: this.objective,
      guidance: this.guidance,
      successPulse: this.successPulse,
    };
  }
}

export const cosmicGame: GameRegistration = {
  id: 'cosmic-defender',
  exercise: cosmicExercise,
  createScene: () => new CosmicScene(),
};
