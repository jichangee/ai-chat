import { sql } from '@vercel/postgres';

export { sql };

// 数据库查询辅助函数
export async function query<T>(queryString: string, params?: any[]): Promise<T[]> {
  const result = await sql.query(queryString, params);
  return result.rows as T[];
}

export async function queryOne<T>(queryString: string, params?: any[]): Promise<T | null> {
  const result = await sql.query(queryString, params);
  return result.rows[0] as T || null;
}
