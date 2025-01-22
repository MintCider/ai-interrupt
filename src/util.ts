import {GroupMemory, ImagePromptMessage, PromptMessage} from "./model";

export function bodyBuilder(prompt: PromptMessage[] | ImagePromptMessage[], customBody: boolean, customBodyText: string, model: string, maxTokens: number, temperature: number, topP: number): any | null {
  let postBody: any;
  if (customBody) {
    try {
      postBody = JSON.parse(customBodyText);
    } catch (e) {
      console.log(`ai-interrupt: Failed to parse custom body: ${e}`);
      return null;
    }
  } else {
    postBody = {
      "model": model,
      "max_tokens": maxTokens,
    };
    if (temperature >= 0 && temperature <= 1) {
      postBody["temperature"] = temperature;
    }
    if (topP >= 0 && topP <= 1) {
      postBody["top_p"] = topP;
    }
  }
  postBody["messages"] = prompt;
  return postBody;
}

export async function requestAPI(URL: string, key: string, reqBody: any | null, printLog: boolean): Promise<string | null> {
  if (reqBody === null) {
    return null;
  }

  const header = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${key}`
  };

  const response = await fetch(URL, {
    method: "POST",
    headers: header,
    body: JSON.stringify(reqBody),
  });

  const data = await response.json();
  if (!response.ok) {
    if (printLog) {
      console.log(`ai-interrupt: Failed to request API: HTTP ${response.status}: ${response.statusText}\n${data ? JSON.stringify(data) : ""}`);
    }
    return null
  }

  if (printLog) {
    console.log(JSON.stringify(data));
  }

  return data?.choices?.[0]?.message?.content ?? null;
}

export async function requestImageCustomAPI(URL: string, imageCustomAPIURL: string, printLog: boolean): Promise<string | null> {
  const response = await fetch(imageCustomAPIURL, {
    method: "POST",
    body: JSON.stringify({"url": URL}),
  });
  const data = await response.json();
  if (!response.ok) {
    if (printLog) {
      console.log(`ai-interrupt: Failed to request image custom API: HTTP ${response.status}: ${response.statusText}\n${data ? JSON.stringify(data) : ""}\nMaybe you need to check your custom API server.`);
    }
    return null
  }
  if (printLog) {
    console.log(JSON.stringify(data));
  }
  return data?.data ?? null;
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

export function replaceMarker(raw: string, nickname: string, id: string, message: string, memory: string): string {
  return raw
    .replace(/<nickname>/g, nickname)
    .replace(/<id>/g, id)
    .replace(/<message>/g, message)
    .replace(/<memory>/g, memory)
    .replace(/<time>/g, Date().toString());
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

export async function replaceCQImage(raw: string, systemPrompt: string, URL: string, key: string, model: string, maxTokens: number, temperature: number, topP: number, debugPrompt: boolean, debugResp: boolean, imageCustomAPI: boolean, imageCustomAPIURL: string): Promise<string> {
  const regexPattern = /\[CQ:image[^\[\]]*(file|url)=(http[^,]*)[^\[\]]*?\]/g;
  const matches: { match: string; capture: string }[] = [];
  raw.replace(regexPattern, (match, _, capture) => {
    matches.push({match, capture});
    return match;
  })
  const results: (string | null)[] = await Promise.all(
    matches.map(async ({capture}) => {
      if (imageCustomAPI) {
        const resp = await requestImageCustomAPI(capture, imageCustomAPIURL, debugResp);
        if (!resp) {
          return null;
        }
        return resp;
      } else {
        const prompt = buildImagePrompt(capture, systemPrompt);
        if (debugPrompt) {
          console.log(JSON.stringify(prompt));
        }
        const resp = await requestAPI(URL, key, bodyBuilder(
          prompt, false, "", model, maxTokens, temperature, topP
        ), debugResp);
        if (!resp) {
          return null;
        }
        return resp;
      }
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

export function formatMemory(memory: GroupMemory): string {
  let result = ""
  for (let i = 0; i < memory.length; i++) {
    result += `${i + 1}. ${memory[i]}\n`;
  }
  result = result.slice(0, -1);
  return result ? result : "无";
}
