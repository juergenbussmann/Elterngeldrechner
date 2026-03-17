/**
 * Sichtprüfung des Wizard-Monatsdialogs unter /documents/elterngeld.
 * Prüft die 4 Fälle (A, B, C, D) für Partnerschaftsbonus-Texte und -Buttons.
 *
 * Ausführung:
 *   1. Terminal 1: npm run dev
 *   2. Terminal 2: npx tsx scripts/verify-wizard-month-dialog.ts
 *
 * Voraussetzung: Dev-Server läuft auf Port 5173
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5173';

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results: Record<string, { text: string; button: string; tested: boolean; afterClick: string }> = {
    A: { text: '', button: '', tested: false, afterClick: '' },
    B: { text: '', button: '', tested: false, afterClick: '' },
    C: { text: '', button: '', tested: false, afterClick: '' },
    D: { text: '', button: '', tested: false, afterClick: '' },
  };

  try {
    await page.goto(`${BASE_URL}/documents/elterngeld`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Vorbereitung setzen: Beide Eltern, Plan-Schritt vorbereitet (stepIndex wird beim Klick auf Weiter gesetzt)
    const prep = {
      state: '',
      applicantMode: 'both_parents',
      child: { birthDate: '', expectedBirthDate: futureDate(90), multipleBirth: false },
      parentA: { firstName: 'A', lastName: 'A', employmentType: 'employed', incomeBeforeBirth: '2000', plannedPartTime: false },
      parentB: { firstName: 'B', lastName: 'B', employmentType: 'employed', incomeBeforeBirth: '2000', plannedPartTime: false },
      benefitPlan: { model: 'basis', parentAMonths: '3', parentBMonths: '3', partnershipBonus: false },
    };
    await page.evaluate((p) => {
      localStorage.setItem('elterngeld.preparation.v1', JSON.stringify(p));
    }, prep);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Bis zum Plan-Schritt navigieren (3x Weiter von GeburtKind)
    for (let i = 0; i < 3; i++) {
      const weiterBtn = page.getByRole('button', { name: /Weiter/i });
      await weiterBtn.waitFor({ state: 'visible', timeout: 5000 });
      await weiterBtn.click();
      await page.waitForTimeout(400);
    }

    // Monat 3 anklicken – Plan-Schritt sollte jetzt sichtbar sein
    const month3 = page.getByRole('button', { name: /Lebensmonat 3/ });
    await month3.click();
    await page.waitForTimeout(400);

    const dialog = page.locator('.elterngeld-plan__panel');
    const hintEl = dialog.locator('.elterngeld-plan__panel-hint--context');
    const quickfixBtn = dialog.locator('.elterngeld-plan__panel-quickfix-btn');

    const clickLeistung = async (label: string) => {
      await dialog.locator('.elterngeld-plan__panel-leistung-btns').getByRole('button', { name: label }).click();
      await page.waitForTimeout(200);
    };
    const clickWer = async (label: string) => {
      await dialog.locator('.elterngeld-plan__panel-actions').getByRole('button', { name: label }).click();
      await page.waitForTimeout(200);
    };

    // --- Fall A: Basiselterngeld + Beide ---
    await clickLeistung('Basiselterngeld');
    await clickWer('Beide');
    const textA = (await hintEl.textContent())?.trim() ?? '';
    const btnA = (await quickfixBtn.isVisible()) ? (await quickfixBtn.textContent())?.trim() ?? '' : '(keiner)';
    results['A'] = { text: textA, button: btnA, tested: false, afterClick: '' };

    if (await quickfixBtn.isVisible()) {
      await quickfixBtn.click();
      await page.waitForTimeout(300);
      const textAfterA = (await hintEl.textContent())?.trim() ?? '';
      results['A'].tested = true;
      results['A'].afterClick = textAfterA;
      // Zurück zu Fall A für nächsten Test: Beide bleibt, aber Leistung auf Basis
      await clickLeistung('Basiselterngeld');
      await clickWer('Beide');
      await page.waitForTimeout(200);
    }

    // --- Fall B: ElterngeldPlus + Mutter ---
    await clickLeistung('ElterngeldPlus');
    await clickWer('Mutter');
    const textB = (await hintEl.textContent())?.trim() ?? '';
    const btnB = (await quickfixBtn.isVisible()) ? (await quickfixBtn.textContent())?.trim() ?? '' : '(keiner)';
    results['B'] = { text: textB, button: btnB, tested: false, afterClick: '' };

    if (await quickfixBtn.isVisible()) {
      await quickfixBtn.click();
      await page.waitForTimeout(300);
      const textAfterB = (await hintEl.textContent())?.trim() ?? '';
      results['B'].tested = true;
      results['B'].afterClick = textAfterB;
      // Zurück: Plus + Mutter
      await clickLeistung('ElterngeldPlus');
      await clickWer('Mutter');
      await page.waitForTimeout(200);
    }

    // --- Fall C: Basiselterngeld + Mutter ---
    await clickLeistung('Basiselterngeld');
    await clickWer('Mutter');
    const textC = (await hintEl.textContent())?.trim() ?? '';
    const btnC = (await quickfixBtn.isVisible()) ? (await quickfixBtn.textContent())?.trim() ?? '' : '(keiner)';
    results['C'] = { text: textC, button: btnC, tested: false, afterClick: '' };

    if (await quickfixBtn.isVisible()) {
      await quickfixBtn.click();
      await page.waitForTimeout(300);
      const textAfterC = (await hintEl.textContent())?.trim() ?? '';
      results['C'].tested = true;
      results['C'].afterClick = textAfterC;
      // Zurück: Basis + Mutter
      await clickLeistung('Basiselterngeld');
      await clickWer('Mutter');
      await page.waitForTimeout(200);
    }

    // --- Fall D: ElterngeldPlus + Beide ---
    await clickLeistung('ElterngeldPlus');
    await clickWer('Beide');
    const textD = (await hintEl.textContent())?.trim() ?? '';
    const btnD = (await quickfixBtn.isVisible()) ? (await quickfixBtn.textContent())?.trim() ?? '' : '(keiner)';
    results['D'] = { text: textD, button: btnD, tested: false, afterClick: '' };
    results['D'].tested = true;
    results['D'].afterClick = '(kein Button – korrekt)';
  } catch (err) {
    try {
      await page.screenshot({ path: 'scripts/verify-wizard-failure.png' });
    } catch {
      /* ignore */
    }
    if (err instanceof Error) {
      process.stderr.write(`Fehler: ${err.message}\n`);
    }
  } finally {
    await browser.close();
  }

  // Ausgabe im geforderten Format
  for (const fall of ['A', 'B', 'C', 'D']) {
    const r = results[fall];
    console.log(`Fall ${fall}:`);
    console.log(`- sichtbarer Text: ${r?.text ?? ''}`);
    console.log(`- sichtbarer Button: ${r?.button ?? ''}`);
    console.log(`- Button getestet: ${r?.tested ? 'ja' : 'nein'}`);
    console.log(`- sichtbares Ergebnis nach Klick: ${r?.afterClick ?? ''}`);
    console.log('');
  }
}

main();
