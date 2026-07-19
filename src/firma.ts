// Validación de firma del webhook (X-Hub-Signature-256)

import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

// Valida que el header X-Hub-Signature-256 coinca con el body firmado con HMAC SHA-256
export function validarFirma(body: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !config.appSecret) return false;

  const prefijo = 'sha256=';
  if (!signatureHeader.startsWith(prefijo)) return false;

  const firmaEsperada = createHmac('sha256', config.appSecret)
    .update(body)
    .digest('hex');

  const firmaRecibida = signatureHeader.slice(prefijo.length);

  // Validar formato: 64 caracteres hexadecimales
  if (!/^[0-9a-f]{64}$/.test(firmaRecibida)) return false;

  if (firmaRecibida.length !== firmaEsperada.length) return false;

  return timingSafeEqual(
    Buffer.from(firmaRecibida, 'hex'),
    Buffer.from(firmaEsperada, 'hex')
  );
}
