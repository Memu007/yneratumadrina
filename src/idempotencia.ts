// Almacén idempotente en memoria para webhooks

const eventosProcesados = new Set<string>();

// Reserva un evento: devuelve true si es nuevo, false si ya está procesado o reservado
export function reservarEvento(idExterno: string): boolean {
  if (eventosProcesados.has(idExterno)) return false;
  eventosProcesados.add(idExterno);
  return true;
}

// Marca un evento como procesado exitosamente (ya estaba reservado)
export function confirmarProcesado(idExterno: string): void {
  // Ya está en el Set, no hay nada que hacer
  // En una implementación con BD habría un estado: reservado → confirmado
}

// Libera un evento fallido para permitir reintento
export function liberarEvento(idExterno: string): void {
  eventosProcesados.delete(idExterno);
}

// Limpia el almacén (solo para pruebas)
export function limpiarAlmacen() {
  eventosProcesados.clear();
}

// Devuelve la cantidad de eventos registrados (para pruebas)
export function cantidadEventos(): number {
  return eventosProcesados.size;
}
