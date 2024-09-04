type Role = 'user' | 'assistant' | 'system';

export type Message = {
  role: Role;
  content: string;
};

export class ChatHistory {
  messages: Message[];

  constructor() {
    this.messages = [];
  }

  addMessageUser(message: string, lengthLimit: number): void {
    while(this.messages.length >= lengthLimit) {
      this.messages.shift();
    }
    this.messages.push({
      role: 'user',
      content: message,
    });
  }

  addMessageAssistant(message: string, lengthLimit: number): void {
    while(this.messages.length >= lengthLimit) {
      this.messages.shift();
    }
    this.messages.push({
      role: 'assistant',
      content: message,
    });
  }

  getLength(): number {
    return this.messages.length;
  }

  buildPrompt(systemPrompt: string): Message[]{
    let system: Message[] = [{role: 'system', content: systemPrompt}];
    return system.concat(this.messages);
  }

  buildPromptString(systemPrompt: string): string{
    return JSON.stringify(this.buildPrompt(systemPrompt));
  }

  static fromJSONToMap(json: string): { [key: string]: ChatHistory} {
    let raw: { [key: string]: { [key: string]: Message[]} } = JSON.parse(json);
    let result: { [key: string]: ChatHistory } = {};
    for (const key in raw) {
      let history = new ChatHistory();
      history.messages = raw[key]['messages'];
      result[key] = history;
    }
    return result;
  }
}
