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
    hosts: ['story-https.vsochina.com', 'localhost'],
    cert: './vsochina.com.crt',
    key: './vsochina.com.key',
  },
  proxy: {
    '/api': {
      target: 'https://story-https.vsochina.com',
      changeOrigin: true,
      secure: false,
    }
  }
});
