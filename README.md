# AI 插嘴插件

## 介绍

本插件工作于 [海豹骰点核心](https://github.com/sealdice/sealdice-core)，并基于其 [TS 模板库](https://github.com/sealdice/sealdice-js-ext-template) 实现。

本插件通过接入大模型 API 并随机在群聊中发言，创造更为生动的骰子使用体验。

## 使用

### 安装

在本项目 Release 页面中，直接下载最新编译的 JS 文件，或 [点击这里](https://github.com/MintCider/ai-interrupt/releases/latest/download/ai-interrupt.js) 下载。随后上传到海报核心即可。

### 命令

可以使用 .interrupt on/off/status 来开启/关闭/查看 AI 插嘴功能，可以使用 .interrupt clear 清除储存的历史记录。

### 配置

目前，本插件的配置项分为「基础设置」、「识图大模型设置」、「文本大模型设置」三个部分。

#### 基础设置

* **插嘴的概率**
  
  填入一个 0 - 1 的小数。例如，0.5 意味着收到一条消息后，骰子有 50% 的概率进行回应。

* **历史记录保存的最大长度**

  插件会存储群聊的最新聊天记录，以保证回复的内容契合上下文。存储的聊天记录越长，AI 对上下文的理解越好，但 token 消耗也越多。

* **允许触发插嘴的最小历史记录长度**

  当存储的历史记录长度小于这一配置时，不会触发插嘴，以免生成的内容过于无关。

* **开启关闭插件所需的权限等级**

  权限等级数字的含义请见 [海豹手册](https://mintcider.github.io/sealdice-manual-next/advanced/js_example.html#%E6%9D%83%E9%99%90%E8%AF%86%E5%88%AB)。只有高于或等于此权限等级的用户才可以正常触发 on/off/clear 命令。

* **被 @ 时是否必定回复（无论历史记录长短）**

  开启此功能后，当骰子被提及（包括被回复），骰子必定会回复，无论存储的聊天记录长度如何。此功能需要下一配置 **骰子 QQ 号** 正确填写才能生效。

* **骰子 QQ 号**

  如题。

* **打印 prompt 日志**

  开启此功能后，会在调用 API 前，将完整的 prompt 信息输出到日志中。开启后可以排查生成的 prompt 是否符合预期。

* **打印 API Response 日志**

  开启此功能后，会在调用 API 后，将完整的 response 信息输出到日志中。开启后可以排查 API 是否正确返回符合格式的信息。

#### 识图大模型设置

#### 文本大模型设置
