import {Option} from "./dispatcher";
import {formatMemory, replaceMarker, storageGet, storageSet} from "../util";
import {GroupConfig, GroupMemory} from "../model";

export function genNullOption(_ext: seal.ExtInfo, _ctx: seal.MsgContext, _msg: seal.Message, _cmdArgs: seal.CmdArgs): Option {
  return {
    checkPrivilege: {
      privilegeType: null
    },
    checkData: {
      dataType: null
    }
  }
}

export function genDefaultOption(_ext: seal.ExtInfo, _ctx: seal.MsgContext, _msg: seal.Message, _cmdArgs: seal.CmdArgs): Option {
  return {
    checkPrivilege: {
      privilegeType: "group"
    },
    checkData: {
      dataType: "history"
    }
  }
}

export function genClearShowDeleteOption(_ext: seal.ExtInfo, _ctx: seal.MsgContext, _msg: seal.Message, cmdArgs: seal.CmdArgs): Option {
  if (cmdArgs.getArgN(2) === "memory") {
    return {
      checkPrivilege: {
        privilegeType: "group"
      },
      checkData: {
        dataType: "memory"
      }
    }
  } else {
    return {
      checkPrivilege: {
        privilegeType: "group"
      },
      checkData: {
        dataType: "history"
      }
    }
  }
}

export function genSetUnsetOption(_ext: seal.ExtInfo, _ctx: seal.MsgContext, _msg: seal.Message, cmdArgs: seal.CmdArgs): Option {
  if (cmdArgs.getArgN(2) === "privilege" || cmdArgs.getArgN(2) === "all") {
    return {
      checkPrivilege: {
        privilegeType: "origin"
      },
      checkData: {
        dataType: null
      }
    }
  } else {
    return {
      checkPrivilege: {
        privilegeType: "group"
      },
      checkData: {
        dataType: null
      }
    }
  }
}

export function handleOn(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const switches: {
    [key: string]: boolean
  } = JSON.parse(storageGet(ext, "switches"));
  switches[ctx.group.groupId] = true;
  storageSet(ext, "switches", JSON.stringify(switches));
  seal.replyToSender(ctx, msg, "群内 AI 插嘴功能开启了");
  return seal.ext.newCmdExecuteResult(true);
}

export function handleOff(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const switches: {
    [key: string]: boolean
  } = JSON.parse(storageGet(ext, "switches"));
  switches[ctx.group.groupId] = false;
  storageSet(ext, "switches", JSON.stringify(switches));
  seal.replyToSender(ctx, msg, "群内 AI 插嘴功能关闭了");
  return seal.ext.newCmdExecuteResult(true);
}

export function handleStatus(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  const switches: {
    [key: string]: boolean
  } = JSON.parse(storageGet(ext, "switches"));
  if (!(ctx.group.groupId in switches) || switches[ctx.group.groupId] === false) {
    seal.replyToSender(ctx, msg, "群内 AI 插嘴功能是关闭状态");
    return seal.ext.newCmdExecuteResult(true);
  }
  seal.replyToSender(ctx, msg, "群内 AI 插嘴功能是开启状态");
  return seal.ext.newCmdExecuteResult(true);
}

export function handleClear(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Data checked
  // Privilege checked
  const rawHistories: {
    [key: string]: { [key: string]: any[] }
  } = JSON.parse(storageGet(ext, "histories"));
  const memories: {
    [key: string]: GroupMemory
  } = JSON.parse(storageGet(ext, "memories"));
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
    case "memory": {
      delete memories[ctx.group.groupId];
      storageSet(ext, "memories", JSON.stringify(memories));
      seal.replyToSender(ctx, msg, "群内全部记忆清除了");
      return seal.ext.newCmdExecuteResult(true);
    }
    default: {
      seal.replyToSender(ctx, msg, "可以使用 .interrupt clear all/users/assistant 清除储存的全部/用户/骰子历史记录\n" +
        "可以使用 .interrupt clear memory 清除储存的全部记忆");
      return seal.ext.newCmdExecuteResult(true);
    }
  }
}

export function handleShow(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Data checked
  const rawHistories: {
    [key: string]: { [key: string]: any[] }
  } = JSON.parse(storageGet(ext, "histories"));
  const memories: {
    [key: string]: GroupMemory
  } = JSON.parse(storageGet(ext, "memories"));
  // During .interrupt show <num>, it's possible that this function is called
  // before the existence of memory is checked.
  if (!(ctx.group.groupId in memories)) {
    memories[ctx.group.groupId] = [];
  }
  if (cmdArgs.getArgN(2) === "memory") {
    seal.replyToSender(ctx, msg, formatMemory(memories[ctx.group.groupId]));
    return seal.ext.newCmdExecuteResult(true);
  } else {
    const numStr = cmdArgs.getArgN(2);
    if (!numStr.match(/^\d+$/)) {
      seal.replyToSender(ctx, msg, "请输入有效的数字");
      return seal.ext.newCmdExecuteResult(true);
    }
    const num = Number(numStr);
    if (num < 1 || num > rawHistories[ctx.group.groupId]["messages"].length) {
      seal.replyToSender(ctx, msg, "数字超过现有历史记录范围");
      return seal.ext.newCmdExecuteResult(true);
    }
    seal.replyToSender(ctx, msg, replaceMarker(
      rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num] === "user" ?
        seal.ext.getStringConfig(ext, "user_schema") :
        seal.ext.getStringConfig(ext, "assistant_schema"),
      rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num].nickname,
      rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num].id,
      rawHistories[ctx.group.groupId]["messages"][rawHistories[ctx.group.groupId]["messages"].length - num].content,
      formatMemory(memories[ctx.group.groupId]),
    ));
    return seal.ext.newCmdExecuteResult(true);
  }
}

export function handleDelete(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Data checked
  // Privilege checked
  const rawHistories: {
    [key: string]: { [key: string]: any[] }
  } = JSON.parse(storageGet(ext, "histories"));
  const memories: {
    [key: string]: GroupMemory
  } = JSON.parse(storageGet(ext, "memories"));
  if (cmdArgs.getArgN(2) === "memory") {
    const numStr = cmdArgs.getArgN(3);
    if (!numStr.match(/^\d+$/)) {
      seal.replyToSender(ctx, msg, "请输入有效的数字");
      return seal.ext.newCmdExecuteResult(true);
    }
    const num = Number(numStr);
    if (num < 1 || num > memories[ctx.group.groupId].length) {
      seal.replyToSender(ctx, msg, "数字超过现有记忆范围");
      return seal.ext.newCmdExecuteResult(true);
    }
    memories[ctx.group.groupId].splice(num - 1, 1);
    storageSet(ext, "memories", JSON.stringify(memories));
    seal.replyToSender(ctx, msg, `第 ${num} 条记忆清除了`);
    return seal.ext.newCmdExecuteResult(true);
  } else {
    const numStr = cmdArgs.getArgN(2);
    if (!numStr.match(/^\d+$/)) {
      seal.replyToSender(ctx, msg, "请输入有效的数字");
      return seal.ext.newCmdExecuteResult(true);
    }
    const num = Number(numStr);
    if (num < 1 || num > rawHistories[ctx.group.groupId]["messages"].length) {
      seal.replyToSender(ctx, msg, "数字超过现有历史记录范围");
      return seal.ext.newCmdExecuteResult(true);
    }
    rawHistories[ctx.group.groupId]["messages"].splice(rawHistories[ctx.group.groupId]["messages"].length - num, 1);
    storageSet(ext, "histories", JSON.stringify(rawHistories));
    seal.replyToSender(ctx, msg, `倒数第 ${num} 条聊天记录清除了`);
    return seal.ext.newCmdExecuteResult(true);
  }
}

export function handleSet(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const configs: {
    [key: string]: GroupConfig
  } = JSON.parse(storageGet(ext, "configs"));
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
      if (!numStr.match(/^(0.\d+|[01])$/)) {
        seal.replyToSender(ctx, msg, "请输入 [0, 1] 范围内的有效的数字");
        return seal.ext.newCmdExecuteResult(true);
      }
      config.possibility = Number(numStr);
      break;
    }
    case "history_length": {
      if (!numStr.match(/^\d+$/)) {
        seal.replyToSender(ctx, msg, "请输入有效的数字");
        return seal.ext.newCmdExecuteResult(true);
      }
      config.historyLength = Number(numStr);
      break;
    }
    case "trigger_length": {
      if (!numStr.match(/^\d+$/)) {
        seal.replyToSender(ctx, msg, "请输入有效的数字");
        return seal.ext.newCmdExecuteResult(true);
      }
      config.triggerLength = Number(numStr);
      break;
    }
    case "privilege": {
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

export function handleUnset(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const configs: {
    [key: string]: GroupConfig
  } = JSON.parse(storageGet(ext, "configs"));
  if (!(ctx.group.groupId in configs)) {
    seal.replyToSender(ctx, msg, `群聊内未设置特殊属性`);
    return seal.ext.newCmdExecuteResult(true);
  }
  const config = configs[ctx.group.groupId];
  const property = cmdArgs.getArgN(2);
  switch (property) {
    case "possibility": {
      if (config.possibility) {
        config.possibility = null;
        seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
      } else {
        seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
      }
      break;
    }
    case "history_length": {
      if (config.historyLength) {
        config.historyLength = null;
        seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
      } else {
        seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
      }
      break;
    }
    case "trigger_length": {
      if (config.triggerLength) {
        config.triggerLength = null;
        seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
      } else {
        seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
      }
      break;
    }
    case "privilege": {
      if (config.privilege) {
        config.privilege = null;
        seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已恢复默认`);
      } else {
        seal.replyToSender(ctx, msg, `群聊内未设置 ${property} 属性`);
      }
      break;
    }
    case "all": {
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
