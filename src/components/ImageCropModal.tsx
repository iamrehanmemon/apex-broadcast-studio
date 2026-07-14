import { useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface Props {
  imageSrc: string;
  aspect: number;
  cropShape?: 'rect' | 'round';
  onCancel: () => void;
  onConfirm: (cropPixels: Area) => void;
}

export default function ImageCropModal({ imageSrc, aspect, cropShape = 'rect', onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--white)' }}>
          Adjust Photo
        </div>
        <div style={{ position: 'relative', width: '100%', height: 400, background: 'var(--charcoal)', border: '1px solid var(--border-dim)' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
          />
        </div>
        <div>
          <label>Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-accent" disabled={!croppedAreaPixels} onClick={() => croppedAreaPixels && onConfirm(croppedAreaPixels)}>
            Use This Photo
          </button>
        </div>
      </div>
    </div>
  );
}
