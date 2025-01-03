import {replaceMarker} from "./util";

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
}

export type GroupConfig = {
  possibility: number | null,
  historyLength: number | null,
  triggerLength: number | null,
  privilege: number | null,
}

export type GroupMemory = string[];
