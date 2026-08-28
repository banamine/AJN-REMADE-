import React, { useEffect, useState } from 'react';
import { Film, Plus, RefreshCw, Trash2, ShieldCheck, Activity, CheckCircle, Database } from 'lucide-react';

interface MediaAsset {
  id: number;
  title: string;
  file_path: string;
  file_size: number;
  duration: number;
  format: string;
  codec: string;
  bitrate: number;
  status: string;
  health_score: number;
  created_at: string;
}

export function MediaAssetManager() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('checking...');
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form state
  const [title, setTitle] = useState('');
  const [filePath, setFilePath] = useState('');
  const [format, setFormat] = useState('hls');
  const [codec, setCodec] = useState('h264');
  const [bitrate, setBitrate] = useState('4500000');
  const [submitting, setSubmitting] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/assets');
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets);
        setDataSource(data.source || 'postgresql');
      } else {
        setError(data.error || 'Failed to fetch assets');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !filePath) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          file_path: filePath,
          format,
          codec,
          bitrate: parseInt(bitrate) || 4000000,
          file_size: 150000000,
          duration: 3600
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setTitle('');
        setFilePath('');
        fetchAssets();
      } else {
        alert('Error: ' + JSON.stringify(data.error));
      }
    } catch (err) {
      alert('Error creating asset: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunHealthCheck = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/assets/${id}/health-check`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        fetchAssets();
      }
    } catch (err) {
      console.error('Health check failed', err);
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to soft-delete this asset?')) return;
    try {
      const res = await fetch(`/api/v1/assets/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchAssets();
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F19] p-6 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-blue-400" />
            Media Asset & Ingestion Console (Phase 6 M1)
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage media streams, inspect ffprobe metadata, run asset health scoring, and execute bulk ingestions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Store: <strong className="text-blue-400">{dataSource.toUpperCase()}</strong></span>
          </div>
          <button
            onClick={fetchAssets}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Refresh Assets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Ingest New Asset
          </button>
        </div>
      </div>

      {/* Asset Grid / Table */}
      {loading && assets.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
          Error loading assets: {error}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-2">
          <Film className="w-12 h-12 opacity-40" />
          <p className="text-sm">No media assets found in repository.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-white text-base line-clamp-1">{asset.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    asset.health_score >= 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    asset.health_score >= 70 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    Health: {asset.health_score}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-zinc-400 mb-4 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/60">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Format / Codec:</span>
                    <span className="text-zinc-200 uppercase">{asset.format} / {asset.codec}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Bitrate:</span>
                    <span className="text-zinc-200">{(asset.bitrate / 1000000).toFixed(2)} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Duration:</span>
                    <span className="text-zinc-200">{(asset.duration / 60).toFixed(1)} mins</span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span className="text-zinc-500">Source URL:</span>
                    <span className="text-blue-400 truncate max-w-[180px]" title={asset.file_path}>{asset.file_path}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                <span className="text-[10px] text-zinc-500">ID: #{asset.id} • Status: {asset.status}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunHealthCheck(asset.id)}
                    className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-blue-400 transition-colors"
                    title="Run Health Score Analysis"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAsset(asset.id)}
                    className="p-1.5 rounded bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Soft Delete Asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingest Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Ingest New Media Asset
            </h2>
            <p className="text-xs text-zinc-400 mb-6">
              Enter stream URL or file path for metadata extraction, ffprobe verification, and health scoring.
            </p>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Asset Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Live Sports Broadcast 4K"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Stream URL / File Path</label>
                <input
                  type="text"
                  required
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="hls">HLS (.m3u8)</option>
                    <option value="dash">DASH (.mpd)</option>
                    <option value="mp4">MP4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Codec</label>
                  <select
                    value={codec}
                    onChange={(e) => setCodec(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="h264">H.264</option>
                    <option value="hevc">HEVC (H.265)</option>
                    <option value="vp9">VP9</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Bitrate (bps)</label>
                  <input
                    type="number"
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  {submitting ? 'Ingesting...' : 'Ingest & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
