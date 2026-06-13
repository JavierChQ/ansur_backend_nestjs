import { Order } from './order.entity';

export interface ParsedAddressSnapshot {
  delivery_type?: string;
  customer_name?: string;
  customer_lastname?: string;
  customer_doc_type?: string;
  customer_doc_number?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  referencia?: string;
  receptor_nombres?: string;
  receptor_apellidos?: string;
  receptor_doc_type?: string;
  receptor_doc_number?: string;
}

function extractPart(parts: string[], prefix: string): string | undefined {
  const part = parts.find((value) => value.startsWith(prefix));
  return part ? part.slice(prefix.length).trim() : undefined;
}

function splitFullName(fullName: string): { nombres: string; apellidos: string } {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return { nombres: '', apellidos: '' };
  }
  return {
    nombres: tokens[0],
    apellidos: tokens.slice(1).join(' '),
  };
}

function parseDoc(value?: string): { type: string; number: string } | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/^(DNI|PASAPORTE|CE)\s+(.+)$/);
  if (!match) {
    return undefined;
  }

  return {
    type: match[1],
    number: match[2].trim(),
  };
}

export function parseAddressSnapshot(addressText?: string): ParsedAddressSnapshot | null {
  if (!addressText?.trim()) {
    return null;
  }

  const parts = addressText.split(' | ').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const result: ParsedAddressSnapshot = {};
  const receptorName = extractPart(parts, 'Receptor:');
  const receptorDoc = parseDoc(extractPart(parts, 'Doc receptor:'));

  if (receptorName) {
    const { nombres, apellidos } = splitFullName(receptorName);
    result.receptor_nombres = nombres;
    result.receptor_apellidos = apellidos;
  }

  if (receptorDoc) {
    result.receptor_doc_type = receptorDoc.type;
    result.receptor_doc_number = receptorDoc.number;
  }

  if (parts[0] === 'Retiro en tienda') {
    result.delivery_type = 'pickup';

    const customerName = extractPart(parts, 'Cliente:');
    if (customerName) {
      const { nombres, apellidos } = splitFullName(customerName);
      result.customer_name = nombres;
      result.customer_lastname = apellidos;
    }
  } else {
    result.delivery_type = 'delivery';
    result.direccion = parts[0];

    const location = parts[1];
    if (location) {
      const [distrito, provincia, departamento] = location.split(',').map((value) => value.trim());
      result.distrito = distrito;
      result.provincia = provincia;
      result.departamento = departamento;
    }

    const referencia = extractPart(parts, 'Ref:');
    if (referencia) {
      result.referencia = referencia;
    }
  }

  const customerName = `${result.customer_name ?? ''} ${result.customer_lastname ?? ''}`.trim();
  const receptorFullName = `${result.receptor_nombres ?? ''} ${result.receptor_apellidos ?? ''}`.trim();
  const isSelfReception =
    !customerName || !receptorFullName || customerName.toLowerCase() === receptorFullName.toLowerCase();

  if (isSelfReception && receptorDoc) {
    result.customer_doc_type = receptorDoc.type;
    result.customer_doc_number = receptorDoc.number;
  }

  return result;
}

export function enrichOrderSnapshot<T extends Order>(order: T): T {
  const parsed = parseAddressSnapshot(order.address?.address);
  if (!parsed) {
    return order;
  }

  return {
    ...order,
    delivery_type: order.delivery_type ?? parsed.delivery_type,
    customer_name: order.customer_name ?? parsed.customer_name,
    customer_lastname: order.customer_lastname ?? parsed.customer_lastname,
    customer_doc_type: order.customer_doc_type ?? parsed.customer_doc_type,
    customer_doc_number: order.customer_doc_number ?? parsed.customer_doc_number,
    departamento: order.departamento ?? parsed.departamento,
    provincia: order.provincia ?? parsed.provincia,
    distrito: order.distrito ?? parsed.distrito,
    direccion: order.direccion ?? parsed.direccion,
    referencia: order.referencia ?? parsed.referencia,
    receptor_nombres: order.receptor_nombres ?? parsed.receptor_nombres,
    receptor_apellidos: order.receptor_apellidos ?? parsed.receptor_apellidos,
    receptor_doc_type: order.receptor_doc_type ?? parsed.receptor_doc_type,
    receptor_doc_number: order.receptor_doc_number ?? parsed.receptor_doc_number,
  };
}
