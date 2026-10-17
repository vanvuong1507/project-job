import { expect, test } from '@playwright/test';
import { ADMIN } from './fixtures';

test.describe('localisation', () => {
  test('Vietnamese login, labels, formats and validation messages', async ({ page }) => {
    await page.goto('/vi');
    await expect(page).toHaveURL(/\/vi\/login\?next=%2Fvi$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Mật khẩu').fill('wrong-password');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng' }),
    ).toBeVisible();

    await page.getByLabel('Mật khẩu').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/vi$/);

    await page.goto('/vi?weekStart=2026-10-12');
    await expect(page.getByRole('heading', { name: 'Dữ liệu tuần' })).toBeVisible();
    await expect(page.getByTestId('total-revenue')).toHaveText('Doanh thu 15.974 US$');
    await page.getByLabel(/^Lượt khách, Thứ 4 /).fill('-3');
    await expect(page.getByText('Phải từ 0 trở lên')).toBeVisible();
  });

  test('the switcher keeps the page and query', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Language').selectOption('vi');
    await expect(page).toHaveURL(/\/vi\/login/);
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  });

  test('logout from a Vietnamese page returns to the Vietnamese login', async ({ page }) => {
    await page.goto('/vi/login');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Mật khẩu').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/vi$/);

    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/vi\/login$/);
    expect((await page.context().cookies()).some((cookie) => cookie.name === 'admin_session')).toBe(
      false,
    );
  });
});
