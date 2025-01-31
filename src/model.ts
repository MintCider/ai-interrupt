import {replaceMarker} from "./utils/format";

type Role = "user" | "assistant" | "system";

export type Message = {
  role: Role;
  nickname: string;
  id: string;
  content: string;
};

export type PromptMessage = {
  role: Role;
  content: string;
}

type ImagePromptContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ImagePromptMessage = {
  role: Role;
  content: ImagePromptContent[];
}

export class ChatHistory {
  messages: Message[];

  constructor() {
    this.messages = [];
  }

  addMessageUser(message: string, nickname: string, id: string, lengthLimit: number): void {
    while (this.messages.length >= lengthLimit) {
      this.messages.shift();
    }
    this.messages.push({
      role: "user",
      nickname: nickname,
      id: id,
      content: message,
    });
  }

  addMessageAssistant(message: string, nickname: string, id: string, lengthLimit: number): void {
    while (this.messages.length >= lengthLimit) {
      this.messages.shift();
    }
    this.messages.push({
      role: "assistant",
      nickname: nickname,
      id: id,
      content: message,
    });
  }

  getLength(): number {
    return this.messages.length;
  }

  buildPrompt(systemPromptSwitch: boolean, systemPrompt: string, userSchema: string, assistantSchema: string, memory: string, multiTurn: boolean): PromptMessage[] {
    const prompt: PromptMessage[] = systemPromptSwitch ? [{
      role: "system",
      content: systemPrompt
    }] : [];
    let combinedContent: string = "";

    for (const message of this.messages) {
      const parsedMessage = replaceMarker(
        message.role === "user" ? userSchema : assistantSchema,
        message.nickname,
        message.id,
        message.content,
        memory,
      );
      combinedContent = combinedContent + parsedMessage + "\n";
      if (multiTurn) {
        prompt.push({role: message.role, content: parsedMessage});
      }
    }
    if (!multiTurn) {
      prompt.push({role: "user", content: combinedContent});
    }

    return prompt;
  }

  static deserializeFromJson(json: string): { [key: string]: ChatHistory } {
    const result: { [key: string]: ChatHistory } = {};

    const raw: { [key: string]: any } = JSON.parse(json);

    for (const [key, data] of Object.entries(raw)) {
      const chatHistory = new ChatHistory();

      // 类型安全校验
      if (Array.isArray(data?.messages)) {
        chatHistory.messages = data.messages.map(msg => ({
          role: msg.role,          // 默认值处理
          nickname: msg.nickname,      // 防止undefined
          id: msg.id,
          content: msg.content
        }));
      }

      result[key] = chatHistory;
    }

    return result;
  }
}

export type GroupConfig = {
  possibility: number | null,
  historyLength: number | null,
  triggerLength: number | null,
  privilege: number | null,
}

export type GroupMemory = string[];
