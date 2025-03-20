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
  if (!memoryStore.has("switches") || !Boolean(memoryStore.get("switches"))) {
    console.log("ai-interrupt: Failed to load data \"switches\", try reload plugins. If this persists, reset plugin storage.");
  }
  const configs: {
    [key: string]: GroupConfig
  } = JSON.parse(storageGet(ext, "configs"));
  memoryStore.set("configs", configs);
  if (!memoryStore.has("configs") || !Boolean(memoryStore.get("configs"))) {
    console.log("ai-interrupt: Failed to load data \"configs\", try reload plugins. If this persists, reset plugin storage.");
  }
  const histories: {
    [key: string]: ChatHistory
  } = ChatHistory.deserializeFromJson(storageGet(ext, "histories"));
  memoryStore.set("histories", histories);
  if (!memoryStore.has("histories") || !Boolean(memoryStore.get("histories"))) {
    console.log("ai-interrupt: Failed to load data \"histories\", try reload plugins. If this persists, reset plugin storage.");
  }
  const memories: {
    [key: string]: GroupMemory
  } = JSON.parse(storageGet(ext, "memories"));
  memoryStore.set("memories", memories);
  if (!memoryStore.has("memories") || !Boolean(memoryStore.get("memories"))) {
    console.log("ai-interrupt: Failed to load data \"memories\", try reload plugins. If this persists, reset plugin storage.");
  }
}

export function getData<T = any>(key: string): T | undefined {
  if (!memoryStore.has(key)) {
    console.log(`ai-interrupt: Data error, try reload plugins. If this persists, reset plugin storage. Key: ${key}`);
    return undefined;
  }
  return memoryStore.get(key) as T;
}

export function setData<T>(ext: seal.ExtInfo, key: string, value: T) {
  if (value === undefined || value === null) {
    console.log("ai-interrupt: Data error, try reload plugins.");
    return;
  }
  memoryStore.set(key, value);
  storageSet(ext, key, JSON.stringify(value));
}
