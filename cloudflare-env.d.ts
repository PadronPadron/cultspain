declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
declare namespace Cloudflare { interface Env { ADMIN_USER_ID?: string; } }

declare namespace Cloudflare { interface Env { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string; ADMIN_EMAIL?: string; } }
declare namespace Cloudflare { interface Env { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string; } }

declare namespace Cloudflare { interface Env { WHATSAPP_API_URL?:string; WHATSAPP_INSTANCE_ID?:string; WHATSAPP_API_TOKEN?:string; } }
