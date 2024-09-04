import { ChatHistory } from './types';
import { requestAPI, storageGet, storageSet, registerConfigs } from './utils';
import ExtInfo = seal.ExtInfo;

function handleCommand(ext: ExtInfo, ctx: seal.MsgContext, msg: seal.Message): void {
  let histories: { [key: string]: ChatHistory} = ChatHistory.fromJSONToMap(storageGet(ext, 'histories'));
  let switches: { [key: string]: boolean } = JSON.parse(storageGet(ext, 'switches'));
  let command = msg.message.slice(11);
  switch (command) {
    case 'on':
      if (msg.platform !== 'QQ' || ctx.isPrivate) {
        seal.replyToSender(ctx, msg, '只能在 QQ 群聊中开启或关闭插嘴功能！');
        return;
      }
      if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, 'privilege')) {
        seal.replyToSender(ctx, msg, '权限不足');
        return;
      }
      switches[ctx.group.groupId] = true;
      storageSet(ext, 'switches', JSON.stringify(switches));
      seal.replyToSender(ctx, msg, '群内 AI 插嘴功能开启了');
      return;
    case 'off':
      if (msg.platform !== 'QQ' || ctx.isPrivate) {
        seal.replyToSender(ctx, msg, '只能在 QQ 群聊中开启或关闭插嘴功能！');
        return;
      }
      if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, 'privilege')) {
        seal.replyToSender(ctx, msg, '权限不足');
        return;
      }
      switches[ctx.group.groupId] = false;
      storageSet(ext, 'switches', JSON.stringify(switches));
      seal.replyToSender(ctx, msg, '群内 AI 插嘴功能关闭了');
      return;
    case 'status':
      if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
        seal.replyToSender(ctx, msg, '群内 AI 插嘴功能是关闭状态');
        return;
      }
      seal.replyToSender(ctx, msg, '群内 AI 插嘴功能是开启状态');
      return;
    case 'clear':
      if (!(ctx.group.groupId in histories)) {
        seal.replyToSender(ctx, msg, '暂无本群的聊天记录');
        return;
      }
      if (ctx.privilegeLevel < seal.ext.getIntConfig(ext, 'privilege')) {
        seal.replyToSender(ctx, msg, '权限不足');
        return;
      }
      delete histories[ctx.group.groupId];
      storageSet(ext, 'histories', JSON.stringify(histories));
      return;
    default:
      seal.replyToSender(ctx, msg, '可以使用 .interrupt on/off/status 来开启/关闭/查看 AI 插嘴功能，可以使用 .interrupt clear 清除储存的历史记录');
      return;
  }
}

function main() {
  // 注册扩展
  let ext = seal.ext.find('ai-interrupt');
  if (!ext) {
    ext = seal.ext.new('ai-interrupt', 'MintCider', '0.0.2');
    seal.ext.register(ext);
  }

  let reaction: boolean = false;

  registerConfigs(ext);

  // 编写指令
  ext.onMessageReceived = (ctx: seal.MsgContext, msg: seal.Message) => {
    if (msg.message.startsWith('.interrupt')) {
      handleCommand(ext, ctx, msg);
      reaction = true;
      return;
    }
    if (msg.platform !== 'QQ' || ctx.isPrivate || ctx.group.logOn) {
      return;
    }
    let switches: { [key: string]: boolean } = JSON.parse(storageGet(ext, 'switches'));
    if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
      return
    }
    let histories: { [key: string]: ChatHistory} = ChatHistory.fromJSONToMap(storageGet(ext, 'histories'));
    if (!(ctx.group.groupId in histories)) {
      histories[ctx.group.groupId] = new ChatHistory();
    }
    histories[ctx.group.groupId].addMessageUser(msg.sender.nickname + '：' + msg.message, seal.ext.getIntConfig(ext, 'history_length'));
    storageSet(ext, 'histories', JSON.stringify(histories));
    let at = false;
    if (msg.message.includes(`[CQ:at,qq=${seal.ext.getStringConfig(ext, 'id')}]`)) {
      at = seal.ext.getBoolConfig(ext, 'react_at');
    }
    if (at || (
      histories[ctx.group.groupId].getLength() >= seal.ext.getIntConfig(ext, 'trigger_length')
      && Math.random() < seal.ext.getFloatConfig(ext, 'possibility')
    )) {
      if (seal.ext.getBoolConfig(ext, 'debug_prompt')) {
        console.log(histories[ctx.group.groupId].buildPromptString(seal.ext.getStringConfig(ext, 'system_prompt')));
      }
      requestAPI(histories[ctx.group.groupId].buildPrompt(seal.ext.getStringConfig(ext, 'system_prompt')),
        seal.ext.getStringConfig(ext, 'request_URL'), seal.ext.getStringConfig(ext, 'key'),
        seal.ext.getStringConfig(ext, 'model'), seal.ext.getIntConfig(ext, 'max_tokens'),
        seal.ext.getFloatConfig(ext, 'temperature'), seal.ext.getFloatConfig(ext, 'top_p'),
        seal.ext.getFloatConfig(ext, 'presence_penalty'), seal.ext.getFloatConfig(ext, 'frequency_penalty'),
        seal.ext.getBoolConfig(ext, 'debug_resp'))
      .then((resp) => {
        if (!resp) {
          return;
        }
        if (resp === '无') {
          return;
        }
        seal.replyToSender(ctx, msg, resp);
      });
    }
  }
  ext.onMessageSend = (ctx: seal.MsgContext, msg: seal.Message, _flag: string) => {
    if (reaction) {
      reaction = false;
      return;
    }
    if (msg.platform !== 'QQ' || ctx.isPrivate || ctx.group.logOn) {
      return;
    }
    let switches: { [key: string]: boolean } = JSON.parse(storageGet(ext, 'switches'));
    if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
      return
    }
    let histories: { [key: string]: ChatHistory} = ChatHistory.fromJSONToMap(storageGet(ext, 'histories'));
    if (!(ctx.group.groupId)) {
      histories[ctx.group.groupId] = new ChatHistory();
    }
    histories[ctx.group.groupId].addMessageAssistant(msg.message, seal.ext.getIntConfig(ext, 'history_length'));
    storageSet(ext, 'histories', JSON.stringify(histories));
  }
}

main();
