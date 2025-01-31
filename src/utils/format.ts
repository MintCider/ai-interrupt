import {GroupMemory} from "../model";

export function replaceMarker(raw: string, nickname: string, id: string, message: string, memory: string): string {
  return raw
    .replace(/<nickname>/g, nickname)
    .replace(/<id>/g, id)
    .replace(/<message>/g, message)
    .replace(/<memory>/g, memory)
    .replace(/<time>/g, Date().toString());
}

export function formatMemory(memory: GroupMemory): string {
  let result = ""
  for (let i = 0; i < memory.length; i++) {
    result += `${i + 1}. ${memory[i]}\n`;
  }
  result = result.slice(0, -1);
  return result ? result : "无";
}
