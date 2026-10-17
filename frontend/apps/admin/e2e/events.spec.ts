import { expect, test } from '@playwright/test';
import { signIn } from './fixtures';

function uniqueMonday(): string {
  const monday = new Date(Date.UTC(2032, 0, 5) + Math.floor(Math.random() * 5000) * 7 * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

test.describe('events', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test('lists the seeded events of the week', async ({ page }) => {
    await page.goto('/events?weekStart=2026-10-12');

    const rows = page.getByRole('row');
    await expect(rows.filter({ hasText: 'Heavy rain' })).toContainText('Negative');
    await expect(rows.filter({ hasText: 'Local food festival' })).toContainText('Positive');
  });

  test('adds, edits and deletes an event', async ({ page }) => {
    const week = uniqueMonday();
    await page.goto(`/events?weekStart=${week}`);
    await expect(page.getByRole('status').filter({ hasText: 'No events this week' })).toBeVisible();

    // Add
    await page.getByRole('button', { name: 'Add event' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add event' });
    await dialog.getByRole('button', { name: 'Add event' }).click();
    await expect(dialog.getByText('Title is required')).toBeVisible();

    await dialog.getByLabel('Impact').selectOption('NEGATIVE');
    await dialog.getByLabel('Title').fill('Road works');
    await dialog.getByLabel('Description').fill('Street closed for parking.');
    await dialog.getByRole('button', { name: 'Add event' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: 'Road works' })).toContainText('Negative');

    // Edit
    await page.getByRole('button', { name: 'Edit Road works' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit event' });
    await expect(editDialog.getByLabel('Title')).toHaveValue('Road works');
    await editDialog.getByLabel('Title').fill('Road closed');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Road closed' })).toBeVisible();

    // Delete (cancel first, then confirm)
    await page.getByRole('button', { name: 'Delete Road closed' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Road closed' })).toBeVisible();

    await page.getByRole('button', { name: 'Delete Road closed' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'No events this week' })).toBeVisible();
  });

  test('the dialog closes with Escape and keeps focus inside while open', async ({ page }) => {
    await page.goto(`/events?weekStart=${uniqueMonday()}`);
    await page.getByRole('button', { name: 'Add event' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add event' });

    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
