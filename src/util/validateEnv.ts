export const validateEnv = () => {
    let isValidate: boolean = true;
    if(!process.env.CLIENT_TOKEN) {
        console.warn("Missing client token (required). (CLIENT_TOKEN)");
        isValidate = false;
    }
    if(!process.env.CLIENT_ID) {
        console.warn("Missing client id (required). (CLIENT_ID)");
        isValidate = false;
    }
    if(!process.env.DATABASE_HOST) {
        console.warn("Missing database host (required). (DATABASE_HOST)");
        isValidate = false;
    }
    if(!process.env.DATABASE_USER) {
        console.warn("Missing database username (required). (DATABASE_USER)");
        isValidate = false;
    }
    if(!process.env.DATABASE_PASSWORD) {
        console.warn("Missing database password. (DATABASE_PASSWORD)");
        isValidate = true;
    }
    if(!process.env.DATABASE_NAME) {
        console.warn("Missing database name (required). (DATABASE_NAME)");
        isValidate = false;
    }
    return isValidate;
}