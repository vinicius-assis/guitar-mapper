import { isRecord, sanitizeV2, type AppData } from './storage';

export const IMPORT_ERROR = 'Arquivo não reconhecido. Escolha um arquivo exportado pelo Guitar Mapper.';

export type ImportResult = { ok: true; data: AppData } | { ok: false; error: string };

export function serializeData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/** Nome do arquivo de exportação, com a data local. */
export function exportFilename(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `guitar-mapper-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export function parseImport(text: string): ImportResult {
  try {
    const parsed: unknown = JSON.parse(text);
    if (isRecord(parsed) && parsed.version === 2 && isRecord(parsed.instruments)) {
      return { ok: true, data: sanitizeV2(parsed) };
    }
  } catch {
    // cai para o erro abaixo
  }
  return { ok: false, error: IMPORT_ERROR };
}
