/**
 * E2E tests — Flujo de login (Playwright)
 * Requiere: servidor Next.js corriendo en localhost:3000
 * Corre con: npm run test:e2e
 */
import { test, expect } from "@playwright/test";

const LOGIN_URL = "/login";

test.describe("Página de Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  test("muestra el formulario de login", async ({ page }) => {
    await expect(page.getByRole("textbox", { name: /correo/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /contraseña/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /ingresar|iniciar/i })).toBeVisible();
  });

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.getByRole("textbox", { name: /correo/i }).fill("noexiste@test.com");
    await page.getByRole("textbox", { name: /contraseña/i }).fill("WrongPass1!");
    await page.getByRole("button", { name: /ingresar|iniciar/i }).click();

    // Esperar algún mensaje de error
    await expect(
      page.getByText(/inválid|incorrecta|no encontrado|credenciales/i)
    ).toBeVisible({ timeout: 8000 });
  });

  test("valida formato de email en cliente", async ({ page }) => {
    await page.getByRole("textbox", { name: /correo/i }).fill("no-es-email");
    await page.getByRole("textbox", { name: /contraseña/i }).fill("cualquier");
    await page.getByRole("button", { name: /ingresar|iniciar/i }).click();

    // HTML5 validation o mensaje Zod
    const input = page.getByRole("textbox", { name: /correo/i });
    const validationMessage = await input.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    const hasHtmlValidation = validationMessage.length > 0;
    const hasErrorText = await page
      .getByText(/inválid|formato/i)
      .isVisible()
      .catch(() => false);

    expect(hasHtmlValidation || hasErrorText).toBe(true);
  });

  test("redirige al dashboard con credenciales válidas", async ({ page }) => {
    // Solo corre si hay usuario de prueba configurado
    const testEmail = process.env.E2E_TEST_EMAIL;
    const testPassword = process.env.E2E_TEST_PASSWORD;

    test.skip(!testEmail || !testPassword, "E2E_TEST_EMAIL y E2E_TEST_PASSWORD no configurados");

    await page.getByRole("textbox", { name: /correo/i }).fill(testEmail!);
    await page.getByRole("textbox", { name: /contraseña/i }).fill(testPassword!);
    await page.getByRole("button", { name: /ingresar|iniciar/i }).click();

    // Debe abandonar /login y llegar al dashboard/proyectos
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
  });
});

test.describe("Protección de rutas", () => {
  test("redirige /proyectos a /login sin sesión", async ({ page }) => {
    await page.goto("/proyectos");
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });

  test("redirige /admin/usuarios a /login sin sesión", async ({ page }) => {
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });

  test("redirige /financiero a /login sin sesión", async ({ page }) => {
    await page.goto("/proyectos/cualquier-id/financiero");
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });
});
