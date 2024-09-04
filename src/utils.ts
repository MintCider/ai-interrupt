import {Message} from './types';
import ExtInfo = seal.ExtInfo;

export function requestAPI(prompt: Message[], URL: string, key: string, model: string, maxTokens: number, temperature: number, topP: number, presencePenalty: number, frequencyPenalty: number, printLog: boolean) {
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
    // 'presence_penalty': presencePenalty,
    // 'frequency_penalty': frequencyPenalty,
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

export function storageGet(ext: ExtInfo, key: string): string {
  let result = ext.storageGet(key);
  if (result) {
    return result
  } else {
    return '{}'
  }
}

export function storageSet(ext: ExtInfo, key: string, content: string): void {
  ext.storageSet(key, content);
}

export function registerConfigs(ext: ExtInfo): void {
  seal.ext.registerStringConfig(ext, '--------------------------------- 基础设置 ---------------------------------', '本配置项无实际意义');
  seal.ext.registerFloatConfig(ext, 'possibility', 0.05, '插嘴的概率');
  seal.ext.registerIntConfig(ext, 'history_length', 50, '历史记录保存的最大长度');
  seal.ext.registerIntConfig(ext, 'trigger_length', 25, '允许触发插嘴的最小历史记录长度');
  seal.ext.registerIntConfig(ext, 'privilege', 0, '开启关闭插件所需的权限等级');
  seal.ext.registerBoolConfig(ext, 'react_at', true, '被 @ 时是否必定回复（无论历史记录长短）');
  seal.ext.registerStringConfig(ext, 'id', '', '骰子 QQ 号');
  seal.ext.registerBoolConfig(ext, 'debug_prompt', false, '打印 prompt 日志');
  seal.ext.registerBoolConfig(ext, 'debug_resp', true, '打印 API Response 日志');
  seal.ext.registerStringConfig(ext, '--------------------------------- 识图大模型设置 ---------------------------------', '本配置项无实际意义');
  seal.ext.registerStringConfig(ext, '--------------------------------- 文本大模型设置 ---------------------------------', '本配置项无实际意义');
  seal.ext.registerStringConfig(ext, 'system_prompt', '你是一个桌游机器人', '系统提示');
  seal.ext.registerStringConfig(ext, 'request_URL', '', ' API 的 URL');
  seal.ext.registerStringConfig(ext, 'key', '', 'API Key');
  seal.ext.registerStringConfig(ext, 'model', '', 'AI 模型');
  seal.ext.registerIntConfig(ext, 'max_tokens', 200, '最大生成长度');
  seal.ext.registerFloatConfig(ext, 'temperature', 0.5);
  seal.ext.registerFloatConfig(ext, 'top_p', 0.99);
  seal.ext.registerFloatConfig(ext, 'presence_penalty', 0.01);
  seal.ext.registerFloatConfig(ext, 'frequency_penalty', 0.01);
}
