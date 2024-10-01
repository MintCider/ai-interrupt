import {replaceMarker} from "./utils";

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

  buildPrompt(systemPrompt: string, userSchema: string, assistantSchema: string): PromptMessage[] {
    const prompt: PromptMessage[] = [{role: "system", content: systemPrompt}];
    let content: string = "";

    for (const message of this.messages) {
      const parsedMessage = replaceMarker(
        message.role === "user" ? userSchema : assistantSchema,
        message.nickname,
        message.id,
        message.content,
      );
      content = content + parsedMessage + "\n";
    }
    prompt.push({role: "user", content});

    return prompt;
  }

  buildPromptString(systemPrompt: string, userSchema: string, assistantSchema: string): string {
    return JSON.stringify(this.buildPrompt(systemPrompt, userSchema, assistantSchema));
  }
}

export type GroupConfig = {
  possibility: number | null,
  historyLength: number | null,
  triggerLength: number | null,
  privilege: number | null,
}
