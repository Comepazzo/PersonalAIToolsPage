export interface AIService {
  id: string;
  name: string;
  url: string;
  inputSelector: string;
  submitSelector?: string;
  newChatSelector?: string;
  stopSelector?: string;
  isDomestic?: boolean;
}

export const AI_SERVICES: AIService[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    inputSelector: '#prompt-textarea, div[contenteditable="true"]',
    submitSelector: '[data-testid="send-button"]',
    newChatSelector: 'a[href="/"], [data-testid="create-new-chat-button"]',
    stopSelector: 'button[aria-label="Stop generating"], button[data-testid="stop-button"]',
    isDomestic: false
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    inputSelector: '.ProseMirror, div[contenteditable="true"]',
    submitSelector: 'button[aria-label*="Send"], button[data-testid="send-button"], div[role="button"][aria-label*="Send"], div[class*="send-button"]',
    newChatSelector: 'a[href="/new"], button[aria-label="Start new chat"]',
    stopSelector: 'button[aria-label="Stop response"]',
    isDomestic: false
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    inputSelector: 'rich-textarea div[contenteditable="true"], div[role="textbox"], div[contenteditable="true"]',
    submitSelector: 'button[aria-label*="Send"], div[role="button"][aria-label*="Send"]',
    newChatSelector: 'div[role="button"][aria-label="New chat"], span[class*="new-chat"]',
    stopSelector: 'button[aria-label="Stop response"], div[role="button"][aria-label="Stop response"]',
    isDomestic: false
  },
  {
    id: 'tongyi',
    name: 'Tongyi Qianwen',
    url: 'https://tongyi.aliyun.com/qianwen',
    inputSelector: 'textarea, #chat-input, div[contenteditable="true"]',
    submitSelector: 'div[class*="sendBtn"], button[class*="ant-btn-primary"], div[class*="operateBtn"], div[class*="send-btn"]',
    newChatSelector: 'div[class*="new-chat"], div[class*="add-btn"]',
    isDomestic: true
  },
  {
    id: 'doubao',
    name: 'Doubao',
    url: 'https://www.doubao.com',
    inputSelector: 'textarea, div[contenteditable="true"]',
    submitSelector: 'button[data-testid="chat_input_send_button"], button[data-testid="send_button"], div[role="button"][aria-label="发送"]',
    newChatSelector: 'div[class*="new-chat"], button[class*="new-chat"]',
    isDomestic: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    inputSelector: 'textarea, #chat-input',
    submitSelector: 'div[role="button"][aria-label="发送"], div[role="button"][aria-label="Send"], div[class*="ds-send-button"], div[class*="send-button"]',
    newChatSelector: 'div[class*="new-chat"], div[role="button"][aria-label="New Chat"]',
    stopSelector: 'div[role="button"][aria-label="停止生成"], div[role="button"][aria-label="Stop generating"]',
    isDomestic: true
  },
  // {
  //   id: 'wenxin',
  //   name: 'Wenxin Yiyan',
  //   url: 'https://yiyan.baidu.com',
  //   inputSelector: 'textarea, #dialogue-input, div[contenteditable="true"]',
  //   submitSelector: 'div[class*="send-btn"], button[class*="send"], div[role="button"][aria-label="发送"], span[class*="send-btn"], div[class*="submit-btn"], div[class*="send"]',
  //   newChatSelector: 'div[class*="new-chat"], span[class*="new-chat"]',
  //   isDomestic: true
  // }
];