const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  fetch: async (url, options) => {
    const res = await fetch(url, options);
    return res.json(); // always return JSON
  },
});
