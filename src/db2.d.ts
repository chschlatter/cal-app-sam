export interface DB {
  tableName: string;
  client: Promise<any>;
}

export function initDB(tableName: string): DB;
