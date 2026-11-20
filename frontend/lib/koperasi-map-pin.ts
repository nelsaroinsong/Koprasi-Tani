/**
 * Elemen DOM pin "Kantor Koperasi" untuk MapLibre Marker (anchor: 'bottom').
 * Dipakai bersama oleh peta Dashboard admin & halaman edit Lokasi Gudang agar tampilannya seragam.
 *
 * Catatan: jangan beri position/transform inline pada elemen root — MapLibre memakai
 * transform root untuk memosisikan marker. Ujung bawah root = ujung lancip pin.
 */
export function createKoperasiPinElement(options?: { label?: string; draggable?: boolean }): HTMLDivElement {
  const label = options?.label ?? 'Kantor Koperasi';
  const root = document.createElement('div');
  root.style.cursor = options?.draggable ? 'grab' : 'default';
  root.style.userSelect = 'none';

  root.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      ${
        label
          ? `<div style="margin-bottom:6px;padding:4px 10px;border-radius:9999px;background:rgba(26,38,16,0.95);color:#fff;font:600 11px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;white-space:nowrap;display:flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,0.22);box-shadow:0 4px 12px rgba(0,0,0,0.3);">
              <span style="width:6px;height:6px;border-radius:9999px;background:#D4F63D;flex-shrink:0;"></span>
              <span>${label}</span>
            </div>`
          : ''
      }
      <div style="position:relative;width:40px;height:50px;">
        <span style="position:absolute;left:50%;bottom:-3px;width:16px;height:6px;margin-left:-8px;border-radius:9999px;background:rgba(0,0,0,0.38);filter:blur(1.5px);"></span>
        <svg width="40" height="50" viewBox="0 0 40 50" fill="none" style="position:relative;display:block;filter:drop-shadow(0 5px 8px rgba(0,0,0,0.35));">
          <path d="M20 2C10.06 2 2 10.06 2 20c0 12.2 14.6 26.3 16.6 28.2a2 2 0 0 0 2.8 0C23.4 46.3 38 32.2 38 20 38 10.06 29.94 2 20 2Z"
                fill="#233414" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
          <g transform="translate(10.5 10.5) scale(0.79)" stroke="#D4F63D" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
            <path d="M6 18h12"/>
            <path d="M6 14h12"/>
            <path d="M6 10h12v12H6z"/>
          </g>
        </svg>
      </div>
    </div>`;

  return root;
}
