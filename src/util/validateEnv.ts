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
    if (!process.env.MARIADB_USER) {
      console.warn("Missing database username (required). (MARIADB_USER)");
      isValidate = false;
    }
    if (!process.env.MARIADB_ROOT_PASSWORD) {
      console.warn("Missing database password. (MARIADB_ROOT_PASSWORD)");
      isValidate = true;
    }
    if (!process.env.MARIADB_DATABASE) {
      console.warn("Missing database name (required). (MARIADB_DATABASE)");
      isValidate = false;
    }
    return isValidate;
}