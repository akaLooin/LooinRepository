// Adds the Firebase file Android needs for push notifications (google-services.json), only when it is there:
// on the PC next to this file, or in the EAS build as the file variable GOOGLE_SERVICES_JSON.
// The file is never committed (public repository; see .gitignore and replica/backend.md 13).
//
// APP_VARIANT=design builds the design trial: a second app beside the usual one (own package name, own name and
// link scheme) that draws the new design (2026-11-18: four-point stars instead of clovers). Same account and data.
// It has no Firebase file (Firebase knows only the usual package), so server push messages do not reach it;
// the phone's own alarms (to-do times, 일정, reminders) work as usual.
//
// APP_VARIANT=admin builds the admin app (2026-11-21, user: the admin panel as an Android app): a third app with its
// own package that shows only the admin screens (app switches, notices, push to every phone). Same account.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const design = process.env.APP_VARIANT === "design";
  const admin = process.env.APP_VARIANT === "admin";
  const local = path.join(__dirname, "google-services.json");
  const file = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(local) ? "./google-services.json" : undefined);
  const android = { ...config.android, ...(file && !design && !admin ? { googleServicesFile: file } : {}) };
  if (admin) return {
    ...config,
    name: "todomate 관리자",
    scheme: "todomateclone-admin",
    android: { ...android, package: "com.looin.todomateclone.admin" },
    extra: { ...config.extra, variant: "admin" },
  };
  if (!design) return { ...config, android, extra: { ...config.extra, variant: "main" } };
  return {
    ...config,
    name: "todomate 디자인",
    scheme: "todomateclone-design",
    android: { ...android, package: "com.looin.todomateclone.design" },
    extra: { ...config.extra, variant: "design" },
  };
};
