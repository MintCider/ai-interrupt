import {ChatHistory} from "./types";
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
  seal.ext.registerIntConfig(ext, "privilege", 0, "开启关闭插件所需的权限等级");
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
  seal.ext.registerStringConfig(ext, "system_prompt", "你是一个桌游机器人", "文本大模型的系统提示");
  seal.ext.registerStringConfig(ext, "user_schema", "<nickname>（<id>）：<message>", "用户消息 prompt 格式");
  seal.ext.registerStringConfig(ext, "assistant_schema", "<nickname>（<id>）：<message>", "骰子消息 prompt 格式");
  seal.ext.registerStringConfig(ext, "retrieve_schema", "<nickname>（<id>）：(.*)", "从大模型回复提取骰子消息的正则表达式（**注意区分全角半角**）");
  seal.ext.registerStringConfig(ext, "request_URL", "", "文本大模型的 API URL");
  seal.ext.registerStringConfig(ext, "key", "", "文本大模型的 API Key");
  seal.ext.registerStringConfig(ext, "model", "", "文本大模型的型号");
  seal.ext.registerIntConfig(ext, "max_tokens", 200, "文本大模型最大生成长度");
  seal.ext.registerFloatConfig(ext, "temperature", -1);
  seal.ext.registerFloatConfig(ext, "top_p", -1);
}

function registerCommand(ext: seal.ExtInfo): void {
  const cmdInterrupt = seal.ext.newCmdItemInfo();
  cmdInterrupt.name = "interrupt";
  cmdInterrupt.help = "可以使用 .interrupt on/off/status 来开启/关闭/查看 AI 插嘴功能，可以使用 .interrupt clear 清除储存的历史记录";
  cmdInterrupt.solve = (ctx, msg, cmdArgs) => {
    const val = cmdArgs.getArgN(1);
    const switches: {
      [key: string]: boolean
    } = JSON.parse(storageGet(ext, "switches"));
    switch (val) {
      case "on":
        if (msg.platform !== "QQ" || ctx.isPrivate) {
          seal.replyToSender(ctx, msg, "只能在 QQ 群聊中开启或关闭插嘴功能！");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, "privilege")) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        switches[ctx.group.groupId] = true;
        storageSet(ext, "switches", JSON.stringify(switches));
        seal.replyToSender(ctx, msg, "群内 AI 插嘴功能开启了");
        return seal.ext.newCmdExecuteResult(true);
      case "off":
        if (msg.platform !== "QQ" || ctx.isPrivate) {
          seal.replyToSender(ctx, msg, "只能在 QQ 群聊中开启或关闭插嘴功能！");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, "privilege")) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        switches[ctx.group.groupId] = false;
        storageSet(ext, "switches", JSON.stringify(switches));
        seal.replyToSender(ctx, msg, "群内 AI 插嘴功能关闭了");
        return seal.ext.newCmdExecuteResult(true);
      case "status":
        if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
          seal.replyToSender(ctx, msg, "群内 AI 插嘴功能是关闭状态");
          return seal.ext.newCmdExecuteResult(true);
        }
        seal.replyToSender(ctx, msg, "群内 AI 插嘴功能是开启状态");
        return seal.ext.newCmdExecuteResult(true);
      case "clear":
        const rawHistories: {
          [key: string]: { [key: string]: any[] }
        } = JSON.parse(storageGet(ext, "histories"));
        if (!(ctx.group.groupId in rawHistories)) {
          seal.replyToSender(ctx, msg, "暂无本群的聊天记录");
          return seal.ext.newCmdExecuteResult(true);
        }
        if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, "privilege")) {
          seal.replyToSender(ctx, msg, "权限不足");
          return seal.ext.newCmdExecuteResult(true);
        }
        delete rawHistories[ctx.group.groupId];
        storageSet(ext, "histories", JSON.stringify(rawHistories));
        seal.replyToSender(ctx, msg, "群内记录的聊天内容清除了");
        return seal.ext.newCmdExecuteResult(true);
      default:
        seal.replyToSender(ctx, msg, "可以使用 .interrupt on/off/status 来开启/关闭/查看 AI 插嘴功能，可以使用 .interrupt clear 清除储存的历史记录");
        return seal.ext.newCmdExecuteResult(true);
    }
  }
  ext.cmdMap["interrupt"] = cmdInterrupt;
}

function main() {
  // 注册扩展
  let ext = seal.ext.find("ai-interrupt");
  if (!ext) {
    ext = seal.ext.new("ai-interrupt", "MintCider", "0.0.2");

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
          seal.replyToSender(ctx, msg, "AI 插嘴：数据有误，请考虑回退插件版本，或使用 .interrupt clear 清空保存的聊天记录。本插件已自动关闭，可使用 .interrupt on 开启。");
          return
        }
        currentHistory.messages = rawHistories[ctx.group.groupId]["messages"];
      } else {
        rawHistories[ctx.group.groupId] = {};
      }

      // Check configs' validity
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
      if (userMessage.includes("[CQ:image,file=") && seal.ext.getBoolConfig(ext, "parse_image")) {
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
      currentHistory.addMessageUser(userMessage, msg.sender.nickname, msg.sender.userId.slice(3), seal.ext.getIntConfig(ext, "history_length"));
      rawHistories[ctx.group.groupId]["messages"] = currentHistory.messages;
      storageSet(ext, "histories", JSON.stringify(rawHistories));
      let at = false;
      if (msg.message.includes(`[CQ:at,qq=${seal.ext.getStringConfig(ext, "id")}]`)) {
        at = seal.ext.getBoolConfig(ext, "react_at");
      }
      if (at || (
        currentHistory.getLength() >= seal.ext.getIntConfig(ext, "trigger_length")
        && Math.random() < seal.ext.getFloatConfig(ext, "possibility")
      )) {
        if (seal.ext.getBoolConfig(ext, "debug_prompt")) {
          console.log(currentHistory.buildPromptString(
            seal.ext.getStringConfig(ext, "system_prompt"),
            seal.ext.getStringConfig(ext, "user_schema"),
            seal.ext.getStringConfig(ext, "assistant_schema")));
        }
        const resp = await requestAPI(
          currentHistory.buildPrompt(
            seal.ext.getStringConfig(ext, "system_prompt"),
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
        ));
        const retrieveMatchResult = retrieveMatchExpr.exec(resp);
        const assistantMessage = retrieveMatchResult && retrieveMatchResult[1] ? retrieveMatchResult[1] : "";
        if (!assistantMessage) {
          return;
        }
        currentHistory.addMessageAssistant(
          assistantMessage,
          seal.ext.getStringConfig(ext, "nickname"),
          seal.ext.getStringConfig(ext, "id"),
          seal.ext.getIntConfig(ext, "history_length")
        );
        rawHistories[ctx.group.groupId]["messages"] = currentHistory.messages;
        storageSet(ext, "histories", JSON.stringify(rawHistories));
        seal.replyToSender(ctx, msg, `${seal.ext.getBoolConfig(ext, 'reply') ? `[CQ:reply,id=${userMessageID}]` : ""}${assistantMessage}`);
      }
    }
  }
}

main();
