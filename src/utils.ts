import {PromptMessage} from './types';

export function requestAPI(prompt: PromptMessage[], URL: string, key: string, model: string, maxTokens: number, temperature: number, topP: number, printLog: boolean) {
  const header = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`
  };

  let postDict = {
    'model': model,
    'messages': prompt,
    'max_tokens': maxTokens,
    'temperature': temperature,
    'top_p': topP,
  };

  return fetch(URL, {
    method: 'POST',
    headers: header,
    body: JSON.stringify(postDict)
  })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      if (printLog) {
        console.log(JSON.stringify(data));
      }
      return data?.choices?.[0]?.message?.content ?? null;
    });
}

export function storageGet(ext: seal.ExtInfo, key: string): string {
  let result = ext.storageGet(key);
  if (result) {
    return result
  } else {
    return '{}'
  }
}

export function storageSet(ext: seal.ExtInfo, key: string, content: string): void {
  ext.storageSet(key, content);
}

export function replaceMarker(raw: string, nickname: string, id: string, message: string): string {
  return raw
    .replace(/<nickname>/g, nickname)
    .replace(/<id>/g, id)
    .replace(/<message>/g, message);
}
