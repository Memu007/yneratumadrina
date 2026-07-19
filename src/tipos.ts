// Tipos de los webhooks de WhatsApp Cloud API

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  field: string;
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    messages?: MensajeEntrante[];
    statuses?: EstadoMensaje[];
  };
}

export interface MensajeEntrante {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  button?: {
    text: string;
  };
}

export interface EstadoMensaje {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}
