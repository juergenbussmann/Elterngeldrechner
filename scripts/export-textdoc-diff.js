#!/usr/bin/env node
/**
 * Diff-Workflow: ALT sichern, NEU erzeugen.
 * Führt generate-text-doc.js mit EXPORT_ALT=1 und EXPORT_NEU=1 aus.
 */
process.env.EXPORT_ALT = '1';
process.env.EXPORT_NEU = '1';
import('./generate-text-doc.js');
