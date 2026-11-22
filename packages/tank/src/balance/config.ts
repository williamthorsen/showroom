/** The parameters that projecting a balance needs, all of which a `Snapshot` also contains. */
export interface RefillConfig {
  /** The maximum balance. */
  capacity: number;
  /** The amount that the balance regains over each `refillIntervalMs`. */
  refillAmount: number;
  refillIntervalMs: number;
}

/** Validates a tank's configuration and fills the default floor; throws `RangeError` naming the first invalid field. */
export function resolveConfig(config: TankConfig): ResolvedTankConfig {
  const { capacity, refillAmount, refillIntervalMs } = config;
  assertFinite('capacity', capacity);
  assertFinite('refillAmount', refillAmount);
  assertFinite('refillIntervalMs', refillIntervalMs);
  if (capacity <= 0) {
    throw new RangeError(`capacity must be greater than 0, got ${capacity}`);
  }
  if (refillAmount < 0) {
    throw new RangeError(`refillAmount must not be negative, got ${refillAmount}`);
  }
  if (refillIntervalMs <= 0) {
    throw new RangeError(`refillIntervalMs must be greater than 0, got ${refillIntervalMs}`);
  }

  const floor = config.floor ?? -capacity;
  assertFinite('floor', floor);
  if (floor > 0) {
    throw new RangeError(`floor must not be greater than 0, got ${floor}`);
  }

  return { capacity, refillAmount, refillIntervalMs, floor };
}

/** A validated `TankConfig` whose floor is filled. */
export interface ResolvedTankConfig extends RefillConfig {
  floor: number;
}

/** The configuration of a tank, as a site writes it. */
export interface TankConfig extends RefillConfig {
  /** The lowest balance that a settle's overage records, at most 0; `-capacity` when omitted. */
  floor?: number;
}

// region | Helpers
function assertFinite(field: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${field} must be a finite number, got ${value}`);
  }
}
// endregion | Helpers
