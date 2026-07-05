export class Entity {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  width = 0;
  height = 0;
  active = true;
  rotation = 0;
  alpha = 1;
  scale = 1;

  update(_dt: number): void { void _dt; }
  render(_ctx: CanvasRenderingContext2D): void { void _ctx; }

  destroy(): void {
    this.active = false;
  }

  distanceTo(other: Entity): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  collidesWith(other: Entity): boolean {
    return (
      this.x - this.width / 2 < other.x + other.width / 2 &&
      this.x + this.width / 2 > other.x - other.width / 2 &&
      this.y - this.height / 2 < other.y + other.height / 2 &&
      this.y + this.height / 2 > other.y - other.height / 2
    );
  }
}
