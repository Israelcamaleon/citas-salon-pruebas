/**
 * Cliente XML-RPC para Odoo 8 (sin JSON-RPC ni API keys: usuario + contraseña).
 *
 * Probado contra http://190.92.179.134:8077 el 10-ago-2026 (uid=10, server 8.0 final).
 *
 * Detalle de Odoo 8 que rompe clientes modernos:
 *  - read_group requiere args POSICIONALES: (domain, fields, groupby)
 *  - los conteos llegan como "__count", no "<campo>_count"
 */
import xmlrpc from 'xmlrpc';

export interface OdooConfig {
  url: string;      // ej. http://190.92.179.134:8077
  db: string;       // alika_salon
  user: string;
  password: string;
}

type Domain = unknown[];

export class OdooClient {
  private common: xmlrpc.Client;
  private models: xmlrpc.Client;
  private uid: number | null = null;

  constructor(private cfg: OdooConfig) {
    this.common = xmlrpc.createClient({ url: `${cfg.url}/xmlrpc/2/common` });
    this.models = xmlrpc.createClient({ url: `${cfg.url}/xmlrpc/2/object` });
  }

  private call(client: xmlrpc.Client, method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) =>
      client.methodCall(method, params, (err: unknown, value: unknown) =>
        err ? reject(err) : resolve(value)));
  }

  /** Autentica una sola vez y cachea el uid */
  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;
    const uid = await this.call(this.common, 'authenticate',
      [this.cfg.db, this.cfg.user, this.cfg.password, {}]) as number | false;
    if (!uid) throw new Error('Odoo: autenticación falló (revisar ODOO_USER / ODOO_PASSWORD)');
    this.uid = uid;
    return uid;
  }

  async executeKw<T = unknown>(model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
    const uid = await this.authenticate();
    return this.call(this.models, 'execute_kw',
      [this.cfg.db, uid, this.cfg.password, model, method, ...args, kwargs]) as Promise<T>;
  }

  // OJO Odoo 8: el dominio va envuelto en una lista extra → [[domain]]
  searchRead<T = Record<string, unknown>>(model: string, domain: Domain, fields: string[], opts: { limit?: number; order?: string; offset?: number } = {}): Promise<T[]> {
    return this.executeKw<T[]>(model, 'search_read', [[domain]], {
      fields, limit: opts.limit ?? 1000, order: opts.order ?? 'id', offset: opts.offset ?? 0,
    });
  }

  searchCount(model: string, domain: Domain): Promise<number> {
    return this.executeKw<number>(model, 'search_count', [[domain]]);
  }

  /** Paginación por id ascendente — segura para volúmenes grandes (70k+ tickets) */
  async *searchReadPaged<T extends { id: number }>(
    model: string, domain: Domain, fields: string[], pageSize = 2000,
  ): AsyncGenerator<T[]> {
    let lastId = 0;
    for (;;) {
      const page = await this.searchRead<T>(model, [...domain, ['id', '>', lastId]], fields, {
        limit: pageSize, order: 'id asc',
      });
      if (page.length === 0) break;
      yield page;
      lastId = page[page.length - 1].id;
      if (page.length < pageSize) break;
    }
  }
}

/** Singleton configurado por variables de entorno */
export function odooFromEnv(): OdooClient {
  const { ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD } = process.env;
  if (!ODOO_URL || !ODOO_DB || !ODOO_USER || !ODOO_PASSWORD) {
    throw new Error('Faltan variables ODOO_URL / ODOO_DB / ODOO_USER / ODOO_PASSWORD');
  }
  return new OdooClient({ url: ODOO_URL, db: ODOO_DB, user: ODOO_USER, password: ODOO_PASSWORD });
}
