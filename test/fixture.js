// A seeded test clinic on a fixed date, so results are the same every run.
import { ClinicRepository } from '../src/ClinicRepository.js';
import { readSql } from '../src/sqlFiles.js';

export const TODAY = '2026-10-15';            // a Thursday
export const NOW = '2026-10-15 09:50';
export const schema = readSql('schema.sql');

export const clinic = (open, options = {}) =>
  new ClinicRepository(open()).init({ schema, today: TODAY, now: NOW, generatedPatients: 150, ...options });
