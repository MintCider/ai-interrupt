import {GroupMemory} from "../model";

export function replaceMarker(raw: string, nickname: string, id: string, message: string, memory: string, keys: string[], values: string[]): string {
  const markerList = ["nickname", "id", "message", "memory", "time"];
  const markerMap: {[key: string]: string} = {
    nickname: nickname,
    id: id,
    message: message,
    memory: memory,
    time: Date().toString()
  }
  for (let i = 0; i < keys.length && i < values.length; i++) {
    markerList.push(keys[i]);
    markerMap[keys[i]] = eval(values[i]);
  }
  for (const marker of markerList) {
    raw = raw.replace(new RegExp(`\{\{${marker}\}\}`, "g"), markerMap[marker]);
  }
  return raw;
}

export function formatMemory(memory: GroupMemory): string {
  let result = ""
  for (let i = 0; i < memory.length; i++) {
    result += `${i + 1}. ${memory[i]}\n`;
  }
  result = result.slice(0, -1);
  return result ? result : "无";
}
