import {ImagePromptMessage, PromptMessage} from "./types";

export async function requestAPI(prompt: PromptMessage[] | ImagePromptMessage[], URL: string, key: string, model: string, maxTokens: number, temperature: number, topP: number, printLog: boolean): Promise<string | null> {
  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  };

  let postDict = {
    "model": model,
    "messages": prompt,
    "max_tokens": maxTokens,
  };
  if (temperature >= 0 && temperature <= 1) {
    postDict["temperature"] = temperature;
  }
  if (topP >= 0 && topP <= 1) {
    postDict["top_p"] = topP;
  }

  const response = await fetch(URL, {
    method: "POST",
    headers: header,
    body: JSON.stringify(postDict),
  });

  if (!response.ok) {
    if (printLog) {
      console.log(`ai-interrupt: Failed to request API: HTTP ${response.status}: ${response.statusText}`);
    }
    return null
  }

  const data = await response.json();

  if (printLog) {
    console.log(JSON.stringify(data));
  }

  return data?.choices?.[0]?.message?.content ?? null;
}

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

export function replaceMarker(raw: string, nickname: string, id: string, message: string): string {
  return raw
    .replace(/<nickname>/g, nickname)
    .replace(/<id>/g, id)
    .replace(/<message>/g, message);
}

function buildImagePrompt(imageURL: string, systemPrompt: string): ImagePromptMessage[] {
  const result: ImagePromptMessage[] = [{
    role: "system",
    content: [{type: "text", text: systemPrompt}]
  }]

  result.push({
    role: "user",
    content: [{
      type: "image_url",
      image_url: {url: imageURL}
    }]
  });
  return result;
}

export async function replaceCQImage(raw: string, systemPrompt: string, URL: string, key: string, model: string, maxTokens: number, temperature: number, topP: number, debugPrompt: boolean, debugResp: boolean): Promise<string> {
  const regexPattern = /\[CQ:image[^\[\]]*(file|url)=(http[^,]*)[^\[\]]*?\]/g;
  const matches: { match: string; capture: string }[] = [];
  raw.replace(regexPattern, (match, _, capture) => {
    matches.push({match, capture});
    return match;
  })
  const results: (string | null)[] = await Promise.all(
    matches.map(async ({capture}) => {
      if (debugPrompt) {
        console.log(JSON.stringify(buildImagePrompt(capture, systemPrompt)));
      }
      const resp = await requestAPI(buildImagePrompt(capture, systemPrompt), URL, key, model, maxTokens, temperature, topP, debugResp);
      if (!resp) {
        return null;
      }
      return resp;
    })
  );
  const matchMap: { [key: string]: string | null } = {};
  matches.forEach((matchObj, i) => {
    matchMap[matchObj.match] = results[i];
  })
  return raw.replace(regexPattern, (match, _capture) => {
    if (matchMap[match]) {
      return `[图像：${matchMap[match]}]`
    }
    return match;
  })
}
