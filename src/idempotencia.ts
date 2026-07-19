// Almacén idempotente en memoria para webhooks

type EstadoEvento = 'reservado' | 'confirmado';
const eventosProcesados = new Map<string, EstadoEvento>();

// Reserva un evento atómicamente: devuelve true si es nuevo, false si ya está reservado o confirmado
export function reservarEvento(idExterno: string): boolean {
  if (eventosProcesados.has(idExterno)) return false;
  eventosProcesados.set(idExterno, 'reservado');
  return true;
}

// Marca un evento como procesado exitosamente
export function confirmarProcesado(idExterno: string): void {
  eventosProcesados.set(idExterno, 'confirmado');
}

// Libera un evento fallido para permitir reintento
export function liberarEvento(idExterno: string): void {
  // Solo liberar si está reservado (no confirmado)
  if (eventosProcesados.get(idExterno) === 'reservado') {
    eventosProcesados.delete(idExterno);
  }
}

// Limpia el almacén (solo para pruebas)
export function limpiarAlmacen() {
  eventosProcesados.clear();
}

// Devuelve la cantidad de eventos registrados (para pruebas)
export function cantidadEventos(): number {
  return eventosProcesados.size;
}

// Devuelve el estado de un evento (para pruebas)
export function estadoEvento(idExterno: string): EstadoEvento | undefined {
  return eventosProcesados.get(idExterno);
}
