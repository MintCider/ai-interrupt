export const helpStr =
  "AI 插嘴插件的使用说明：\n\n" +
  ".interrupt on/off/status 开启/关闭/查看 AI 插嘴功能\n\n" +
  ".interrupt clear all/users/assistant 清除储存的历史记录\n\n" +
  ".interrupt show <num> 查看储存的特定消息。<num> 应为一个正整数\n" +
  ".interrupt delete <num> 删除储存的特定消息。<num> 应为一个正整数\n\n" +
  ".interrupt set <property> <num> 在群内设定不同于默认配置的属性。<property> 可以为：\n" +
  "- possibility\n" +
  "- history_length\n" +
  "- trigger_length\n" +
  "- privilege\n" +
  ".interrupt unset <property> 将群内属性恢复默认配置。\n" +
  ".interrupt unset all 将群内全部属性都将恢复默认。";

export const memoryStore = new Map<string, any>();
