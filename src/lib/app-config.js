import defaults from "../../app.config.json";

// Brand for this clone. Env wins when set; otherwise app.config.json.
// No Base44 app id, preview URL, or secret belongs here.
function fromEnv(key, fallback) {
  const value = import.meta.env[key];
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return fallback;
}

export const appConfig = {
  name: fromEnv("VITE_APP_NAME", defaults.name),
  shortName: fromEnv("VITE_APP_SHORT_NAME", defaults.shortName),
  tagline: fromEnv("VITE_APP_TAGLINE", defaults.tagline),
  supportEmail: fromEnv("VITE_APP_SUPPORT_EMAIL", defaults.supportEmail)
};
