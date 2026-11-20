let API_URL;

switch (import.meta.env.VITE_API_MODE) {
  case "production":
    API_URL = import.meta.env.VITE_API_PROD_URL;
    break;

  case "development":
  default:
    API_URL = import.meta.env.VITE_API_DEV_URL;
    break;
}

export const ADMIN_NICKNAME = (import.meta.env.VITE_ADMIN_NICKNAME ?? "admin").toLowerCase();

export default API_URL;
