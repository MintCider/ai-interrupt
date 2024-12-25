import {helpStr} from "../data";
import {genNullOption} from "./handler";

export type Option = {
  checkPrivilege: {
    privilegeType: "origin" | "group" | null
  }
  checkData: {
    dataType: "history" | "memory" | null
  }
}

const commandRegistry: {
  [key: string]: {
    handler: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => seal.CmdExecuteResult,
    middleware: ((ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, option: Option) => [boolean, string])[],
    genOption: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => Option,
  }
} = {};

export function setCommand(
  name: string,
  handler: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => seal.CmdExecuteResult,
  middleware: ((ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, option: Option) => [boolean, string])[] = [],
  genOption: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => Option = genNullOption
) {
  commandRegistry[name] = {handler, middleware, genOption};
}

export function getCommand(name: string) {
  return commandRegistry[name];
}


export function dispatcher(ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs): seal.CmdExecuteResult {
  const commandName = cmdArgs.getArgN(1);
  const commandEntry = getCommand(commandName);

  if (!commandEntry) {
    seal.replyToSender(ctx, msg, helpStr);
    return seal.ext.newCmdExecuteResult(true);
  }

  const {handler, middleware, genOption} = commandEntry;

  // Execute middleware in sequence
  for (let mw of middleware) {
    const [shouldContinue, errorMsg] = mw(ext, ctx, msg, genOption(ext, ctx, msg, cmdArgs));
    if (!shouldContinue) {
      seal.replyToSender(ctx, msg, errorMsg);
      return seal.ext.newCmdExecuteResult(true);
    }
  }

  return handler(ext, ctx, msg, cmdArgs);
}
