const commandRegistry: {
  [key: string]: {
    handler: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => seal.CmdExecuteResult,
    middleware: ((ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, option: any) => [boolean, string])[],
    genOption: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => any,
  }
} = {};

export function setCommand(
  name: string,
  handler: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => seal.CmdExecuteResult,
  middleware: ((ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, option: any) => [boolean, string])[] = [],
  genOption: (ext: seal.ExtInfo, ctx: seal.MsgContext, msg: seal.Message, cmdArgs: seal.CmdArgs) => any = () => {
    return null
  }) {
  commandRegistry[name] = {handler, middleware, genOption};
}

export function getCommand(name: string) {
  return commandRegistry[name];
}
