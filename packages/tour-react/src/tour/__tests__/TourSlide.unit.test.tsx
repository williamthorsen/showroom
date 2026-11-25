import { cleanup, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TourSlide, type TourSlideProps } from '../TourSlide.tsx';
import type { TourStep, TourTile } from '../types.ts';

const TILES: readonly TourTile[] = [
  { icon: <svg data-testid="icon-capture" />, label: 'Capture', detail: 'From anywhere' },
  { icon: <svg data-testid="icon-sort" />, label: 'Sort' },
  { icon: <svg data-testid="icon-ship" />, label: 'Ship' },
];

const STEP: TourStep = { eyebrow: 'Why', title: 'Context is scattered', lead: 'Notes live in five apps.' };

afterEach(cleanup);

describe(TourSlide, () => {
  it('exposes the step as a slide named by its position and title', () => {
    renderSlide({ index: 1, total: 6 });

    const slide = screen.getByRole('group', { name: 'Step 2 of 6: Context is scattered' });
    expect(slide.getAttribute('aria-roledescription')).toBe('slide');
  });

  it('renders the eyebrow, title, and lead, and omits the visual and points when not given', () => {
    const { container } = renderSlide();

    expect(screen.getByText('Why')).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Context is scattered' })).toBeDefined();
    expect(screen.getByText('Notes live in five apps.')).toBeDefined();
    expect(container.querySelector('.tour-visual')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('renders the points as a list', () => {
    renderSlide({ step: { ...STEP, points: ['One inbox', 'One search', 'One history'] } });

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toStrictEqual(['One inbox', 'One search', 'One history']);
  });

  it.each(['flow', 'grid', 'scatter'] as const)('renders a %s visual with the consumer-supplied icons', (kind) => {
    const { container } = renderSlide({ step: { ...STEP, visual: { kind, tiles: TILES } } });

    expect(container.querySelector<HTMLElement>('.tour-visual')?.dataset['kind']).toBe(kind);
    expect(container.querySelectorAll('.tour-tile')).toHaveLength(3);
    expect(screen.getByTestId('icon-capture')).toBeDefined();
    expect(screen.getByTestId('icon-ship')).toBeDefined();
    expect(screen.getByText('From anywhere')).toBeDefined();
  });

  it('joins flow tiles with decorative arrows and marks the last tile as the goal', () => {
    const { container } = renderSlide({ step: { ...STEP, visual: { kind: 'flow', tiles: TILES } } });

    const arrows = container.querySelectorAll('.tour-arrow');
    expect(arrows).toHaveLength(2);
    expect([...arrows].every((arrow) => arrow.getAttribute('aria-hidden') === 'true')).toBe(true);
    const goals = container.querySelectorAll('.tour-tile[data-goal]');
    expect([...goals].map((tile) => tile.textContent)).toStrictEqual(['Ship']);
  });

  it('numbers tiles and arrows in reading order for the staggered entrance', () => {
    const { container } = renderSlide({ step: { ...STEP, visual: { kind: 'flow', tiles: TILES } } });

    const ordered = container.querySelectorAll<HTMLElement>('.tour-tile, .tour-arrow');
    expect([...ordered].map((element) => element.style.getPropertyValue('--tour-order'))).toStrictEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('tilts scatter tiles alternately', () => {
    const { container } = renderSlide({ step: { ...STEP, visual: { kind: 'scatter', tiles: TILES } } });

    const tilts = [...container.querySelectorAll<HTMLElement>('.tour-tile')].map((tile) => tile.dataset['tilt']);
    expect(tilts).toStrictEqual(['left', 'right', 'left']);
  });

  it('renders a custom element in place of a built-in visual', () => {
    const { container } = renderSlide({ step: { ...STEP, visual: <figure>Custom diagram</figure> } });

    expect(screen.getByText('Custom diagram')).toBeDefined();
    expect(container.querySelector('.tour-tile')).toBeNull();
  });

  it('renders an action without a URL as a tour button that calls onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderSlide({ step: { ...STEP, action: { label: 'Create a project', onSelect } } });

    const button = screen.getByRole('button', { name: 'Create a project' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toBe('tour-button tour-step-action');
    expect(button.dataset['variant']).toBe('forward');
    await user.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('renders an action with a URL as a link that lets onSelect prevent the navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn((event: { defaultPrevented: boolean; preventDefault: () => void }) => {
      event.preventDefault();
    });
    renderSlide({ step: { ...STEP, action: { label: 'Open the docs', href: '/docs', onSelect } } });

    const link = screen.getByRole('link', { name: 'Open the docs' });
    expect(link.getAttribute('href')).toBe('/docs');
    expect(link.className).toBe('tour-button tour-step-action');
    expect(link.dataset['variant']).toBe('forward');
    await user.click(link);
    expect(onSelect.mock.calls[0]?.[0].defaultPrevented).toBe(true);
  });

  it('omits the action when not given', () => {
    const { container } = renderSlide();

    expect(container.querySelector('.tour-step-action')).toBeNull();
  });

  it('exposes the direction of travel for the slide-in', () => {
    renderSlide({ direction: 'backward' });

    expect(screen.getByRole('group').dataset['direction']).toBe('backward');
  });
});

// region | Helpers

function renderSlide(overrides: Partial<TourSlideProps> = {}): ReturnType<typeof render> {
  return render(<TourSlide step={STEP} index={0} total={3} direction="none" {...overrides} />);
}

// endregion | Helpers
