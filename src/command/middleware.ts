import {Option} from "./dispatcher";
import {ChatHistory, GroupConfig, GroupMemory} from "../model";

import {getData} from "../utils/storage";

export function checkPlatform(_ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _option: Option): [boolean, string] {
  if (msg.platform !== "QQ" || ctx.isPrivate) {
    return [false, "只能在 QQ 群聊中开启或关闭插嘴功能！"];
  }
  return [true, ""];
}

export function checkPrivilege(ext: seal.ExtInfo, ctx: seal.MsgContext, _msg: seal.Message, option: Option): [boolean, string] {
  const configs: {
    [key: string]: GroupConfig
  } = getData<{
    [key: string]: GroupConfig
  }>("configs");
  const privilegeType = option.checkPrivilege.privilegeType;
  let privilege: number;
  if (privilegeType === "origin") {
    privilege = seal.ext.getIntConfig(ext, "privilege");
  } else if (privilegeType === "group") {
    privilege = configs[ctx.group.groupId] && configs[ctx.group.groupId].privilege ?
      configs[ctx.group.groupId].privilege : seal.ext.getIntConfig(ext, "privilege");
  } else {
    return [false, "插件内部错误：checkPrivilege：未知的权限类型：" + privilegeType];
  }
  if (ctx.privilegeLevel < privilege) {
    return [false, "权限不足"];
  }
  return [true, ""];
}

export function checkData(_ext: seal.ExtInfo, ctx: seal.MsgContext, _msg: seal.Message, option: Option): [boolean, string] {
  const dataType = option.checkData.dataType;
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
  let historyExists = false;
  let memoryExists = false;
  if (ctx.group.groupId in histories && histories[ctx.group.groupId].messages.length > 0) {
    historyExists = true;
  }
  if (ctx.group.groupId in memories && memories[ctx.group.groupId].length > 0) {
    memoryExists = true;
  }
  switch (dataType) {
    case "history": {
      if (!historyExists) {
        return [false, "暂无本群的聊天记录"];
      }
      return [true, ""];
    }
    case "memory": {
      if (!memoryExists) {
        return [false, "本群中暂无记忆"];
      }
      return [true, ""];
    }
    default: {
      return [false, "插件内部错误：checkData：未知的数据类型：" + dataType];
    }
  }
}
