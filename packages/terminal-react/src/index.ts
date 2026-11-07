export { Terminal, type TerminalProps } from './terminal/Terminal.tsx';
export type { TerminalSize, TerminalTransport } from './transport/terminal-transport.ts';
export {
  createWebSocketTransport,
  type ResizeMessage,
  type WebSocketTransport,
  type WebSocketTransportOptions,
} from './transport/websocket-transport.ts';
export type { ITheme } from '@xterm/xterm';
