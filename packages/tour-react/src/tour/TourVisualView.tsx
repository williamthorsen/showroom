import { Fragment, type ReactElement, type RefCallback } from 'react';

import type { TourTile, TourVisual } from './types.ts';

export interface TourVisualViewProps {
  visual: TourVisual;
}

/** A built-in visual: tiles on a sunken panel, laid out as a flow, a grid, or a scatter. */
export function TourVisualView({ visual }: TourVisualViewProps): ReactElement {
  const { kind, tiles } = visual;
  return (
    <div className="tour-visual" data-kind={kind}>
      {kind === 'flow' ? renderFlow(tiles) : renderSpread(tiles, kind === 'scatter')}
    </div>
  );
}

// region | Helpers

/**
 * Returns a ref that sets the element's reading-order index as `--tour-order`, from which the stylesheet staggers its
 * entrance. React's style prop does not type custom properties, so the index is set on the element directly.
 */
function assignOrder(order: number): RefCallback<HTMLElement> {
  return (element) => {
    element?.style.setProperty('--tour-order', String(order));
  };
}

/** Renders tiles joined by arrows, in reading order, with the last tile as the goal. */
function renderFlow(tiles: readonly TourTile[]): ReactElement[] {
  return tiles.map((tile, index) => (
    <Fragment key={index}>
      {index > 0 && <span ref={assignOrder(index * 2 - 1)} className="tour-arrow" aria-hidden="true" />}
      <TileView tile={tile} order={index * 2} isGoal={index === tiles.length - 1} />
    </Fragment>
  ));
}

/** Renders tiles as peers, tilted alternately when scattered. */
function renderSpread(tiles: readonly TourTile[], isScattered: boolean): ReactElement[] {
  return tiles.map((tile, index) => (
    <TileView
      key={index}
      tile={tile}
      order={index}
      tilt={isScattered ? (index % 2 === 0 ? 'left' : 'right') : undefined}
    />
  ));
}

interface TileViewProps {
  tile: TourTile;
  order: number;
  isGoal?: boolean | undefined;
  tilt?: 'left' | 'right' | undefined;
}

/** One tile: its icon in a tinted circle, its label, and its detail when given. */
function TileView({ tile, order, isGoal = false, tilt }: TileViewProps): ReactElement {
  return (
    <div ref={assignOrder(order)} className="tour-tile" data-goal={isGoal || undefined} data-tilt={tilt}>
      <span className="tour-tile-icon" aria-hidden="true">
        {tile.icon}
      </span>
      <span className="tour-tile-label">{tile.label}</span>
      {tile.detail !== undefined && <span className="tour-tile-detail">{tile.detail}</span>}
    </div>
  );
}

// endregion | Helpers
