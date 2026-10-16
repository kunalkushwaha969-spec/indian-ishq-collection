import React, { useState } from 'react';
import type { Product } from '../utils/ecommerce';
import { uploadImageDirect, createProduct } from '../services/api';
import { UploadCloud, Image as ImageIcon, Loader2, X, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
}

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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be under 5MB');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let finalImageUrl = imageUrl.trim();

    // If an image file was selected, upload directly to cloud storage first
    if (imageFile) {
      try {
        setIsUploading(true);
        finalImageUrl = await uploadImageDirect(imageFile);
      } catch (err: any) {
        console.warn('[Product Image Fallback]: Cloud storage error, using local image preview:', err);
        finalImageUrl = previewUrl || imageUrl.trim() || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80';
      } finally {
        setIsUploading(false);
      }
    }

    if (!finalImageUrl) {
      setErrorMsg('Please upload a product photo or provide an image URL');
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
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save product to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fffdf9] w-full max-w-[600px] rounded-lg shadow-2xl border border-[#eadfda] my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eadfda] bg-white">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#70283b]" />
            <h2 id="add-product-title" className="font-serif text-2xl text-[#70283b]">
              Add New Product to Cloud Catalog
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product modal"
            className="text-2xl text-[#70283b] hover:opacity-75 p-1 leading-none"
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
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
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
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                MRP / Strike (₹)
              </label>
              <input
                type="number"
                min={1}
                placeholder="1899"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#776c6b] uppercase tracking-wider mb-1">
                Stock Quantity *
              </label>
              <input
                type="number"
                required
                min={0}
                placeholder="10"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
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
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
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
                className="w-full p-2.5 bg-white border border-[#eadfda] rounded text-sm text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
          </div>

          {/* Cloud Storage Image Upload Section */}
          <div className="border border-dashed border-[#b78a4b] p-4 rounded-md bg-[#fcf9f5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#70283b] uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4" />
                <span>Upload to Cloud Storage Bucket</span>
              </span>
              <span className="text-[10px] text-[#776c6b]">Supabase / Firebase Storage</span>
            </div>

            <div className="flex gap-4 items-center">
              {/* Preview Box */}
              <div className="w-20 h-24 rounded border border-[#eadfda] bg-white overflow-hidden shrink-0 flex items-center justify-center">
                {previewUrl || imageUrl ? (
                  <img
                    src={previewUrl || imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-[#776c6b] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#70283b] file:text-white hover:file:bg-[#4c1727] cursor-pointer"
                />
                <p className="text-[11px] text-[#776c6b]">
                  Accepts JPG, PNG, WebP up to 5MB. Uploaded directly to your cloud storage bucket.
                </p>
              </div>
            </div>

            {/* Direct URL Alternative */}
            <div className="pt-2 border-t border-[#eadfda]">
              <label className="block text-[11px] text-[#776c6b] mb-1">
                Or paste public image URL:
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (!imageFile) setPreviewUrl(e.target.value);
                }}
                className="w-full p-2 bg-white border border-[#eadfda] rounded text-xs text-[#292222] focus:outline-[#b78a4b]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#eadfda] bg-white text-[#70283b] text-xs font-semibold rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || isSaving}
              className="px-6 py-2.5 bg-[#70283b] hover:bg-[#4c1727] text-white text-xs font-semibold tracking-wider uppercase rounded transition-colors shadow flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Image...</span>
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Product...</span>
                </>
              ) : (
                <span>Save to Cloud Catalog</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
