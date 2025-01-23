import {ChatHistory, GroupConfig, GroupMemory} from "./model";
import {
  bodyBuilder,
  formatMemory,
  replaceCQImage,
  replaceMarker,
  requestAPI,
  storageGet,
  storageSet
} from "./util";
import {helpStr} from "./data";
import {dispatcher, setCommand} from "./command/dispatcher";
import {
  genClearShowDeleteOption,
  genDefaultOption,
  genSetUnsetOption,
  handleClear,
  handleDelete,
  handleOff,
  handleOn,
  handleSet,
  handleShow,
  handleStatus,
  handleUnset
} from "./command/handler";
import {checkData, checkPlatform, checkPrivilege} from "./command/middleware";

function registerConfigs(ext: seal.ExtInfo): void {
  seal.ext.registerStringConfig(ext, "---------------------------- 基础设置 ----------------------------", "本配置项无实际意义");
  seal.ext.registerFloatConfig(ext, "possibility", 0.05, "插嘴的概率");
  seal.ext.registerIntConfig(ext, "history_length", 50, "历史记录保存的最大长度");
  seal.ext.registerIntConfig(ext, "trigger_length", 25, "允许触发插嘴的最小历史记录长度");
  seal.ext.registerIntConfig(ext, "privilege", 0, "执行特定命令所需的权限等级");
  seal.ext.registerStringConfig(ext, "nickname", "", "骰子昵称");
  seal.ext.registerStringConfig(ext, "id", "", "骰子 QQ 号");
  seal.ext.registerBoolConfig(ext, "react_at", true, "被 @ 时是否必定回复（无论历史记录长短）");
  seal.ext.registerTemplateConfig(ext, "trigger_words", [""], "提升插嘴概率的正则表达式");
  seal.ext.registerTemplateConfig(ext, "trigger_words_possibility", [""], "对应正则表达式提升的概率");
  seal.ext.registerBoolConfig(ext, "reply", false, "插嘴时是否回复触发消息");
  seal.ext.registerBoolConfig(ext, "debug_prompt", false, "打印 prompt 日志");
  seal.ext.registerBoolConfig(ext, "debug_resp", true, "打印 API Response 日志");
  seal.ext.registerStringConfig(ext, "---------------------------- 视觉大模型设置 ----------------------------", "本配置项无实际意义");
  seal.ext.registerBoolConfig(ext, "parse_image", false, "是否解析图像（⚠️注意流量、token 消耗和延迟⚠️）");
  seal.ext.registerStringConfig(ext, "image_system_prompt", "你工作在 QQ 群聊中，以下是出现在群聊中的一张图片，请用中文简练地概括图像内容。", "视觉大模型的系统提示");
  seal.ext.registerStringConfig(ext, "image_request_URL", "", "视觉大模型的 API URL");
  seal.ext.registerStringConfig(ext, "image_key", "", "视觉大模型的 API Key");
  seal.ext.registerStringConfig(ext, "image_model", "", "视觉大模型的型号");
  seal.ext.registerIntConfig(ext, "image_max_tokens", 200, "视觉大模型的最大生成长度");
  seal.ext.registerFloatConfig(ext, "image_temperature", -1);
  seal.ext.registerFloatConfig(ext, "image_top_p", -1);
  seal.ext.registerBoolConfig(ext, "image_custom_api", false, "是否使用自定义 API（格式详见 README）");
  seal.ext.registerStringConfig(ext, "image_custom_api_url", "", "自定义 API 的 URL");
  seal.ext.registerStringConfig(ext, "---------------------------- 文本大模型设置 ----------------------------", "本配置项无实际意义");
  seal.ext.registerBoolConfig(ext, "multi_turn", false, "以多轮对话的形式请求 API");
  seal.ext.registerBoolConfig(ext, "system_schema_switch", true, "是否为文本大模型提供系统提示");
  seal.ext.registerStringConfig(ext, "system_schema",
    "你是一个工作在群聊中的机器人，你叫<nickname>，id为<id>。你工作在群聊中。接下来你会收到一系列消息，来自不同的用户和你自己，以及你曾经记录的记忆。你应该如此插话：\n\n" +
    "1. 以「<nickname>（<id>）：内容」的方式回复。\n" +
    "2. 如果你认为有值得长期记忆的内容，另起一行，以[memory]记忆内容[/memory]的格式返回，将尖括号替换为实际的记忆内容。\n" +
    "3. 如果你认为有些记忆不必再记住，另起一行，以[delete]要删除的记忆内容[/delete]的格式返回，要删除的内容不要包括序号，要与记忆本身一致。\n\n" +
    "回复越短越好，如同真正的群聊参与者。\n\n" +
    "当前记忆：\n" +
    "<memory>", "文本大模型的系统提示格式");
  seal.ext.registerStringConfig(ext, "user_schema", "<nickname>（<id>）：<message>", "文本大模型的用户消息 prompt 格式");
  seal.ext.registerStringConfig(ext, "assistant_schema", "<nickname>（<id>）：<message>", "文本大模型的骰子消息 prompt 格式");
  seal.ext.registerStringConfig(ext, "retrieve_schema", "<nickname>（<id>）：(.*)", "从大模型回复提取骰子消息的正则表达式（**注意区分全角半角**）");
  seal.ext.registerBoolConfig(ext, "memory_switch", false, "是否启用记忆功能");
  seal.ext.registerStringConfig(ext, "memory_schema", "\\[memory\\](.*)\\[/memory\\]", "从大模型回复提取记忆的正则表达式（**注意区分全角半角**）");
  seal.ext.registerStringConfig(ext, "delete_memory_schema", "\\[delete\\](.*)\\[/delete\\]", "从大模型回复删除记忆的正则表达式（**注意区分全角半角**）");
  // seal.ext.registerBoolConfig(ext, "regexp_s", false, "提取回复时，允许通配符（.）匹配换行符（\\n）（暂不可用）");
  seal.ext.registerBoolConfig(ext, "regexp_g", false, "提取回复时，处理多个匹配项");
  seal.ext.registerStringConfig(ext, "request_URL", "", "文本大模型的 API URL");
  seal.ext.registerStringConfig(ext, "key", "", "文本大模型的 API Key");
  seal.ext.registerStringConfig(ext, "model", "", "文本大模型的型号");
  seal.ext.registerIntConfig(ext, "max_tokens", 200, "文本大模型最大生成长度");
  seal.ext.registerFloatConfig(ext, "temperature", -1);
  seal.ext.registerFloatConfig(ext, "top_p", -1);
  seal.ext.registerBoolConfig(ext, "custom_request_body", false, '是否使用自定义 API 请求体，开启后除注入 "message" 外，不再注入其他参数');
  seal.ext.registerStringConfig(ext, "custom_request_body_text", '{\n' +
    '    "model": "charglm-3",\n' +
    '    "max_tokens": 200\n' +
    '}', '自定义 API 请求体，在此基础上注入 "message"，请注意 JSON 格式');
  seal.ext.registerBoolConfig(ext, "mock_resp", false, "不再请求 API 并使用下方的测试文本作为 API 回复");
  seal.ext.registerStringConfig(ext, "mock_resp_text", "", "假响应的回复文本");
}

function registerCommand(ext: seal.ExtInfo): void {
  const cmdInterrupt = seal.ext.newCmdItemInfo();
  cmdInterrupt.name = "interrupt";
  cmdInterrupt.help = helpStr;
  cmdInterrupt.solve = (ctx, msg, cmdArgs) => {
    return dispatcher(ext, ctx, msg, cmdArgs);
  }
  setCommand("on", handleOn, [checkPlatform, checkPrivilege], genDefaultOption);
  setCommand("off", handleOff, [checkPlatform, checkPrivilege], genDefaultOption);
  setCommand("status", handleStatus);
  setCommand("clear", handleClear, [checkPlatform, checkData, checkPrivilege], genClearShowDeleteOption);
  setCommand("show", handleShow, [checkPlatform, checkData], genClearShowDeleteOption);
  setCommand("delete", handleDelete, [checkPlatform, checkData, checkPrivilege], genClearShowDeleteOption);
  setCommand("set", handleSet, [checkPlatform, checkPrivilege], genSetUnsetOption);
  setCommand("unset", handleUnset, [checkPlatform, checkPrivilege], genSetUnsetOption);
  ext.cmdMap["interrupt"] = cmdInterrupt;
}

async function onNotCommandReceived(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message) {
  // Check environment
  if (msg.platform !== "QQ" || ctx.isPrivate || ctx.group.logOn) {
    return;
  }
  let switches: {
    [key: string]: boolean
  } = JSON.parse(storageGet(ext, "switches"));
  if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
    return
  }
  if (!msg.message) {
    return
  }

  // Load chat histories
  const rawHistories: {
    [key: string]: { [key: string]: any[] }
  } = JSON.parse(storageGet(ext, "histories"));
  const currentHistory: ChatHistory = new ChatHistory();

  // Check data validity
  let valid = true;
  if (ctx.group.groupId in rawHistories) {
    for (const message of rawHistories[ctx.group.groupId]["messages"]) {
      valid = message.role && message.id && message.content;
    }
    if (!valid) {
      switches[ctx.group.groupId] = false;
      storageSet(ext, "switches", JSON.stringify(switches));
      seal.replyToSender(ctx, msg, "AI 插嘴：数据有误，请考虑回退插件版本，或使用 .interrupt clear all 清空保存的聊天记录。本插件已自动关闭，可使用 .interrupt on 开启。");
      return
    }
    currentHistory.messages = rawHistories[ctx.group.groupId]["messages"];
  } else {
    rawHistories[ctx.group.groupId] = {};
  }

  // Load group configs
  const configs: {
    [key: string]: GroupConfig
  } = JSON.parse(storageGet(ext, "configs"));
  let possibility = configs[ctx.group.groupId] && configs[ctx.group.groupId].possibility ?
    configs[ctx.group.groupId].possibility : seal.ext.getFloatConfig(ext, "possibility");
  const historyLength = configs[ctx.group.groupId] && configs[ctx.group.groupId].historyLength ?
    configs[ctx.group.groupId].historyLength : seal.ext.getIntConfig(ext, "history_length");
  const triggerLength = configs[ctx.group.groupId] && configs[ctx.group.groupId].triggerLength ?
    configs[ctx.group.groupId].triggerLength : seal.ext.getIntConfig(ext, "trigger_length");

  // Check global configs' validity
  let missingConfig = "";
  if (!seal.ext.getStringConfig(ext, "nickname")) {
    valid = false;
    missingConfig += missingConfig ? "、骰子昵称" : "骰子昵称";
  }
  if (!seal.ext.getStringConfig(ext, "id")) {
    valid = false;
    missingConfig += missingConfig ? "、骰子 QQ 号" : "骰子 QQ 号";
  }
  if (!(
    seal.ext.getStringConfig(ext, "request_URL") && seal.ext.getStringConfig(ext, "key") && seal.ext.getStringConfig(ext, "model")
  )) {
    valid = false;
    missingConfig += missingConfig ? "、文本大模型相关信息" : "文本大模型相关信息";
  }
  if (seal.ext.getBoolConfig(ext, "parse_image") && !(
    seal.ext.getStringConfig(ext, "image_request_URL") && seal.ext.getStringConfig(ext, "image_key") && seal.ext.getStringConfig(ext, "image_model")
  )) {
    valid = false;
    missingConfig += missingConfig ? "、视觉大模型相关信息" : "视觉大模型相关信息";
  }
  if (!valid) {
    switches[ctx.group.groupId] = false;
    storageSet(ext, "switches", JSON.stringify(switches));
    seal.replyToSender(ctx, msg, `AI 插嘴：插件配置项缺少：${missingConfig}。请联系骰主。本插件已自动关闭，可使用 .interrupt on 开启。`);
    return
  }

  // Insert user content
  let userMessage = msg.message;
  const userMessageID = msg.rawId;
  if (userMessage.includes("[CQ:image") && seal.ext.getBoolConfig(ext, "parse_image")) {
    userMessage = await replaceCQImage(
      userMessage,
      seal.ext.getStringConfig(ext, "image_system_prompt"),
      seal.ext.getStringConfig(ext, "image_request_URL"),
      seal.ext.getStringConfig(ext, "image_key"),
      seal.ext.getStringConfig(ext, "image_model"),
      seal.ext.getIntConfig(ext, "image_max_tokens"),
      seal.ext.getFloatConfig(ext, "image_temperature"),
      seal.ext.getFloatConfig(ext, "image_top_p"),
      seal.ext.getBoolConfig(ext, "debug_prompt"),
      seal.ext.getBoolConfig(ext, "debug_resp"),
      seal.ext.getBoolConfig(ext, "image_custom_api"),
      seal.ext.getStringConfig(ext, "image_custom_api_url"),
    )
  }
  currentHistory.addMessageUser(userMessage, ctx.player.name, msg.sender.userId.slice(3), historyLength);
  rawHistories[ctx.group.groupId]["messages"] = currentHistory.messages;
  storageSet(ext, "histories", JSON.stringify(rawHistories));

  // Trigger
  let trigger = false;
  // Check at
  if (msg.message.includes(`[CQ:at,qq=${seal.ext.getStringConfig(ext, "id")}]`)) {
    trigger = seal.ext.getBoolConfig(ext, "react_at");
  }
  // Check trigger words
  for (let i = 0; i < seal.ext.getTemplateConfig(ext, "keywords").length; i++) {
    const keyword = new RegExp(seal.ext.getTemplateConfig(ext, "keywords")[i]);
    if (keyword.test(msg.message)) {
      possibility += Number(seal.ext.getTemplateConfig(ext, "keywords_possibility")[i]);
      break;
    }
  }
  trigger = trigger || (currentHistory.getLength() >= triggerLength && Math.random() < possibility);
  if (trigger) {
    // Load group memories
    const memories: {
      [key: string]: GroupMemory
    } = JSON.parse(storageGet(ext, "memories"));
    if (!(ctx.group.groupId in memories)) {
      memories[ctx.group.groupId] = [];
    }
    // Format request body
    const reqBody = bodyBuilder(
      currentHistory.buildPrompt(
        seal.ext.getBoolConfig(ext, "system_schema_switch"),
        replaceMarker(
          seal.ext.getStringConfig(ext, "system_schema"),
          seal.ext.getStringConfig(ext, "nickname"),
          seal.ext.getStringConfig(ext, "id"),
          "",
          formatMemory(memories[ctx.group.groupId]),
        ),
        seal.ext.getStringConfig(ext, "user_schema"),
        seal.ext.getStringConfig(ext, "assistant_schema"),
        formatMemory(memories[ctx.group.groupId]),
        seal.ext.getBoolConfig(ext, "multi_turn")
      ),
      seal.ext.getBoolConfig(ext, "custom_request_body"), seal.ext.getStringConfig(ext, "custom_request_body_text"),
      seal.ext.getStringConfig(ext, "model"), seal.ext.getIntConfig(ext, "max_tokens"),
      seal.ext.getFloatConfig(ext, "temperature"), seal.ext.getFloatConfig(ext, "top_p"),
    );
    // Debug output
    if (seal.ext.getBoolConfig(ext, "debug_prompt")) {
      console.log(JSON.stringify(reqBody));
    }
    // Request API
    let resp = seal.ext.getBoolConfig(ext, "mock_resp") ?
      seal.ext.getStringConfig(ext, "mock_resp_text") :
      await requestAPI(seal.ext.getStringConfig(ext, "request_URL"), seal.ext.getStringConfig(ext, "key"),
        reqBody,
        seal.ext.getBoolConfig(ext, "debug_resp")
      );
    // Handle memory
    if (seal.ext.getBoolConfig(ext, "memory_switch")) {
      const memoryMatchExpr = new RegExp(replaceMarker(
        seal.ext.getStringConfig(ext, "memory_schema"),
        seal.ext.getStringConfig(ext, "nickname"),
        seal.ext.getStringConfig(ext, "id"),
        "",
        "",
      ), "g");
      const deleteMemoryMatchExpr = new RegExp(replaceMarker(
        seal.ext.getStringConfig(ext, "delete_memory_schema"),
        seal.ext.getStringConfig(ext, "nickname"),
        seal.ext.getStringConfig(ext, "id"),
        "",
        "",
      ), "g");
      const memoryMatchResult = [...resp.matchAll(memoryMatchExpr)];
      const deleteMemoryMatchResult = [...resp.matchAll(deleteMemoryMatchExpr)];
      for (const match of memoryMatchResult) {
        const memory = match?.[1] ?? "";
        if (!memory) {
          continue;
        }
        memories[ctx.group.groupId].push(memory);
      }
      for (const match of deleteMemoryMatchResult) {
        const memory = match?.[1] ?? "";
        if (!memory) {
          continue;
        }
        memories[ctx.group.groupId] = memories[ctx.group.groupId].filter((item) => item !== memory);
      }
      storageSet(ext, "memories", JSON.stringify(memories));
      // Remove matched
      resp = resp
        .replace(memoryMatchExpr, "")
        .replace(deleteMemoryMatchExpr, "")
        .trim();
    }
    // Handle assistant message
    const retrieveMatchExpr = new RegExp(replaceMarker(
      seal.ext.getStringConfig(ext, "retrieve_schema"),
      seal.ext.getStringConfig(ext, "nickname"),
      seal.ext.getStringConfig(ext, "id"),
      "",
      "",
    ), "g");
    // ), seal.ext.getBoolConfig(ext, "regexp_s") ? "gs" : "g");
    const retrieveMatchResult = [...resp.matchAll(retrieveMatchExpr)];
    for (const match of retrieveMatchResult) {
      const assistantMessage = match?.[1] ?? "";
      if (!assistantMessage) {
        continue;
      }
      currentHistory.addMessageAssistant(
        assistantMessage,
        seal.ext.getStringConfig(ext, "nickname"),
        seal.ext.getStringConfig(ext, "id"),
        historyLength
      );
      rawHistories[ctx.group.groupId]["messages"] = currentHistory.messages;
      storageSet(ext, "histories", JSON.stringify(rawHistories));
      seal.replyToSender(ctx, msg, `${seal.ext.getBoolConfig(ext, 'reply') ? `[CQ:reply,id=${userMessageID}]` : ""}${assistantMessage}`);
      if (!seal.ext.getBoolConfig(ext, "regexp_g")) {
        break;
      }
    }
  }
}

function main() {
  // 注册扩展
  let ext = seal.ext.find("ai-interrupt");
  if (!ext) {
    ext = seal.ext.new("ai-interrupt", "Mint Cider", "0.5.1");

    registerCommand(ext);
    seal.ext.register(ext);
    registerConfigs(ext);

    ext.onNotCommandReceived = async (ctx: seal.MsgContext, msg: seal.Message) => {
      await onNotCommandReceived(ext, ctx, msg);
    }
  }
}

main();
