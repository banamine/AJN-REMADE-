import { pool, getDbStatus } from './db.js';

export interface AssetInput {
  title: string;
  file_path: string;
  file_size?: number;
  duration?: number;
  format?: string;
  codec?: string;
  bitrate?: number;
  status?: string;
  health_score?: number;
  checksum?: string;
  content_type?: string;
  last_checked_at?: string;
  metadata?: any;
}

export interface AssetUpdateInput {
  title?: string;
  file_path?: string;
  file_size?: number;
  duration?: number;
  format?: string;
  codec?: string;
  bitrate?: number;
  status?: string;
  health_score?: number;
  checksum?: string;
  content_type?: string;
  last_checked_at?: string;
  metadata?: any;
}

export const assetRepository = {
  async create(input: AssetInput) {
    if (!getDbStatus()) {
      throw new Error('Database unavailable');
    }
    const {
      title,
      file_path,
      file_size = 0,
      duration = 0,
      format = 'mp4',
      codec = 'h264',
      bitrate = 0,
      status = 'ready',
      health_score = 100,
      checksum = null,
      content_type = null,
      last_checked_at = null,
      metadata = {}
    } = input;

    const query = `
      INSERT INTO media_assets (title, file_path, file_size, duration, format, codec, bitrate, status, health_score, checksum, content_type, last_checked_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const values = [
      title,
      file_path,
      file_size,
      duration,
      format,
      codec,
      bitrate,
      status,
      health_score,
      checksum,
      content_type,
      last_checked_at,
      JSON.stringify(metadata)
    ];
    const res = await pool.query(query, values);
    const asset = res.rows[0];

    await pool.query(
      `INSERT INTO media_asset_audit (asset_id, action, changed_fields, previous_values) VALUES ($1, $2, $3, $4)`,
      [asset.id, 'created', JSON.stringify(asset), JSON.stringify({})]
    );

    return asset;
  },

  async findById(id: number) {
    if (!getDbStatus()) {
      throw new Error('Database unavailable');
    }
    const res = await pool.query('SELECT * FROM media_assets WHERE id = $1 AND deleted_at IS NULL', [id]);
    return res.rows[0] || null;
  },

  async findAll({ page = 1, limit = 50 }: { page?: number; limit?: number }) {
    if (!getDbStatus()) {
      throw new Error('Database unavailable');
    }
    const offset = (page - 1) * limit;
    const countRes = await pool.query('SELECT COUNT(*) FROM media_assets WHERE deleted_at IS NULL');
    const total = parseInt(countRes.rows[0].count, 10);

    const res = await pool.query(
      'SELECT * FROM media_assets WHERE deleted_at IS NULL ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return {
      assets: res.rows,
      total
    };
  },

  async update(id: number, changes: AssetUpdateInput) {
    if (!getDbStatus()) {
      throw new Error('Database unavailable');
    }
    const currentRes = await pool.query('SELECT * FROM media_assets WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (currentRes.rows.length === 0) {
      throw new Error('Asset not found');
    }
    const oldAsset = currentRes.rows[0];

    const keys = Object.keys(changes).filter(k => (changes as any)[k] !== undefined);
    if (keys.length === 0) return oldAsset;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const changedFields: any = {};
    const previousValues: any = {};

    for (const key of keys) {
      let val = (changes as any)[key];
      if (key === 'metadata' && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      if (oldAsset[key] !== val) {
        changedFields[key] = val;
        previousValues[key] = oldAsset[key];
      }
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `UPDATE media_assets SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(query, values);
    const updatedAsset = res.rows[0];

    if (Object.keys(changedFields).length > 0) {
      await pool.query(
        `INSERT INTO media_asset_audit (asset_id, action, changed_fields, previous_values) VALUES ($1, $2, $3, $4)`,
        [id, 'updated', JSON.stringify(changedFields), JSON.stringify(previousValues)]
      );
    }

    return updatedAsset;
  },

  async softDelete(id: number) {
    if (!getDbStatus()) {
      throw new Error('Database unavailable');
    }
    const currentRes = await pool.query('SELECT * FROM media_assets WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (currentRes.rows.length === 0) {
      throw new Error('Asset not found or already deleted');
    }
    const oldAsset = currentRes.rows[0];

    await pool.query(
      'UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    await pool.query(
      `INSERT INTO media_asset_audit (asset_id, action, changed_fields, previous_values) VALUES ($1, $2, $3, $4)`,
      [id, 'soft_deleted', JSON.stringify({ deleted_at: new Date().toISOString() }), JSON.stringify({ deleted_at: oldAsset.deleted_at })]
    );
  },

  async getAuditTrail(assetId: number) {
    if (!getDbStatus()) {
      throw new Error('Database unavailable');
    }
    const res = await pool.query(
      'SELECT * FROM media_asset_audit WHERE asset_id = $1 ORDER BY id DESC',
      [assetId]
    );
    return res.rows;
  }
};
