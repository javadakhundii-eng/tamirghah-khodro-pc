const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 380,
    title: "حساب‌داری تعمیرگاه",
    icon: path.join(__dirname, "www", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null); // حذف نوار منوی پیش‌فرض ویندوز برای ظاهر تمیزتر
  win.loadFile(path.join(__dirname, "www", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
