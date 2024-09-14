import { replaceMarker } from "./utils";

type Role = "user" | "assistant" | "system";

export type Message = {
  role: Role;
  nickname: string;
  id: string;
  content: string;
  expire: number;
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

  addMessageUser(message: string, nickname: string, id: string, lengthLimit: number, expire_time: number): void {
    if ((this.messages.length > 0)) {
      while (this.messages.length > 0 && this.messages[0].expire < Date.now() && this.messages[0].expire > 0) {
        this.messages.shift();
      }
      while (this.messages.length >= lengthLimit) {
        this.messages.shift();
      } 
    }
    this.messages.push({
      role: "user",
      nickname: nickname,
      id: id,
      content: message,
      expire: expire_time == 0 ? 0 : Date.now() + expire_time * 1000
    });
  }

  addMessageAssistant(message: string, nickname: string, id: string, lengthLimit: number, expire_time: number): void {
    if ((this.messages.length > 0)) {
      while (this.messages.length > 0 && this.messages[0].expire < Date.now() && this.messages[0].expire > 0) {
        this.messages.shift();
      }

      while (this.messages.length >= lengthLimit) {
        this.messages.shift();
      } 
    }
    this.messages.push({
      role: "assistant",
      nickname: nickname,
      id: id,
      content: message,
      expire: expire_time == 0 ? 0 : Date.now() + expire_time * 1000
    });
  }

  getLength(): number {
    return this.messages.length;
  }

  buildPrompt(systemPrompt: string, userSchema: string, assistantSchema: string): PromptMessage[] {
    const prompt: PromptMessage[] = [{ role: "system", content: systemPrompt }];
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
    prompt.push({ role: "user", content });

    return prompt;
  }

  buildPromptString(systemPrompt: string, userSchema: string, assistantSchema: string): string {
    return JSON.stringify(this.buildPrompt(systemPrompt, userSchema, assistantSchema));
  }
}
