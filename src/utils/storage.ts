import {memoryStore} from "../data";
import {ChatHistory, GroupConfig, GroupMemory} from "../model";

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

export function initializeStore(ext: seal.ExtInfo) {
  const switches: {
    [key: string]: boolean
  } = JSON.parse(storageGet(ext, "switches"));
  memoryStore.set("switches", switches);
  const configs: {
    [key: string]: GroupConfig
  } = JSON.parse(storageGet(ext, "configs"));
  memoryStore.set("configs", configs);
  const histories: {
    [key: string]: ChatHistory
  } = ChatHistory.deserializeFromJson(storageGet(ext, "histories"));
  memoryStore.set("histories", histories);
  const memories: {
    [key: string]: GroupMemory
  } = JSON.parse(storageGet(ext, "memories"));
  memoryStore.set("memories", memories);
}

export function getData<T = any>(key: string): T | undefined {
  return memoryStore.get(key) as T;
}

export function setData<T>(ext: seal.ExtInfo, key: string, value: T) {
  memoryStore.set(key, value);
  storageSet(ext, key, JSON.stringify(value));
}
