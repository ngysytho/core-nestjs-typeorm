export const logMigration = (message: string, context?: string) => {
  const now = new Date().toISOString();
  console.log(`====== [${now}] ${context ?? 'Migration'} - ${message} ======`);
};

export const logSeed = (message: string, context?: string) => {
  const now = new Date().toISOString();
  console.log(`====== [${now}] ${context ?? 'Seed'} - ${message} ======`);
};
