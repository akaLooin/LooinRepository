// Adds the Firebase file Android needs for push notifications (google-services.json), only when it is there:
// on the PC next to this file, or in the EAS build as the file variable GOOGLE_SERVICES_JSON.
// The file is never committed (public repository; see .gitignore and replica/backend.md 13).
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const local = path.join(__dirname, "google-services.json");
  const file = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(local) ? "./google-services.json" : undefined);
  return file ? { ...config, android: { ...config.android, googleServicesFile: file } } : config;
};
