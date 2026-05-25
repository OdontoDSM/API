/**
 * Estado global da conexão com o banco de dados.
 * type: 'mongodb' | 'sqlite' | null
 * sqlite: instância do better-sqlite3 quando em modo SQLite
 */
export const dbState = {
  type: null,
  sqlite: null,
};
