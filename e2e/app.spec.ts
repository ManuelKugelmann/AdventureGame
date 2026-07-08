import { expect, test } from '@playwright/test';

/**
 * Real-browser smoke: the production build must boot, render the Konva board,
 * accept human input, and let the bot play a full game to its outcome —
 * with zero console errors along the way.
 */
test('boots, renders the board, bot plays to game over, new game restarts', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/AdventureGame/');
  await expect(page).toHaveTitle(/Adventure Game/);
  await expect(page.getByRole('heading', { name: /The Silent Abbey/ })).toBeVisible();

  // Konva board canvas rendered
  await expect(page.locator('.board-wrap canvas').first()).toBeVisible();

  // party + log panels populated from real content
  await expect(page.locator('.hero-row').first()).toContainText('Warden');
  await expect(page.getByText('Chronicle')).toBeVisible();

  // deterministic seed, then a single human action: end turn
  await page.getByLabel('seed').fill('7');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'End turn' }).click();

  // bot plays the rest to completion
  await page.getByRole('button', { name: /Bot autoplay/ }).click();
  const banner = page.locator('.outcome-banner');
  await expect(banner).toBeVisible({ timeout: 90_000 });
  await expect(banner).toContainText(/VICTORY|DEFEAT/);

  // restart from the banner
  await page.getByRole('button', { name: /next seed/ }).click();
  await expect(banner).not.toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('hot-seat: build a 1-4 player party with selectable classes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/AdventureGame/');
  await expect(page.locator('.party-builder')).toBeVisible();

  // default party is 2 players
  await expect(page.locator('.party-builder select')).toHaveCount(2);

  // grow to the 4-player cap; add button then disables
  const add = page.getByTitle('add player');
  await add.click();
  await add.click();
  await expect(page.locator('.party-builder select')).toHaveCount(4);
  await expect(add).toBeDisabled();

  // pick distinct classes per player (duplicates allowed, 3 classes / 4 slots)
  const classes = ['warden', 'shadowfoot', 'lorekeeper', 'warden'];
  const selects = page.locator('.party-builder select');
  for (let i = 0; i < 4; i++) await selects.nth(i).selectOption(classes[i]!);

  await page.getByLabel('seed').fill('3');
  await page.getByRole('button', { name: 'New game' }).click();

  // four heroes now in play, in the chosen classes/order
  await expect(page.locator('.hero-row')).toHaveCount(4);
  await expect(page.locator('.hero-row').nth(0)).toContainText('Warden');
  await expect(page.locator('.hero-row').nth(1)).toContainText('Shadowfoot');
  await expect(page.locator('.hero-row').nth(2)).toContainText('Lorekeeper');

  // shrink back down to a solo party
  const remove = page.getByTitle('remove player');
  await remove.click();
  await expect(page.locator('.party-builder select')).toHaveCount(3);

  expect(errors, errors.join('\n')).toEqual([]);
});
