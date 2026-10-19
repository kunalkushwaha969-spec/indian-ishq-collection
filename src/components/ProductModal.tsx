import React, { useState, useRef, useEffect } from 'react';
import type { Product } from '../utils/ecommerce';
import { formatINR } from '../utils/ecommerce';
import { uploadImageDirect, createProduct, updateProduct } from '../services/api';
import {
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  X,
  AlertCircle,
  Camera,
  CheckCircle2,
  Video,
  Plus,
  Minus,
} from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
  initialProduct?: Product | null;
  onProductUpdated?: (product: Product) => void;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];
const TAG_OPTIONS = ['NEW', 'BESTSELLER', 'FESTIVE', 'CURATED', 'HANDCRAFTED'];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  initialProduct = null,
  onProductUpdated,
}) => {
  const isEditing = Boolean(initialProduct);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Kurtis');
  const [regularPrice, setRegularPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('10');
  const [fabric, setFabric] = useState('');
  const [tag, setTag] = useState('NEW');
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
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
    if (!isOpen) return;
    setErrorMsg(null);
    setCameraError(null);
    setImageFile(null);

    if (initialProduct) {
      setName(initialProduct.name || '');
      setCategory(initialProduct.category || 'Kurtis');
      const hasDiscount =
        Boolean(initialProduct.old_price) &&
        Number(initialProduct.old_price) > Number(initialProduct.price);
      setRegularPrice(
        hasDiscount ? String(initialProduct.old_price) : String(initialProduct.price || '')
      );
      setSalePrice(hasDiscount ? String(initialProduct.price) : '');
      setDescription(initialProduct.description || '');
      setStock(String(initialProduct.stock ?? 10));
      setFabric(initialProduct.fabric || '');
      setTag(initialProduct.tag || 'NEW');
      setSizes(
        initialProduct.sizes && initialProduct.sizes.length > 0
          ? initialProduct.sizes
          : initialProduct.category.toLowerCase() === 'sarees'
          ? ['Free Size']
          : ['S', 'M', 'L', 'XL']
      );
      setImageUrl(initialProduct.image_url || '');
      setPreviewUrl(initialProduct.image_url || '');
    } else {
      setName('');
      setCategory('Kurtis');
      setRegularPrice('');
      setSalePrice('');
      setDescription('');
      setStock('10');
      setFabric('');
      setTag('NEW');
      setSizes(['S', 'M', 'L', 'XL']);
      setImageUrl('');
      setPreviewUrl('');
    }
  }, [isOpen, initialProduct]);

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
      setErrorMsg('Please choose a JPEG, PNG, or WebP photo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Photo size must be under 5MB.');
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
      setCameraError('Opening your phone camera...');
      setTimeout(() => {
        mobileCameraInputRef.current?.click();
      }, 250);
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

  const toggleSize = (size: string) => {
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const parsedRegular = Number(regularPrice) || 0;
  const parsedSale = salePrice.trim() ? Number(salePrice) || 0 : 0;
  const isSaleActive = parsedSale > 0 && parsedSale < parsedRegular;
  const effectiveCustomerPrice = isSaleActive ? parsedSale : parsedRegular;
  const effectiveOldPrice = isSaleActive
    ? parsedRegular
    : parsedSale > parsedRegular
    ? parsedSale
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a product name.');
      return;
    }

    if (parsedRegular <= 0) {
      setErrorMsg('Please enter a valid price in ₹.');
      return;
    }

    let finalImageUrl = imageUrl.trim() || previewUrl;

    if (imageFile) {
      try {
        setIsUploading(true);
        finalImageUrl = await uploadImageDirect(imageFile);
      } catch (err: any) {
        console.warn('[Product Image Fallback]: Using local photo preview:', err);
        finalImageUrl =
          previewUrl ||
          imageUrl.trim() ||
          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80';
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalImageUrl) {
      setErrorMsg('Please upload a product photo, take a picture with your camera, or paste an image link.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: name.trim(),
        category,
        price: effectiveCustomerPrice,
        old_price: effectiveOldPrice,
        description: description.trim() || undefined,
        sizes: sizes.length > 0 ? sizes : ['Free Size'],
        stock: Math.max(0, Number(stock) || 0),
        image_url: finalImageUrl,
        tag: tag.trim() || 'NEW',
        fabric: fabric.trim() || 'Handcrafted Indian Ethnic Wear',
      };

      if (isEditing && initialProduct) {
        const updated = await updateProduct(initialProduct.id, payload);
        onProductUpdated?.(updated);
      } else {
        const created = await createProduct(payload);
        onProductCreated(created);
      }

      stopCameraStream();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCameraStream();
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[640px] rounded-xl shadow-2xl border my-auto max-h-[92vh] flex flex-col overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-main)',
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="p-2 rounded-lg border shrink-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--primary)',
              }}
            >
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="product-modal-title"
                className="font-serif text-xl sm:text-2xl font-semibold truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <span className="text-xs block truncate" style={{ color: 'var(--text-muted)' }}>
                {isEditing
                  ? 'Update product details, price, or photo'
                  : 'Add an outfit to your store in a few simple steps'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            aria-label="Close product form"
            className="w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden Camera & File Inputs */}
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div
              className="p-3 rounded-lg border text-xs flex items-center gap-2"
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
              className="p-3 rounded-lg border text-xs flex items-center gap-2"
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

          {/* 1. Product Photo (First and easiest on phone) */}
          <div
            className="border p-4 rounded-xl space-y-3"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold flex items-center gap-1.5"
                style={{ color: 'var(--text-main)' }}
              >
                <Camera className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <span>Product Photo *</span>
              </span>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Phone Gallery or Camera
              </span>
            </div>

            {isCameraActive ? (
              <div className="space-y-3 bg-black/90 p-3.5 rounded-xl text-white">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/20">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold">
                    Camera Ready
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="px-5 py-2.5 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
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
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2" style={{ color: 'var(--text-muted)' }}>
                      <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px] block">No Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-opacity hover:opacity-95 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'var(--btn-text)',
                      }}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartCamera}
                      className="px-3.5 py-2.5 border text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => mobileCameraInputRef.current?.click()}
                      className="px-3.5 py-2.5 border text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer sm:hidden"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Video className="w-4 h-4" />
                      <span>Phone Camera</span>
                    </button>
                  </div>

                  {imageFile && (
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: 'var(--success-text)' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[220px]">{imageFile.name}</span>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="product-image-url"
                      className="block text-[11px] mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Or paste an image link (optional):
                    </label>
                    <input
                      id="product-image-url"
                      type="url"
                      placeholder="https://..."
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
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
              </div>
            )}
          </div>

          {/* 2. Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product-name-input"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--text-main)' }}
              >
                Product Name *
              </label>
              <input
                id="product-name-input"
                type="text"
                required
                placeholder="e.g. Begum Zari Chanderi Kurta Set"
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
                htmlFor="product-category-select"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--text-main)' }}
              >
                Category *
              </label>
              <select
                id="product-category-select"
                value={category}
                onChange={(e) => {
                  const nextCat = e.target.value;
                  setCategory(nextCat);
                  if (nextCat === 'Sarees') {
                    setSizes(['Free Size']);
                  } else if (sizes.length === 1 && sizes[0] === 'Free Size') {
                    setSizes(['S', 'M', 'L', 'XL']);
                  }
                }}
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
                <option value="Everyday">Everyday Wear</option>
              </select>
            </div>
          </div>

          {/* 3. Price & Optional Sale Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="product-price-input"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--text-main)' }}
              >
                Price (₹) *
              </label>
              <input
                id="product-price-input"
                type="number"
                required
                min={1}
                placeholder="e.g. 1899"
                value={regularPrice}
                onChange={(e) => setRegularPrice(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
              <span className="text-[11px] block mt-1" style={{ color: 'var(--text-muted)' }}>
                Regular selling price in ₹
              </span>
            </div>

            <div>
              <label
                htmlFor="product-sale-price-input"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--text-main)' }}
              >
                Sale Price (₹, Optional)
              </label>
              <input
                id="product-sale-price-input"
                type="number"
                min={1}
                placeholder="e.g. 1499 (leave blank if not on sale)"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
              {isSaleActive ? (
                <span
                  className="text-[11px] font-medium block mt-1"
                  style={{ color: 'var(--success-text)' }}
                >
                  Customer pays {formatINR(parsedSale)} ({formatINR(parsedRegular)} crossed out)
                </span>
              ) : (
                <span className="text-[11px] block mt-1" style={{ color: 'var(--text-muted)' }}>
                  Enter a lower price if this outfit is on discount
                </span>
              )}
            </div>
          </div>

          {/* 4. Description & Fabric */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="product-description-input"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--text-main)' }}
              >
                Description (Optional)
              </label>
              <textarea
                id="product-description-input"
                rows={2}
                placeholder="e.g. Comfortable festive kurta with delicate zari embroidery and matching dupatta."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm leading-relaxed"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="product-fabric-input"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Fabric / Material
                </label>
                <input
                  id="product-fabric-input"
                  type="text"
                  placeholder="e.g. Pure Mulmul Cotton, Chanderi Silk"
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
                  htmlFor="product-tag-select"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Product Label
                </label>
                <select
                  id="product-tag-select"
                  value={TAG_OPTIONS.includes(tag) ? tag : 'NEW'}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full p-2.5 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  {TAG_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 5. Available Sizes & Stock Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <span
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-main)' }}
              >
                Available Sizes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((size) => {
                  const selected = sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer"
                      style={{
                        backgroundColor: selected ? 'var(--primary)' : 'var(--input-bg)',
                        color: selected ? 'var(--btn-text)' : 'var(--text-main)',
                        borderColor: selected ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="product-stock-input"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-main)' }}
              >
                Quantity Available in Stock *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStock(String(Math.max(0, (Number(stock) || 0) - 1)))}
                  aria-label="Decrease stock quantity"
                  className="w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  id="product-stock-input"
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-24 p-2 rounded-lg border text-center text-sm font-semibold tabular-nums"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setStock(String((Number(stock) || 0) + 1))}
                  aria-label="Increase stock quantity"
                  className="w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center justify-end gap-3 pt-4 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2.5 border rounded-lg text-xs font-semibold transition-colors cursor-pointer"
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
              className="px-6 py-2.5 text-xs font-semibold rounded-lg transition-opacity hover:opacity-95 flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              {(isUploading || isSaving) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isUploading
                  ? 'Uploading Photo...'
                  : isSaving
                  ? 'Saving...'
                  : isEditing
                  ? 'Save Changes'
                  : 'Save Product'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
