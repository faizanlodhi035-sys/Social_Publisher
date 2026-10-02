import { createApp } from "./app.js";
import { envConfig, validateEnv } from "./config/env.js";

validateEnv();

const app = createApp();

app.listen(envConfig.PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Social Publisher Backend running on port ${envConfig.PORT}`);
  console.log(`🔗 API Base: ${envConfig.BACKEND_URL}/api`);
  console.log(`🌐 Allowed Frontend: ${envConfig.FRONTEND_URL}`);
  console.log(`🔥 Firestore & Firebase Admin: Enabled`);
  console.log(`==================================================`);
});
