import { defineConfig } from "umi";

export default defineConfig({
  routes: [
    { path: "/", component: "index" },
    { path: "/editor", component: "editor" },
    { path: "/audioDraw", component: "audiodraw" },
    { path: "/videoAudio", component: "videoAudio" },
    { path: "/videoAudioDraw", component: "videoAudioDraw" },
  ],
  npmClient: 'yarn',
  https: {
    hosts: ['story-https.metaso.cn', 'localhost'],
    cert: './localhost.crt',
    key: './localhost.key',
    http2: false, // 🔥 关键：禁用 spdy，使用原生 https
  },
  proxy: {
    '/api': {
      target: 'https://story-https.metaso.cn',
      changeOrigin: true,
      secure: false,
    }
  }
});
