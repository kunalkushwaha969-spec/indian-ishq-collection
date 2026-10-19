import React, { useState, useRef, useEffect } from 'react';
import type { Product } from '../utils/ecommerce';
import { uploadImageDirect, createProduct } from '../services/api';
import {
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  X,
  AlertCircle,
  Camera,
  CheckCircle2,
  Video,
} from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Kurtis');
  const [price, setPrice] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [fabric, setFabric] = useState('');
  const [tag, setTag] = useState('NEW');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Camera / Webcam states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  if (!isOpen) return null;

  const validateFormat = (file: File): boolean => {
    const typeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const extValid = ALLOWED_EXTENSIONS.includes(ext);
    return typeValid || extValid;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFormat(file)) {
      setErrorMsg('Unsupported format. Please upload JPEG, PNG, or WebP images only.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be under 5MB.');
      return;
    }

    setErrorMsg(null);
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      mobileCameraInputRef.current?.click();
      return;
    }

    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setIsCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError('Webcam access was denied or unavailable. Opening device camera.');
      setTimeout(() => {
        mobileCameraInputRef.current?.click();
      }, 300);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const capturedFile = new File([blob], `product-photo-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });

          setImageFile(capturedFile);
          setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
          stopCameraStream();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let finalImageUrl = imageUrl.trim();

    if (imageFile) {
      try {
        setIsUploading(true);
        finalImageUrl = await uploadImageDirect(imageFile);
      } catch (err: any) {
        console.warn('[Product Image Fallback]: Cloud storage notice, using local image preview:', err);
        finalImageUrl =
          previewUrl ||
          imageUrl.trim() ||
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80';
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalImageUrl) {
      setErrorMsg('Please upload a product photo, snap a photo with your camera, or enter an image URL.');
      return;
    }

    try {
      setIsSaving(true);
      const newProduct = await createProduct({
        name: name.trim(),
        category,
        price: Number(price),
        old_price: oldPrice ? Number(oldPrice) : Number(price),
        stock: Number(stock),
        image_url: finalImageUrl,
        tag: tag.trim() || 'NEW',
        fabric: fabric.trim() || 'Handcrafted Indian Ethnic Wear',
      });

      onProductCreated(newProduct);
      stopCameraStream();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product to catalog');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[620px] rounded-xl shadow-2xl border my-4 overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="add-product-title"
                className="font-serif text-xl sm:text-2xl font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                Add Product to Catalog
              </h2>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Add a new handcrafted piece to your boutique catalog
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            aria-label="Close product modal"
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div
            className="mx-6 mt-4 p-3 rounded-lg border text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'var(--error-bg)',
              borderColor: 'var(--error-border)',
              color: 'var(--error-text)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {cameraError && (
          <div
            className="mx-6 mt-4 p-3 rounded-lg border text-xs flex items-center gap-2"
            style={{
              backgroundColor: 'var(--warning-bg)',
              borderColor: 'var(--warning-border)',
              color: 'var(--warning-text)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Hidden Camera Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={mobileCameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kasauti Cotton Kurti"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                <option value="Kurtis">Kurtis</option>
                <option value="Sarees">Sarees</option>
                <option value="Suits">Suit Sets</option>
                <option value="Festive">Festive Wear</option>
                <option value="Everyday">Everyday</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Price (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="1499"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Strike Price (₹)
              </label>
              <input
                type="number"
                min={1}
                placeholder="1899"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Stock Count *
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="10"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Fabric Details / Craft
              </label>
              <input
                type="text"
                placeholder="e.g. Hand-block Mulmul Cotton"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Badge / Tag
              </label>
              <input
                type="text"
                placeholder="e.g. BESTSELLER, NEW, CURATED"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          {/* MERCHANT CAMERA & IMAGE UPLOAD SECTION */}
          <div
            className="border border-dashed p-4 rounded-xl space-y-3"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--accent)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: 'var(--primary)' }}
              >
                <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span>Product Photo & Instant Camera</span>
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                JPEG · PNG · WebP
              </span>
            </div>

            {isCameraActive ? (
              <div className="space-y-3 bg-black/90 p-4 rounded-xl text-white">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/20">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold">
                    CAMERA ACTIVE
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="px-5 py-2 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div
                  className="w-24 h-28 rounded-lg border overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {previewUrl || imageUrl ? (
                    <img
                      src={previewUrl || imageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2" style={{ color: 'var(--text-muted)' }}>
                      <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] block">No Image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-opacity hover:opacity-95 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Use Camera / Webcam</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 border text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Choose File</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="px-3 py-2 border text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer sm:hidden"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Video className="w-4 h-4" />
                      <span>Direct Capture</span>
                    </button>
                  </div>

                  <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                    Accepts <strong style={{ color: 'var(--text-main)' }}>JPEG, PNG, or WebP</strong> up
                    to 5MB.
                  </p>

                  {imageFile && (
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--success-text)' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[220px]">{imageFile.name}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        ({Math.round(imageFile.size / 1024)} KB)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <label
                className="block text-[11px] font-semibold mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Or paste hosted Image URL:
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (!imageFile) setPreviewUrl(e.target.value);
                }}
                className="w-full p-2 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex justify-end gap-3 pt-4 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2 border rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className="px-6 py-2.5 text-xs font-semibold tracking-wider uppercase rounded-lg transition-opacity hover:opacity-95 flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              {(isUploading || isSaving) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isUploading ? 'Uploading Image...' : isSaving ? 'Saving...' : 'Save Product'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
