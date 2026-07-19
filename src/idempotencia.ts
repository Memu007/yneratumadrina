// Almacén idempotente en memoria para webhooks

const eventosProcesados = new Set<string>();

// Devuelve true si el evento es nuevo, false si ya fue procesado
export function marcarProcesado(idExterno: string): boolean {
  if (eventosProcesados.has(idExterno)) return false;
  eventosProcesados.add(idExterno);
  return true;
}

// Limpia el almacén (solo para pruebas)
export function limpiarAlmacen() {
  eventosProcesados.clear();
}

// Devuelve la cantidad de eventos registrados (para pruebas)
export function cantidadEventos(): number {
  return eventosProcesados.size;
}
