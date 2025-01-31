export function storageGet(ext: seal.ExtInfo, key: string): string {
  let result = ext.storageGet(key);
  if (result) {
    return result
  } else {
    return "{}"
  }
}

export function storageSet(ext: seal.ExtInfo, key: string, content: string): void {
  ext.storageSet(key, content);
}
