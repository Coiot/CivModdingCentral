#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, '.env.local'));

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_EDITOR_SHEET || 'Sheet2';
const GOOGLE_SHEET_COLUMN = process.env.GOOGLE_SHEET_EDITOR_COLUMN || 'B';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_EDITOR_ALLOWLIST_TABLE = process.env.SUPABASE_EDITOR_ALLOWLIST_TABLE || 'cmc_editor_access';

if (!GOOGLE_SHEET_ID) {
  console.error('Missing GOOGLE_SHEET_ID');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error('Missing SUPABASE_URL');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const SHEET_RANGE = `${GOOGLE_SHEET_COLUMN}:${GOOGLE_SHEET_COLUMN}`;
const SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${encodeURIComponent(GOOGLE_SHEET_ID)}/gviz/tq` +
  `?tqx=out:csv&sheet=${encodeURIComponent(GOOGLE_SHEET_NAME)}&range=${encodeURIComponent(SHEET_RANGE)}`;

async function main() {
  const csvResponse = await fetch(SHEET_URL);
  if (!csvResponse.ok) {
    throw new Error(`Unable to fetch Sheet2 emails (${csvResponse.status})`);
  }

  const csvText = await csvResponse.text();
  const rows = parseCsv(csvText);
  const values = rows.map((row) => (row[0] || '').trim());
  const emails = Array.from(
    new Set(
      values
        .slice(1)
        .map(normalizeEmail)
        .filter(Boolean)
    )
  );

  const payload = emails.map((email) => ({
    email,
    source: 'sheet2',
  }));

  if (payload.length > 0) {
    const upsertResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_EDITOR_ALLOWLIST_TABLE}?on_conflict=email`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!upsertResponse.ok) {
      const text = await upsertResponse.text();
      throw new Error(`Failed to upsert allowlist emails: ${text}`);
    }
  }

  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_EDITOR_ALLOWLIST_TABLE}?select=email&source=eq.sheet2`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!existingResponse.ok) {
    const text = await existingResponse.text();
    throw new Error(`Failed to read existing allowlist rows: ${text}`);
  }

  const existingRows = await existingResponse.json();
  const emailSet = new Set(emails);
  const stale = (Array.isArray(existingRows) ? existingRows : [])
    .map((row) => normalizeEmail(row?.email))
    .filter((email) => email && !emailSet.has(email));

  for (const email of stale) {
    const params = new URLSearchParams();
    params.set('source', 'eq.sheet2');
    params.set('email', `eq.${email}`);
    const deleteResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_EDITOR_ALLOWLIST_TABLE}?${params.toString()}`,
      {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!deleteResponse.ok) {
      const text = await deleteResponse.text();
      throw new Error(`Failed to delete stale email ${email}: ${text}`);
    }
  }

  console.log(
    `Synced ${emails.length} allowlist emails from ${GOOGLE_SHEET_NAME}!${SHEET_RANGE}. Removed ${stale.length} stale rows.`
  );
}

function normalizeEmail(input) {
  const value = String(input || '').trim().toLowerCase();
  if (!value || !value.includes('@')) {
    return '';
  }
  return value;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const unquoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    if (!(key in process.env)) {
      process.env[key] = unquoted;
    }
  }
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    if (char === '\r') {
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.length > 1 || row[0] !== '') {
    rows.push(row);
  }

  return rows;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
