import {getCommand} from "./command_registry";
import {helpStr} from "../data";

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
