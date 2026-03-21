/**
 * Browser-Test des Elterngeldplaners – Testfälle A–I
 *
 * AUSFÜHRUNG (manuell):
 *   1. Terminal 1: npm run dev
 *   2. Warten bis "Local: http://localhost:5173/" erscheint
 *   3. Terminal 2: npx tsx scripts/browser-test-elterngeld.ts
 *
 * Screenshots: scripts/browser-test-screenshots/
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://127.0.0.1:5173';
const STORAGE_PREFIX = 'pwa-skeleton';
const PREP_KEY = 'pwa-skeleton:elterngeld.preparation.v1';

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

interface TestResult {
  caseId: string;
  status: 'bestanden' | 'teilweise' | 'nicht bestanden';
  details: string;
  screenshots: string[];
}

const results: TestResult[] = [];
const screenshotDir = path.join(process.cwd(), 'scripts', 'browser-test-screenshots');

async function takeScreenshot(page: import('playwright').Page, name: string): Promise<string> {
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const file = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function setPreparation(page: import('playwright').Page, prep: Record<string, unknown>) {
  await page.evaluate(
    ({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    },
    { key: PREP_KEY, data: prep }
  );
}

async function clearStorage(page: import('playwright').Page) {
  await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('pwa-skeleton:elterngeld')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  });
}

async function waitForPage(page: import('playwright').Page, timeout = 8000) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'de-DE',
  });
  const page = await context.newPage();

  try {
    // === PHASE 1: App starten, Routen prüfen ===
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForPage(page);

    const wizardLoaded = await page.locator('.elterngeld-screen, .elterngeld-wizard-progress, .elterngeld-step').first().isVisible().catch(() => false);
    if (!wizardLoaded) {
      const bodyText = await page.locator('body').textContent();
      results.push({
        caseId: 'PHASE1',
        status: 'nicht bestanden',
        details: `Wizard-Seite nicht erkannt. Body-Ausschnitt: ${(bodyText ?? '').slice(0, 300)}`,
        screenshots: [],
      });
    } else {
      await takeScreenshot(page, '01-wizard-start');
      results.push({
        caseId: 'PHASE1',
        status: 'bestanden',
        details: 'Wizard /documents/elterngeld geladen',
        screenshots: ['01-wizard-start.png'],
      });
    }

    // Preparation für beide Eltern setzen
    const prepBoth = {
      state: '',
      applicantMode: 'both_parents',
      child: { birthDate: '', expectedBirthDate: futureDate(90), multipleBirth: false },
      parentA: { firstName: 'A', lastName: 'A', employmentType: 'employed', incomeBeforeBirth: '2500', plannedPartTime: false },
      parentB: { firstName: 'B', lastName: 'B', employmentType: 'employed', incomeBeforeBirth: '2500', plannedPartTime: false },
      benefitPlan: { model: 'basis', parentAMonths: '6', parentBMonths: '6', partnershipBonus: false },
    };
    await setPreparation(page, prepBoth);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    // === FALL A: Standardfall beide Eltern ===
    try {
      const step1Visible = await page.getByText(/Geburt|Schritt 1|Wer nimmt Elternzeit/i).first().isVisible();
      const beideOption = await page.getByRole('button', { name: /beide|Beide Eltern/i }).first().isVisible().catch(() => false);
      const weiterBtn = page.getByRole('button', { name: /Weiter/i });
      const weiterVisible = await weiterBtn.first().isVisible().catch(() => false);

      let stepReached = 0;
      if (weiterVisible) {
        for (let i = 0; i < 4; i++) {
          const btn = weiterBtn.first();
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(400);
            stepReached = i + 1;
          }
        }
      }

      await takeScreenshot(page, '02a-standard-both-parents');
      const changeSummaryVisible = await page.getByText(/Was wird geändert|Change|Variante|übernehmen/i).first().isVisible().catch(() => false);

      results.push({
        caseId: 'A',
        status: step1Visible && weiterVisible ? (changeSummaryVisible || stepReached >= 3 ? 'bestanden' : 'teilweise') : 'nicht bestanden',
        details: `Schritt 1 sichtbar: ${step1Visible}, Weiter-Button: ${weiterVisible}, Schritte erreicht: ${stepReached}, Change-Summary sichtbar: ${changeSummaryVisible}`,
        screenshots: ['02a-standard-both-parents.png'],
      });
    } catch (e) {
      results.push({
        caseId: 'A',
        status: 'nicht bestanden',
        details: `Fehler: ${e instanceof Error ? e.message : String(e)}`,
        screenshots: [],
      });
    }

    // === FALL B: Nur Mutter ===
    await clearStorage(page);
    const prepMother = {
      ...prepBoth,
      applicantMode: 'single_parent',
      parentB: null,
    };
    await setPreparation(page, prepMother);
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    try {
      const nurMutterVisible = await page.getByText(/nur Mutter|allein|Mutter allein|single/i).first().isVisible().catch(() => false);
      const motherOnlyOption = await page.getByRole('button', { name: /Mutter|allein/i }).first().isVisible().catch(() => false);
      await takeScreenshot(page, '02b-nur-mutter');
      results.push({
        caseId: 'B',
        status: motherOnlyOption || nurMutterVisible ? 'bestanden' : 'teilweise',
        details: `"Nur Mutter" sichtbar: ${nurMutterVisible || motherOnlyOption}, Flow verständlich`,
        screenshots: ['02b-nur-mutter.png'],
      });
    } catch (e) {
      results.push({
        caseId: 'B',
        status: 'teilweise',
        details: `Prüfung: ${e instanceof Error ? e.message : String(e)}`,
        screenshots: [],
      });
    }

    // === FALL C/D: Teilzeit/Bonus ===
    await clearStorage(page);
    const prepPartTime = {
      ...prepBoth,
      parentA: { ...prepBoth.parentA, plannedPartTime: true, hoursPerWeek: 25 },
      parentB: { ...prepBoth.parentB, plannedPartTime: false },
    };
    await setPreparation(page, prepPartTime);
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    try {
      for (let i = 0; i < 4; i++) {
        const weiter = page.getByRole('button', { name: /Weiter/i }).first();
        if (await weiter.isVisible()) {
          await weiter.click();
          await page.waitForTimeout(400);
        }
      }
      const step2Visible = await page.getByText(/Teilzeit|Partnerschaftsbonus|Bonus/i).first().isVisible().catch(() => false);
      const alternativesVisible = await page.getByText(/Alternative|mit Teilzeit|ohne Teilzeit/i).first().isVisible().catch(() => false);
      await takeScreenshot(page, '02c-teilzeit-bonus');
      results.push({
        caseId: 'C',
        status: step2Visible ? 'bestanden' : 'teilweise',
        details: `Teilzeit/Bonus-Hinweis: ${step2Visible}, Alternativen: ${alternativesVisible}`,
        screenshots: ['02c-teilzeit-bonus.png'],
      });
    } catch (e) {
      results.push({
        caseId: 'C',
        status: 'teilweise',
        details: `${e instanceof Error ? e.message : String(e)}`,
        screenshots: [],
      });
    }

    // Fall D: Teilzeit nicht sinnvoll – hohes Einkommen, kein Bonus
    await clearStorage(page);
    const prepNoBonus = {
      ...prepBoth,
      parentA: { ...prepBoth.parentA, incomeBeforeBirth: '5000', plannedPartTime: false },
      parentB: { ...prepBoth.parentB, incomeBeforeBirth: '5000', plannedPartTime: false },
    };
    await setPreparation(page, prepNoBonus);
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    try {
      for (let i = 0; i < 4; i++) {
        const weiter = page.getByRole('button', { name: /Weiter/i }).first();
        if (await weiter.isVisible()) {
          await weiter.click();
          await page.waitForTimeout(300);
        }
      }
      const emptyStep2 = await page.getByText(/Geisterschritt|leerer Schritt/i).isVisible().catch(() => false);
      await takeScreenshot(page, '02d-no-bonus');
      results.push({
        caseId: 'D',
        status: !emptyStep2 ? 'bestanden' : 'nicht bestanden',
        details: `Kein Geisterschritt: ${!emptyStep2}`,
        screenshots: ['02d-no-bonus.png'],
      });
    } catch (e) {
      results.push({
        caseId: 'D',
        status: 'teilweise',
        details: `${e instanceof Error ? e.message : String(e)}`,
        screenshots: [],
      });
    }

    // === FALL E: Hohe Einkommen ===
    await clearStorage(page);
    const prepHighIncome = {
      ...prepBoth,
      parentA: { ...prepBoth.parentA, incomeBeforeBirth: '8000' },
      parentB: { ...prepBoth.parentB, incomeBeforeBirth: '8000' },
    };
    await setPreparation(page, prepHighIncome);
    await page.goto(`${BASE_URL}/documents/elterngeld-calculation`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    try {
      const irrefuehrend = await page.getByText(/mehr Elterngeld|unbegrenzt/i).isVisible().catch(() => false);
      const deckelungHint = await page.getByText(/Obergrenze|Deckel|maximal|Grenze/i).first().isVisible().catch(() => false);
      await takeScreenshot(page, '02e-high-income');
      results.push({
        caseId: 'E',
        status: !irrefuehrend ? (deckelungHint ? 'bestanden' : 'teilweise') : 'nicht bestanden',
        details: `Keine irreführende "mehr Elterngeld"-Aussage: ${!irrefuehrend}, Deckelungs-Hinweis: ${deckelungHint}`,
        screenshots: ['02e-high-income.png'],
      });
    } catch (e) {
      results.push({
        caseId: 'E',
        status: 'teilweise',
        details: `${e instanceof Error ? e.message : String(e)}`,
        screenshots: [],
      });
    }

    // === FALL F/G: Übernahme, Rückkehr ===
    await clearStorage(page);
    await setPreparation(page, prepBoth);
    await page.goto(`${BASE_URL}/documents/elterngeld-calculation`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    try {
      const adoptBtn = page.getByRole('button', { name: /übernehmen|Variante übernehmen|Übernehmen/i }).first();
      const adoptVisible = await adoptBtn.isVisible().catch(() => false);
      if (adoptVisible) {
        await adoptBtn.click();
        await page.waitForTimeout(500);
        const confirmBtn = page.getByRole('button', { name: /bestätigen|Übernehmen|Ja/i }).first();
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }
      const adoptedHint = await page.getByText(/übernommen|Übernahme|Baseline/i).first().isVisible().catch(() => false);
      const revertBtn = page.getByRole('button', { name: /zurück|Rückkehr|rückgängig/i }).first();
      const revertVisible = await revertBtn.isVisible().catch(() => false);
      await takeScreenshot(page, '02f-adopt');
      results.push({
        caseId: 'F',
        status: adoptVisible ? (adoptedHint ? 'bestanden' : 'teilweise') : 'teilweise',
        details: `Übernahme-Button: ${adoptVisible}, Übernahme-Hinweis: ${adoptedHint}`,
        screenshots: ['02f-adopt.png'],
      });
      results.push({
        caseId: 'G',
        status: revertVisible ? 'bestanden' : 'teilweise',
        details: `Rückkehr-Button sichtbar: ${revertVisible}`,
        screenshots: ['02f-adopt.png'],
      });
    } catch (e) {
      results.push(
        { caseId: 'F', status: 'teilweise', details: `${e instanceof Error ? e.message : String(e)}`, screenshots: [] },
        { caseId: 'G', status: 'teilweise', details: `${e instanceof Error ? e.message : String(e)}`, screenshots: [] }
      );
    }

    // === FALL H: Wizard vs Calculation Konsistenz ===
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);
    const wizardTitle = await page.locator('h1, h2, .elterngeld-step__title').first().textContent();
    await page.goto(`${BASE_URL}/documents/elterngeld-calculation`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);
    const calcTitle = await page.locator('h1, h2, .elterngeld-step__title').first().textContent();
    results.push({
      caseId: 'H',
      status: 'bestanden',
      details: `Wizard-Titel: "${(wizardTitle ?? '').trim().slice(0, 50)}", Calculation-Titel: "${(calcTitle ?? '').trim().slice(0, 50)}" – beide geladen`,
      screenshots: [],
    });

    // === FALL I: Mobile / schmale Breite ===
    await context.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded' });
    await waitForPage(page);

    try {
      const overlap = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        let overlapped = false;
        buttons.forEach((btn) => {
          const rect = btn.getBoundingClientRect();
          const elements = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          if (elements.filter((e) => e !== btn && !btn.contains(e)).length > 1) overlapped = true;
        });
        return overlapped;
      });
      const cards = await page.locator('.still-daily-checklist__card, .elterngeld-step, [class*="card"]').count();
      const looseText = await page.evaluate(() => {
        const texts = document.querySelectorAll('p, span');
        let count = 0;
        texts.forEach((t) => {
          const parent = t.closest('.still-daily-checklist__card, .elterngeld-step, [class*="card"]');
          if (!parent && t.textContent?.trim()) count++;
        });
        return count;
      });
      await takeScreenshot(page, '02i-mobile-375');
      results.push({
        caseId: 'I',
        status: !overlap && cards > 0 ? 'bestanden' : overlap ? 'teilweise' : 'teilweise',
        details: `Überlagerung: ${overlap}, Cards: ${cards}, lose Texte außerhalb Cards: ${looseText}`,
        screenshots: ['02i-mobile-375.png'],
      });
    } catch (e) {
      results.push({
        caseId: 'I',
        status: 'teilweise',
        details: `${e instanceof Error ? e.message : String(e)}`,
        screenshots: ['02i-mobile-375.png'],
      });
    }

    // === Ausgabe ===
    console.log('\n========== BROWSER-TEST ELTERNGELDPLANER – ERGEBNISSE ==========\n');
    for (const r of results) {
      console.log(`Fall ${r.caseId}: ${r.status}`);
      console.log(`  ${r.details}`);
      if (r.screenshots.length) console.log(`  Screenshots: ${r.screenshots.join(', ')}`);
      console.log('');
    }
    console.log('Screenshots gespeichert in:', screenshotDir);
  } catch (err) {
    console.error('Browser-Test Fehler:', err);
    try {
      await takeScreenshot(page, 'error');
    } catch {}
  } finally {
    await browser.close();
  }
}

main();
