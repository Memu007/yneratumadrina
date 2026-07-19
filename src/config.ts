// Lee variables de entorno con defaults para pruebas

import { config as dotenv } from 'dotenv';

dotenv();

export const config = {
  get puerto() { return parseInt(process.env.PORT || '3000', 10); },
  get whatsappToken() { return process.env.WHATSAPP_TOKEN || ''; },
  get whatsappPhoneNumberId() { return process.env.WHATSAPP_PHONE_NUMBER_ID || ''; },
  get whatsappVerifyToken() { return process.env.WHATSAPP_VERIFY_TOKEN || ''; },
  get whatsappBusinessAccountId() { return process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || ''; },
  get templateName() { return process.env.WHATSAPP_TEMPLATE_NAME || 'goal_sintetico'; },
  get templateLanguage() { return process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_AR'; },
  get testPhoneMadrina() { return process.env.TEST_PHONE_MADRINA || ''; },
  get testPhoneAhijado() { return process.env.TEST_PHONE_AHIJADO || ''; },
  get appSecret() { return process.env.WHATSAPP_APP_SECRET || ''; },
  get adminToken() { return process.env.ADMIN_TOKEN || ''; },
};

// Valida que las variables críticas estén presentes (solo al arrancar el servidor)
export function validarConfig(): void {
  const requeridas = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET', 'ADMIN_TOKEN'];
  const faltantes = requeridas.filter(k => !process.env[k]);
  if (faltantes.length) {
    throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
  }
}
