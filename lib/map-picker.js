/**
 * MonevHub Interactive Slippy Map Picker (OpenStreetMap + Nominatim + Google Maps Link Parser)
 * Zero-dependency & Manifest V3 CSP-safe
 */
(function(global) {
  'use strict';

  function parseGoogleMapsUrl(input) {
    const str = String(input || '').trim();
    if (!str) return null;

    // Pola 1: @lat,lng
    let m = str.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // Pola 2: !3dlat!4dlng
    m = str.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // Pola 3: ?q=lat,lng atau ?ll=lat,lng atau direct "lat, lng"
    m = str.match(/(?:[?&](?:q|ll|center)=|^)(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    return null;
  }

  function lonToTileX(lon, z) {
    return ((lon + 180) / 360) * Math.pow(2, z);
  }

  function latToTileY(lat, z) {
    const rad = (lat * Math.PI) / 180;
    return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z);
  }

  function tileXToLon(x, z) {
    return (x / Math.pow(2, z)) * 360 - 180;
  }

  function tileYToLat(y, z) {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  class SlippyMapPicker {
    constructor(canvasEl, options = {}) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.lat = options.lat || -6.200000;
      this.lng = options.lng || 106.816666;
      this.zoom = options.zoom || 15;
      this.onChange = options.onChange || (() => {});
      this.tileCache = new Map();
      this.dragging = false;
      this.moved = false;
      this.lastX = 0;
      this.lastY = 0;
      this.bindEvents();
      this.render();
    }

    setCoords(lat, lng, zoom = null) {
      if (!Number.isNaN(parseFloat(lat)) && !Number.isNaN(parseFloat(lng))) {
        this.lat = Math.max(-85, Math.min(85, parseFloat(lat)));
        this.lng = Math.max(-180, Math.min(180, parseFloat(lng)));
        if (zoom !== null) this.zoom = Math.max(3, Math.min(18, zoom));
        this.render();
        this.onChange(this.lat, this.lng);
      }
    }

    zoomBy(delta) {
      this.zoom = Math.max(3, Math.min(18, this.zoom + delta));
      this.render();
    }

    bindEvents() {
      this.canvas.addEventListener('pointerdown', (e) => {
        this.dragging = true;
        this.moved = false;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.canvas.setPointerCapture(e.pointerId);
      });

      this.canvas.addEventListener('pointermove', (e) => {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.moved = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        const cx = lonToTileX(this.lng, this.zoom) - dx / 256;
        const cy = latToTileY(this.lat, this.zoom) - dy / 256;
        this.lng = tileXToLon(cx, this.zoom);
        this.lat = Math.max(-85, Math.min(85, tileYToLat(cy, this.zoom)));
        this.render();
        this.onChange(this.lat, this.lng);
      });

      this.canvas.addEventListener('pointerup', (e) => {
        if (!this.dragging) return;
        this.dragging = false;
        if (!this.moved) {
          const rect = this.canvas.getBoundingClientRect();
          const px = (e.clientX - rect.left) * (this.canvas.width / rect.width);
          const py = (e.clientY - rect.top) * (this.canvas.height / rect.height);
          const dx = px - this.canvas.width / 2;
          const dy = py - this.canvas.height / 2;
          const tx = lonToTileX(this.lng, this.zoom) + dx / 256;
          const ty = latToTileY(this.lat, this.zoom) + dy / 256;
          this.lng = tileXToLon(tx, this.zoom);
          this.lat = Math.max(-85, Math.min(85, tileYToLat(ty, this.zoom)));
          this.render();
          this.onChange(this.lat, this.lng);
        }
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.zoomBy(e.deltaY < 0 ? 1 : -1);
      }, { passive: false });
    }

    getTile(z, x, y) {
      const maxTile = Math.pow(2, z);
      const wrapX = ((x % maxTile) + maxTile) % maxTile;
      if (y < 0 || y >= maxTile) return null;
      const key = `${z}/${wrapX}/${y}`;
      if (this.tileCache.has(key)) return this.tileCache.get(key);

      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.onload = () => this.render();
      img.onerror = () => {
        if (!img.dataset.fallbackTried) {
          img.dataset.fallbackTried = '1';
          img.src = `https://a.tile.opentopomap.org/${z}/${wrapX}/${y}.png`;
        }
      };
      img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${wrapX}`;
      this.tileCache.set(key, img);
      return img;
    }

    render() {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const ctx = this.ctx;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, w, h);

      const centerX = lonToTileX(this.lng, this.zoom);
      const centerY = latToTileY(this.lat, this.zoom);
      const startTileX = Math.floor(centerX - w / 512);
      const endTileX = Math.floor(centerX + w / 512);
      const startTileY = Math.floor(centerY - h / 512);
      const endTileY = Math.floor(centerY + h / 512);

      for (let tx = startTileX; tx <= endTileX; tx++) {
        for (let ty = startTileY; ty <= endTileY; ty++) {
          const img = this.getTile(this.zoom, tx, ty);
          const drawX = Math.round(w / 2 + (tx - centerX) * 256);
          const drawY = Math.round(h / 2 + (ty - centerY) * 256);
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, drawX, drawY, 256, 256);
          }
        }
      }

      // Pin tengah merah
      const pinX = w / 2;
      const pinY = h / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.ellipse(pinX, pinY + 2, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pinX, pinY - 14, 9, Math.PI * 0.85, Math.PI * 2.15, false);
      ctx.lineTo(pinX, pinY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pinX, pinY - 14, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  async function searchPlaceNominatim(query) {
    const q = String(query || '').trim();
    if (!q) return [];

    const fetchPhoton = async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lat=-2.5&lon=118.0`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.features || []).map(f => {
          const p = f.properties || {};
          const coords = (f.geometry && f.geometry.coordinates) || [];
          const parts = [p.name, p.street, p.district || p.locality, p.city || p.county, p.state, p.country].filter(Boolean);
          return {
            lat: String(coords[1] ?? ''),
            lon: String(coords[0] ?? ''),
            display_name: parts.join(', ') || q
          };
        }).filter(it => it.lat && it.lon);
      } catch (e) {
        return [];
      }
    };

    const fetchNom = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=id&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return [];
        const arr = await res.json();
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    };

    const [photonItems, nomItems] = await Promise.all([fetchPhoton(), fetchNom()]);
    const merged = [];
    const seen = new Set();
    for (const item of [...photonItems, ...nomItems]) {
      const key = `${parseFloat(item.lat).toFixed(4)},${parseFloat(item.lon).toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    return merged.slice(0, 8);
  }

  global.MonevHubMap = {
    SlippyMapPicker,
    parseGoogleMapsUrl,
    searchPlaceNominatim
  };
})(typeof window !== 'undefined' ? window : this);
