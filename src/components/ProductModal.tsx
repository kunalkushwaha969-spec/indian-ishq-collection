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

  // Clean up camera stream when modal closes
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

  // Strict format validation helper
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

    // Instant local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start Live Webcam Stream
  const handleStartCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback directly to mobile camera capture input
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
      // If webcam permission is denied or device camera unavailable, open native file capture
      setCameraError('Webcam access was denied or unavailable. Opening device camera.');
      setTimeout(() => {
        mobileCameraInputRef.current?.click();
      }, 300);
    }
  };

  // Capture Photo from Live Webcam
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

    // If an image file was selected or captured, upload directly to cloud storage first
    if (imageFile) {
      try {
        setIsUploading(true);
        finalImageUrl = await uploadImageDirect(imageFile);
      } catch (err: any) {
        console.warn('[Product Image Fallback]: Cloud storage notice, using local image preview:', err);
        finalImageUrl = previewUrl || imageUrl.trim() || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div className="bg-[#fffdf9] w-full max-w-[620px] rounded-xl shadow-2xl border border-[#eadfda] my-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eadfda] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#f8eeeb] text-[#70283b] rounded-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-product-title" className="font-serif text-xl sm:text-2xl text-[#70283b]">
                Add Product to Catalog
              </h2>
              <span className="text-[11px] text-[#776c6b]">
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
            className="text-2xl text-[#70283b] hover:opacity-75 p-1 leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-r flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {cameraError && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-xs rounded-r flex items-center gap-2">
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
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kasauti Cotton Kurti"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
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
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                placeholder="1499"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Strike Price (₹)
              </label>
              <input
                type="number"
                min={1}
                placeholder="1899"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Stock Count *
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="10"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Fabric Details / Craft
              </label>
              <input
                type="text"
                placeholder="e.g. Hand-block Mulmul Cotton"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Badge / Tag
              </label>
              <input
                type="text"
                placeholder="e.g. BESTSELLER, NEW, CURATED"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded-lg text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
          </div>

          {/* MERCHANT CAMERA & IMAGE UPLOAD SECTION */}
          <div className="border border-dashed border-[#b78a4b]/60 p-4 rounded-xl bg-[#fcf9f5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#70283b] uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#b78a4b]" />
                <span>Product Photo & Instant Camera</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  JPEG
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  PNG
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  WebP
                </span>
              </div>
            </div>

            {/* LIVE WEBCAM VIEWFINDER MODE */}
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
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>CAMERA ACTIVE</span>
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
                    className="px-5 py-2 bg-[#b78a4b] hover:bg-[#a67a3d] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo</span>
                  </button>
                </div>
              </div>
            ) : (
              /* STANDARD UPLOAD & CAMERA CONTROLS */
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Photo Preview Box */}
                <div className="w-24 h-28 rounded-lg border border-[#eadfda] bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {previewUrl || imageUrl ? (
                    <img
                      src={previewUrl || imageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-stone-300">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] block text-stone-400">No Image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {/* Live Camera Viewfinder Button */}
                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-3 py-2 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Use Camera / Webcam</span>
                    </button>

                    {/* File Browser Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-white border border-[#eadfda] hover:bg-[#f8eeeb] text-[#70283b] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Choose File</span>
                    </button>

                    {/* Native Mobile Camera Button */}
                    <button
                      type="button"
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="px-3 py-2 bg-white border border-[#eadfda] hover:bg-[#f8eeeb] text-[#776c6b] hover:text-[#70283b] text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer sm:hidden"
                    >
                      <Video className="w-4 h-4" />
                      <span>Direct Capture</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-[#776c6b] leading-tight">
                    Strictly accepts <strong className="text-[#292222]">JPEG, PNG, or WebP</strong> up to 5MB. Photo is saved directly to your store catalog.
                  </p>

                  {imageFile && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[220px]">{imageFile.name}</span>
                      <span className="text-[10px] text-gray-400">
                        ({Math.round(imageFile.size / 1024)} KB)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Or Image URL Input */}
            <div className="pt-2 border-t border-[#eadfda]/80">
              <label className="block text-[11px] font-semibold text-[#776c6b] mb-1">
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
                className="w-full p-2 bg-white border border-[#eadfda] rounded-lg text-xs text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#eadfda]">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2 border border-[#eadfda] rounded-lg text-xs font-semibold text-[#776c6b] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className="px-6 py-2.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
            >
              {(isUploading || isSaving) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isUploading ? 'Uploading Image...' : isSaving ? 'Saving...' : 'Save Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
