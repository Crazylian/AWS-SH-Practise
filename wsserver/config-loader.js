const {
    AppConfigDataClient,
    StartConfigurationSessionCommand,
    GetLatestConfigurationCommand,
} = require("@aws-sdk/client-appconfigdata");

const client = new AppConfigDataClient({ region: "us-east-1" }); // 改成你的 region

const APP_ID = process.env.APPCONFIG_APP_ID;
const ENV_ID = process.env.APPCONFIG_ENV_ID;
const CONFIG_PROFILE_ID = process.env.APPCONFIG_PROFILE_ID;

async function loadConfig() {
    try {
        const sessionCmd = new StartConfigurationSessionCommand({
            ApplicationIdentifier: APP_ID,
            EnvironmentIdentifier: ENV_ID,
            ConfigurationProfileIdentifier: CONFIG_PROFILE_ID,
        });

        const session = await client.send(sessionCmd);

        const getCmd = new GetLatestConfigurationCommand({
            ConfigurationToken: session.InitialConfigurationToken,
        });

        const response = await client.send(getCmd);
        const configData = new TextDecoder().decode(response.Configuration);

        return JSON.parse(configData || "{}");
    } catch (err) {
        console.error("Failed to load config:", err);
        return {};
    }
}

module.exports = { loadConfig };
