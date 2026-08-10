/**
 * Cliente mínimo de Meta Marketing API (ads_read).
 * Docs oficiales: https://developers.facebook.com/docs/marketing-api/insights
 *
 * Requiere variables: META_ACCESS_TOKEN (larga duración, 60 días), META_AD_ACCOUNT_ID.
 * Permiso necesario: ads_read. En modo desarrollo basta con ser admin de la ad account.
 *
 * NO se puede probar sin token — queda listo para cuando Israel lo genere.
 */

const API_VERSION = 'v21.0';

export interface MetaInsightDay {
  date_start: string; // YYYY-MM-DD en la zona horaria de la ad account
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  campaign_id: string;
  campaign_name: string;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
}

export class MetaAdsClient {
  private base: string;

  constructor(private token: string, adAccountId: string) {
    const account = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    this.base = `https://graph.facebook.com/${API_VERSION}/${account}`;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams({ ...params, access_token: this.token });
    const res = await fetch(`${this.base}${path}?${qs}`);
    const body = await res.json();
    if (!res.ok) {
      throw new Error(`Meta API ${res.status}: ${body?.error?.message ?? JSON.stringify(body)}`);
    }
    return body as T;
  }

  /** Paginación genérica (sigue paging.next hasta agotar) */
  private async getAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
    const out: T[] = [];
    let url: string | null = `${this.base}${path}?${new URLSearchParams({ ...params, access_token: this.token })}`;
    while (url) {
      const res: Response = await fetch(url);
      const body: any = await res.json();
      if (!res.ok) throw new Error(`Meta API ${res.status}: ${body?.error?.message ?? JSON.stringify(body)}`);
      out.push(...(body.data as T[]));
      url = body.paging?.next ?? null;
    }
    return out;
  }

  campaigns(): Promise<MetaCampaign[]> {
    return this.getAll<MetaCampaign>('/campaigns', {
      fields: 'id,name,status,objective',
      limit: '100',
    });
  }

  /** Insights diarios por campaña para un rango [since, until] (YYYY-MM-DD) */
  insightsDaily(since: string, until: string): Promise<MetaInsightDay[]> {
    return this.getAll<MetaInsightDay>('/insights', {
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,reach',
      level: 'campaign',
      time_increment: '1', // desglose diario — clave para ROAS por día
      'time_range[since]': since,
      'time_range[until]': until,
      limit: '500',
    });
  }
}

export function metaFromEnv(): MetaAdsClient {
  const { META_ACCESS_TOKEN, META_AD_ACCOUNT_ID } = process.env;
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    throw new Error('Faltan META_ACCESS_TOKEN / META_AD_ACCOUNT_ID (Israel las genera en developers.facebook.com)');
  }
  return new MetaAdsClient(META_ACCESS_TOKEN, META_AD_ACCOUNT_ID);
}
