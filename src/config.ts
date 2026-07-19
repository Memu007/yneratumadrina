// Lee variables de entorno con defaults para pruebas

import { config as dotenv } from 'dotenv';

dotenv();

export const config = {
  puerto: parseInt(process.env.PORT || '3000', 10),
  whatsappToken: process.env.WHATSAPP_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'goal_sintetico',
  templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es_AR',
  testPhoneMadrina: process.env.TEST_PHONE_MADRINA || '',
  testPhoneAhijado: process.env.TEST_PHONE_AHIJADO || '',
};

// Valida que las variables críticas estén presentes (solo al arrancar el servidor)
export function validarConfig(): void {
  const requeridas = ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN'];
  const faltantes = requeridas.filter(k => !process.env[k]);
  if (faltantes.length) {
    throw new Error(`Faltan variables de entorno: ${faltantes.join(', ')}`);
  }
}
