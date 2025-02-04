import {Option} from "./dispatcher";
import {ChatHistory, GroupConfig, GroupMemory} from "../model";
import {formatMemory, replaceMarker} from "../utils/format";
import {getData, setData} from "../utils/storage";

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
  } = getData<{
    [key: string]: boolean
  }>("switches");
  switches[ctx.group.groupId] = true;
  setData<{
    [key: string]: boolean
  }>(ext, "switches", switches);
  seal.replyToSender(ctx, msg, "群内 AI 插嘴功能开启了");
  return seal.ext.newCmdExecuteResult(true);
}

export function handleOff(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const switches: {
    [key: string]: boolean
  } = getData<{
    [key: string]: boolean
  }>("switches");
  switches[ctx.group.groupId] = false;
  setData<{
    [key: string]: boolean
  }>(ext, "switches", switches);
  seal.replyToSender(ctx, msg, "群内 AI 插嘴功能关闭了");
  return seal.ext.newCmdExecuteResult(true);
}

export function handleStatus(_ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  const switches: {
    [key: string]: boolean
  } = getData<{
    [key: string]: boolean
  }>("switches");
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
  const histories: {
    [key: string]: ChatHistory
  } = getData<{
    [key: string]: ChatHistory
  }>("histories");
  const memories: {
    [key: string]: GroupMemory
  } = getData<{
    [key: string]: GroupMemory
  }>("memories");
  const option = cmdArgs.getArgN(2);
  switch (option) {
    case "all": {
      delete histories[ctx.group.groupId];
      setData<{
        [key: string]: ChatHistory
      }>(ext, "histories", histories);
      seal.replyToSender(ctx, msg, "群内记录的全部聊天内容清除了");
      return seal.ext.newCmdExecuteResult(true);
    }
    case "users": {
      histories[ctx.group.groupId].messages = histories[ctx.group.groupId].messages.filter((message) => {
        return message.role !== "user"
      });
      setData<{
        [key: string]: ChatHistory
      }>(ext, "histories", histories);
      seal.replyToSender(ctx, msg, "群内记录的用户聊天内容清除了");
      return seal.ext.newCmdExecuteResult(true);
    }
    case "assistant": {
      histories[ctx.group.groupId].messages = histories[ctx.group.groupId].messages.filter((message) => {
        return message.role !== "assistant"
      });
      setData<{
        [key: string]: ChatHistory
      }>(ext, "histories", histories);
      seal.replyToSender(ctx, msg, "群内记录的骰子聊天内容清除了");
      return seal.ext.newCmdExecuteResult(true);
    }
    case "memory": {
      delete memories[ctx.group.groupId];
      setData<{
        [key: string]: GroupMemory
      }>(ext, "memories", memories);
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
  const histories: {
    [key: string]: ChatHistory
  } = getData<{
    [key: string]: ChatHistory
  }>("histories");
  const memories: {
    [key: string]: GroupMemory
  } = getData<{
    [key: string]: GroupMemory
  }>("memories");
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
    if (num < 1 || num > histories[ctx.group.groupId].getLength()) {
      seal.replyToSender(ctx, msg, "数字超过现有历史记录范围");
      return seal.ext.newCmdExecuteResult(true);
    }
    seal.replyToSender(ctx, msg, replaceMarker(
      histories[ctx.group.groupId].messages[histories[ctx.group.groupId].getLength() - num].role === "user" ?
        seal.ext.getStringConfig(ext, "user_schema") :
        seal.ext.getStringConfig(ext, "assistant_schema"),
      histories[ctx.group.groupId].messages[histories[ctx.group.groupId].getLength() - num].nickname,
      histories[ctx.group.groupId].messages[histories[ctx.group.groupId].getLength() - num].id,
      histories[ctx.group.groupId].messages[histories[ctx.group.groupId].getLength() - num].content,
      formatMemory(memories[ctx.group.groupId]),
    ));
    return seal.ext.newCmdExecuteResult(true);
  }
}

export function handleDelete(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Data checked
  // Privilege checked
  const histories: {
    [key: string]: ChatHistory
  } = getData<{
    [key: string]: ChatHistory
  }>("histories");
  const memories: {
    [key: string]: GroupMemory
  } = getData<{
    [key: string]: GroupMemory
  }>("memories");
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
    setData<{
      [key: string]: GroupMemory
    }>(ext, "memories", memories);
    seal.replyToSender(ctx, msg, `第 ${num} 条记忆清除了`);
    return seal.ext.newCmdExecuteResult(true);
  } else {
    const numStr = cmdArgs.getArgN(2);
    if (!numStr.match(/^\d+$/)) {
      seal.replyToSender(ctx, msg, "请输入有效的数字");
      return seal.ext.newCmdExecuteResult(true);
    }
    const num = Number(numStr);
    if (num < 1 || num > histories[ctx.group.groupId].getLength()) {
      seal.replyToSender(ctx, msg, "数字超过现有历史记录范围");
      return seal.ext.newCmdExecuteResult(true);
    }
    histories[ctx.group.groupId].messages.splice(histories[ctx.group.groupId].getLength() - num, 1);
    setData<{
      [key: string]: ChatHistory
    }>(ext, "histories", histories);
    seal.replyToSender(ctx, msg, `倒数第 ${num} 条聊天记录清除了`);
    return seal.ext.newCmdExecuteResult(true);
  }
}

export function handleSet(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const configs: {
    [key: string]: GroupConfig
  } = getData<{
    [key: string]: GroupConfig
  }>("configs");
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
  setData<{
    [key: string]: GroupConfig
  }>(ext, "configs", configs);
  seal.replyToSender(ctx, msg, `群聊内 ${property} 属性已修改为 ${numStr}`);
  return seal.ext.newCmdExecuteResult(true);
}

export function handleUnset(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  // Platform checked
  // Privilege checked
  const configs: {
    [key: string]: GroupConfig
  } = getData<{
    [key: string]: GroupConfig
  }>("configs");
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
  setData<{
    [key: string]: GroupConfig
  }>(ext, "configs", configs);
  return seal.ext.newCmdExecuteResult(true);
}
