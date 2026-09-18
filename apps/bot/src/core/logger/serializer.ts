export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigInt(item));
  }

  // Handle Object
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }

  // Return primitive values as-is
  return obj;
}

export function createBigIntSerializer() {
  return (value: any) => {
    return serializeBigInt(value);
  };
}
