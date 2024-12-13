import {Option} from "./dispatcher";
import {GroupConfig} from "../model";
import {storageGet} from "../util";

export function checkPlatform(_ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, _option: Option): [boolean, string] {
  if (msg.platform !== "QQ" || ctx.isPrivate) {
    return [false, "只能在 QQ 群聊中开启或关闭插嘴功能！"];
  }
  return [true, ""];
}

export function checkPrivilege(ext: seal.ExtInfo, ctx: seal.MsgContext, _msg: seal.Message, option: Option): [boolean, string] {
  const configs: {
    [key: string]: GroupConfig
  } = JSON.parse(storageGet(ext, "configs"));
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

export function checkHistory(ext: seal.ExtInfo, ctx: seal.MsgContext, _msg: seal.Message, _option: object | null): [boolean, string] {
  const rawHistories: {
    [key: string]: { [key: string]: any[] }
  } = JSON.parse(storageGet(ext, "histories"));
  if (!(ctx.group.groupId in rawHistories)) {
    return [false, "暂无本群的聊天记录"];
  }
  return [true, ""];
}
