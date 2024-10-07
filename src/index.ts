import {ChatHistory, GroupConfig} from "./types";
import {
  replaceCQImage,
  replaceMarker,
  requestAPI,
  storageGet,
  storageSet
} from "./utils";

function registerConfigs(ext: seal.ExtInfo): void {
  seal.ext.registerStringConfig(ext, "---------------------------- 基础设置 ----------------------------", "本配置项无实际意义");
  seal.ext.registerFloatConfig(ext, "possibility", 0.05, "插嘴的概率");
  seal.ext.registerIntConfig(ext, "history_length", 50, "历史记录保存的最大长度");
  seal.ext.registerIntConfig(ext, "trigger_length", 25, "允许触发插嘴的最小历史记录长度");
  seal.ext.registerIntConfig(ext, "privilege", 0, "执行特定命令所需的权限等级");
  seal.ext.registerStringConfig(ext, "nickname", "", "骰子昵称");
  seal.ext.registerStringConfig(ext, "id", "", "骰子 QQ 号");
  seal.ext.registerBoolConfig(ext, "react_at", true, "被 @ 时是否必定回复（无论历史记录长短）");
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
  seal.ext.registerStringConfig(ext, "---------------------------- 文本大模型设置 ----------------------------", "本配置项无实际意义");
  seal.ext.registerStringConfig(ext, "system_schema",
    "你是一个工作在群聊中的机器人，你叫<nickname>，id为<id>。你工作在群聊中。接下来你会收到一系列消息，来自不同的用户和你自己。首先，你应该判断现在是否适合插话，如果不适合，请直接回复「无」。如果适合，你应该如此插话：\n" +
    "\n" +
    "1. 以「<nickname>（<id>）：<内容>」的方式回复。\n" +
    "\n" +
    "记住，如果现在不适合插话，请直接回复「无」，回复越短越好，如同真正的群聊参与者。", "文本大模型的系统提示格式");
  seal.ext.registerStringConfig(ext, "user_schema", "<nickname>（<id>）：<message>", "文本大模型的用户消息 prompt 格式");
  seal.ext.registerStringConfig(ext, "assistant_schema", "<nickname>（<id>）：<message>", "文本大模型的骰子消息 prompt 格式");
  seal.ext.registerStringConfig(ext, "retrieve_schema", "<nickname>（<id>）：(.*)", "从大模型回复提取骰子消息的正则表达式（**注意区分全角半角**）");
  seal.ext.registerBoolConfig(ext, "regexp_s", false, "提取回复时，允许通配符（.）匹配换行符（\\n）（暂不可用）");
  seal.ext.registerBoolConfig(ext, "regexp_g", false, "提取回复时，处理多个匹配项");
  seal.ext.registerStringConfig(ext, "request_URL", "", "文本大模型的 API URL");
  seal.ext.registerStringConfig(ext, "key", "", "文本大模型的 API Key");
  seal.ext.registerStringConfig(ext, "model", "", "文本大模型的型号");
  seal.ext.registerIntConfig(ext, "max_tokens", 200, "文本大模型最大生成长度");
  seal.ext.registerFloatConfig(ext, "temperature", -1);
  seal.ext.registerFloatConfig(ext, "top_p", -1);
  seal.ext.registerBoolConfig(ext, "mock_resp", false, "不再请求 API 并使用下方的测试文本作为 API 回复");
  seal.ext.registerStringConfig(ext, "mock_resp_text", "", "假响应的回复文本");
}

function registerCommand(ext: seal.ExtInfo): void {
  const cmdInterrupt = seal.ext.newCmdItemInfo();
  cmdInterrupt.name = "interrupt";
  cmdInterrupt.help = "可以使用 .interrupt on/off/status 来开启/关闭/查看 AI 插嘴功能，可以使用 .interrupt clear all/users/assistant 清除储存的历史记录";
  cmdInterrupt.solve = (ctx, msg, cmdArgs) => {
    const command = cmdArgs.getArgN(1);
    const switches: {
      [key: string]: boolean
    } = JSON.parse(storageGet(ext, "switches"));
    const rawHistories: {
      [key: string]: { [key: string]: any[] }
    } = JSON.parse(storageGet(ext, "histories"));
    const configs: {
      [key: string]: GroupConfig
    } = JSON.parse(storageGet(ext, "configs"));
    const privilege = configs[ctx.group.groupId] && configs[ctx.group.groupId].privilege ?
      configs[ctx.group.groupId].privilege : seal.ext.getIntConfig(ext, "privilege");
    switch (command) {
      case "on": {
        if (msg.platform !== "QQ" || ctx.isPrivate) {
          seal.replyToSender(ctx, msg, "只能在 QQ 群聊中开启或关闭插嘴功能！");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < privilege) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        switches[ctx.group.groupId] = true;
        storageSet(ext, "switches", JSON.stringify(switches));
        seal.replyToSender(ctx, msg, "群内 AI 插嘴功能开启了");
        return seal.ext.newCmdExecuteResult(true);
      }
      case "off": {
        if (msg.platform !== "QQ" || ctx.isPrivate) {
          seal.replyToSender(ctx, msg, "只能在 QQ 群聊中开启或关闭插嘴功能！");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < privilege) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        switches[ctx.group.groupId] = false;
        storageSet(ext, "switches", JSON.stringify(switches));
        seal.replyToSender(ctx, msg, "群内 AI 插嘴功能关闭了");
        return seal.ext.newCmdExecuteResult(true);
      }
      case "status": {
        if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
          seal.replyToSender(ctx, msg, "群内 AI 插嘴功能是关闭状态");
          return seal.ext.newCmdExecuteResult(true);
        }
        seal.replyToSender(ctx, msg, "群内 AI 插嘴功能是开启状态");
        return seal.ext.newCmdExecuteResult(true);
      }
      case "clear": {
        if (!(ctx.group.groupId in rawHistories)) {
          seal.replyToSender(ctx, msg, "暂无本群的聊天记录");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < privilege) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        const option = cmdArgs.getArgN(2);
        switch (option) {
          case "all": {
            delete rawHistories[ctx.group.groupId];
            storageSet(ext, "histories", JSON.stringify(rawHistories));
            seal.replyToSender(ctx, msg, "群内记录的全部聊天内容清除了");
            return seal.ext.newCmdExecuteResult(true);
          }
          case "users": {
            rawHistories[ctx.group.groupId]["messages"] = rawHistories[ctx.group.groupId]["messages"].filter((message) => {
              return message.role !== "user"
            });
            storageSet(ext, "histories", JSON.stringify(rawHistories));
            seal.replyToSender(ctx, msg, "群内记录的用户聊天内容清除了");
            return seal.ext.newCmdExecuteResult(true);
          }
          case "assistant": {
            rawHistories[ctx.group.groupId]["messages"] = rawHistories[ctx.group.groupId]["messages"].filter((message) => {
              return message.role !== "assistant"
            });
            storageSet(ext, "histories", JSON.stringify(rawHistories));
            seal.replyToSender(ctx, msg, "群内记录的骰子聊天内容清除了");
            return seal.ext.newCmdExecuteResult(true);
          }
          default: {
            seal.replyToSender(ctx, msg, "可以使用 .interrupt clear all/users/assistant 清除储存的全部/用户/骰子历史记录");
            return seal.ext.newCmdExecuteResult(true);
          }
        }
      }
      case "show": {
        if (!(ctx.group.groupId in rawHistories)) {
          seal.replyToSender(ctx, msg, "暂无本群的聊天记录");
          return seal.ext.newCmdExecuteResult(true);
        }
        const numStr = cmdArgs.getArgN(2);
        if (!numStr.match(/^\d+$/)) {
          seal.replyToSender(ctx, msg, "请输入有效的数字");
          return seal.ext.newCmdExecuteResult(true);
        }
        const num = Number(numStr);
        if (num < 1 || num > rawHistories[ctx.group.groupId]["messages"].length) {
          seal.replyToSender(ctx, msg, "数字超过历史记录范围");
          return seal.ext.newCmdExecuteResult(true);
        }
        seal.replyToSender(ctx, msg, replaceMarker(
          rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num] === "user" ?
            seal.ext.getStringConfig(ext, "user_schema") :
            seal.ext.getStringConfig(ext, "assistant_schema"),
          rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num].nickname,
          rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num].id,
          rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num].content,
        ));
        return seal.ext.newCmdExecuteResult(true);
      }
      case "delete": {
        if (!(ctx.group.groupId in rawHistories)) {
          seal.replyToSender(ctx, msg, "暂无本群的聊天记录");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < privilege) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        const numStr = cmdArgs.getArgN(2);
        if (!numStr.match(/^\d+$/)) {
          seal.replyToSender(ctx, msg, "请输入有效的数字");
          return seal.ext.newCmdExecuteResult(true);
        }
        const num = Number(numStr);
        if (num < 1 || num > rawHistories[ctx.group.groupId]["messages"].length) {
          seal.replyToSender(ctx, msg, "数字超过历史记录范围");
          return seal.ext.newCmdExecuteResult(true);
        }
        rawHistories[ctx.group.groupId]["messages"].splice(rawHistories[ctx.group.groupId]["messages"].length - num, 1);
        storageSet(ext, "histories", JSON.stringify(rawHistories));
        seal.replyToSender(ctx, msg, `倒数第 ${num} 条聊天记录清除了`);
        return seal.ext.newCmdExecuteResult(true);
      }
      case "set": {
        if (!(ctx.group.groupId in configs)) {
          configs[ctx.group.groupId] = {
            possibility: null,
            historyLength: null,
            triggerLength: null,
            privilege: null,
          };
        }
        const config = configs[ctx.group.groupId];
        const property = cmdArgs.getArgN(2);
        const numStr = cmdArgs.getArgN(3);
        switch (property) {
          case "possibility": {
            if (ctx.privilegeLevel < privilege) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (!numStr.match(/^(0.\d+|[01])$/)) {
              seal.replyToSender(ctx, msg, "请输入 [0, 1] 范围内的有效的数字");
              return seal.ext.newCmdExecuteResult(true);
            }
            config.possibility = Number(numStr);
            break;
          }
          case "history_length": {
            if (ctx.privilegeLevel < privilege) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (!numStr.match(/^\d+$/)) {
              seal.replyToSender(ctx, msg, "请输入有效的数字");
              return seal.ext.newCmdExecuteResult(true);
            }
            config.historyLength = Number(numStr);
            break;
          }
          case "trigger_length": {
            if (ctx.privilegeLevel < privilege) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (!numStr.match(/^\d+$/)) {
              seal.replyToSender(ctx, msg, "请输入有效的数字");
              return seal.ext.newCmdExecuteResult(true);
            }
            config.triggerLength = Number(numStr);
            break;
          }
          case "privilege": {
            if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, "privilege")) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (!numStr.match(/^\d+$/)) {
              seal.replyToSender(ctx, msg, "请输入有效的数字");
              return seal.ext.newCmdExecuteResult(true);
            }
            config.privilege = Number(numStr);
            break;
          }
          default: {
            seal.replyToSender(ctx, msg, "请输入有效属性：possibility、history_length、trigger_length 或 privilege");
            return seal.ext.newCmdExecuteResult(true);
          }
        }
        storageSet(ext, "configs", JSON.stringify(configs));
        seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已修改为 ${numStr}`);
        return seal.ext.newCmdExecuteResult(true);
      }
      case "unset": {
        if (!(ctx.group.groupId in configs)) {
          seal.replyToSender(ctx, msg, `群聊内未设置特殊属性`);
          return seal.ext.newCmdExecuteResult(true);
        }
        const config = configs[ctx.group.groupId];
        const property = cmdArgs.getArgN(2);
        switch (property) {
          case "possibility": {
            if (ctx.privilegeLevel < privilege) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (config.possibility) {
              config.possibility = null;
              seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
            } else {
              seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
            }
            break;
          }
          case "history_length": {
            if (ctx.privilegeLevel < privilege) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (config.historyLength) {
              config.historyLength = null;
              seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
            } else {
              seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
            }
            break;
          }
          case "trigger_length": {
            if (ctx.privilegeLevel < privilege) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (config.triggerLength) {
              config.triggerLength = null;
              seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
            } else {
              seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
            }
            break;
          }
          case "privilege": {
            if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, "privilege")) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            if (config.privilege) {
              config.privilege = null;
              seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
            } else {
              seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
            }
            break;
          }
          case "all": {
            if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, "privilege")) {
              seal.replyToSender(ctx, msg, "权限不足");
              return seal.ext.newCmdExecuteResult(true);
            }
            delete configs[ctx.group.groupId];
            seal.replyToSender(ctx, msg, `群聊内全部属性已恢复默认`);
            break;
          }
          default: {
            seal.replyToSender(ctx, msg, "请输入有效属性：possibility、history_length、trigger_length 或 privilege");
            return seal.ext.newCmdExecuteResult(true);
          }
        }
        if (!(config.possibility || config.historyLength || config.triggerLength || config.privilege)) {
          delete configs[ctx.group.groupId];
        }
        storageSet(ext, "configs", JSON.stringify(configs));
        return seal.ext.newCmdExecuteResult(true);
      }
      default: {
        seal.replyToSender(ctx, msg, "可以使用 .interrupt on/off/status 来开启/关闭/查看 AI 插嘴功能，可以使用 .interrupt clear all/users/assistant 清除储存的全部/用户/骰子历史记录");
        return seal.ext.newCmdExecuteResult(true);
      }
    }
  }
  ext.cmdMap["interrupt"] = cmdInterrupt;
}

function main() {
  // 注册扩展
  let ext = seal.ext.find("ai-interrupt");
  if (!ext) {
    ext = seal.ext.new("ai-interrupt", "Mint Cider", "0.3.0");

    registerCommand(ext);
    seal.ext.register(ext);
    registerConfigs(ext);

    ext.onNotCommandReceived = async (ctx: seal.MsgContext, msg: seal.Message) => {
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
      const possibility = configs[ctx.group.groupId] && configs[ctx.group.groupId].possibility ?
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
          seal.ext.getBoolConfig(ext, "debug_resp")
        )
      }
      currentHistory.addMessageUser(userMessage, msg.sender.nickname, msg.sender.userId.slice(3), historyLength);
      rawHistories[ctx.group.groupId]["messages"] = currentHistory.messages;
      storageSet(ext, "histories", JSON.stringify(rawHistories));
      let at = false;
      if (msg.message.includes(`[CQ:at,qq=${seal.ext.getStringConfig(ext, "id")}]`)) {
        at = seal.ext.getBoolConfig(ext, "react_at");
      }
      // Check reply condition
      if (at || (
        currentHistory.getLength() >= triggerLength
        && Math.random() < possibility
      )) {
        if (seal.ext.getBoolConfig(ext, "debug_prompt")) {
          console.log(currentHistory.buildPromptString(
            replaceMarker(
              seal.ext.getStringConfig(ext, "system_schema"),
              seal.ext.getStringConfig(ext, "nickname"),
              seal.ext.getStringConfig(ext, "id"),
              ""
            ),
            seal.ext.getStringConfig(ext, "user_schema"),
            seal.ext.getStringConfig(ext, "assistant_schema")));
        }
        const resp = seal.ext.getBoolConfig(ext, "mock_resp") ?
          seal.ext.getStringConfig(ext, "mock_resp_text") :
          await requestAPI(
            currentHistory.buildPrompt(
              replaceMarker(
                seal.ext.getStringConfig(ext, "system_schema"),
                seal.ext.getStringConfig(ext, "nickname"),
                seal.ext.getStringConfig(ext, "id"),
                ""
              ),
              seal.ext.getStringConfig(ext, "user_schema"),
              seal.ext.getStringConfig(ext, "assistant_schema")
            ),
            seal.ext.getStringConfig(ext, "request_URL"), seal.ext.getStringConfig(ext, "key"),
            seal.ext.getStringConfig(ext, "model"), seal.ext.getIntConfig(ext, "max_tokens"),
            seal.ext.getFloatConfig(ext, "temperature"), seal.ext.getFloatConfig(ext, "top_p"),
            seal.ext.getBoolConfig(ext, "debug_resp")
          );
        const retrieveMatchExpr = new RegExp(replaceMarker(
          seal.ext.getStringConfig(ext, "retrieve_schema"),
          seal.ext.getStringConfig(ext, "nickname"),
          seal.ext.getStringConfig(ext, "id"),
          ""
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
  }
}

main();
