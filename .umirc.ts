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
    hosts: ['story-https.metaso.com', 'localhost'],
    cert: './metaso.cn.crt',
    key: './metaso.cn.key',
  },
  proxy: {
    '/api': {
      target: 'https://story-https.metaso.com',
      changeOrigin: true,
      secure: false,
    }
  }
});
