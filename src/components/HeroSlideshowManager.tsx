import React, { useState } from 'react';
import {
  type HeroSlide,
  type StoreSettings,
  DEFAULT_HERO_SLIDES,
  reorderHeroSlides,
  sanitizeHeroSlides,
} from '../utils/ecommerce';
import { uploadImageDirect } from '../services/api';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface HeroSlideshowManagerProps {
  storeSettings: StoreSettings;
  isSaving: boolean;
  onChangeSettings: (updated: StoreSettings) => void;
  onSaveSettings: (e?: React.FormEvent, customSettings?: StoreSettings) => Promise<void>;
  onBanner: (banner: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

const CATEGORY_OPTIONS = [
  { value: 'All', label: 'All Pieces (Full Collection)' },
  { value: 'Kurtis', label: 'Kurtis Collection' },
  { value: 'Sarees', label: 'Sarees Collection' },
  { value: 'Suits', label: 'Suit Sets Collection' },
  { value: 'Festive', label: 'Festive Wear Collection' },
];

export const HeroSlideshowManager: React.FC<HeroSlideshowManagerProps> = ({
  storeSettings,
  isSaving,
  onChangeSettings,
  onSaveSettings,
  onBanner,
}) => {
  const slides = sanitizeHeroSlides(storeSettings.heroSlides, DEFAULT_HERO_SLIDES);
  const activeCount = slides.filter((s) => s.enabled).length;

  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
  const [newSlide, setNewSlide] = useState<{
    imageUrl: string;
    mobileImageUrl: string;
    badge: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    categoryFilter: string;
    overlayOpacity: number;
  }>({
    imageUrl: '',
    mobileImageUrl: '',
    badge: 'Seasonal Showcase',
    title: '',
    subtitle: '',
    ctaText: 'Explore Collection',
    ctaLink: '#shop',
    categoryFilter: 'All',
    overlayOpacity: 75,
  });

  const updateSlidesList = (nextSlides: HeroSlide[]) => {
    const normalized = nextSlides.map((s, idx) => ({ ...s, order: idx }));
    onChangeSettings({
      ...storeSettings,
      heroSlides: normalized,
    });
  };

  const handleUpdateSlideField = (
    slideId: string,
    field: keyof HeroSlide,
    value: string | boolean | number
  ) => {
    const updated = slides.map((s) => (s.id === slideId ? { ...s, [field]: value } : s));
    updateSlidesList(updated);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = reorderHeroSlides(slides, index, targetIndex);
    updateSlidesList(reordered);
  };

  const handleDeleteSlide = (slideId: string) => {
    if (slides.length <= 1) {
      onBanner({
        type: 'error',
        message: 'At least one hero slide must remain in the slideshow.',
      });
      return;
    }
    const remaining = slides
      .filter((s) => s.id !== slideId)
      .map((s, idx) => ({ ...s, order: idx }));
    updateSlidesList(remaining);
    onBanner({
      type: 'info',
      message: 'Slide removed. Click "Save Hero Slideshow" to publish changes.',
    });
  };

  const handleSlideImageUpload = async (
    slideId: string,
    field: 'imageUrl' | 'mobileImageUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlideId(`${slideId}-${field}`);
    try {
      const dataUrl = await uploadImageDirect(file);
      handleUpdateSlideField(slideId, field, dataUrl);
      onBanner({
        type: 'info',
        message: `${
          field === 'mobileImageUrl' ? 'Mobile portrait' : 'Desktop'
        } slide image uploaded! Click "Save Hero Slideshow" to publish.`,
      });
    } catch (err: unknown) {
      onBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload slide image.',
      });
    } finally {
      setUploadingSlideId(null);
    }
  };

  const handleNewSlideImageUpload = async (
    field: 'imageUrl' | 'mobileImageUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlideId(`new-${field}`);
    try {
      const dataUrl = await uploadImageDirect(file);
      setNewSlide((prev) => ({ ...prev, [field]: dataUrl }));
      onBanner({
        type: 'info',
        message: 'Slide image ready. Fill in the heading and click "Add Slide to Carousel".',
      });
    } catch (err: unknown) {
      onBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload image file.',
      });
    } finally {
      setUploadingSlideId(null);
    }
  };

  const handleCreateSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlide.imageUrl.trim()) {
      onBanner({
        type: 'error',
        message: 'Please provide an image URL or upload an image file for the new slide.',
      });
      return;
    }
    const created: HeroSlide = {
      id: `slide-${Date.now()}`,
      imageUrl: newSlide.imageUrl.trim(),
      ...(newSlide.mobileImageUrl.trim()
        ? { mobileImageUrl: newSlide.mobileImageUrl.trim() }
        : {}),
      badge: newSlide.badge.trim() || 'Featured Edit',
      title: newSlide.title.trim() || storeSettings.tagline,
      subtitle: newSlide.subtitle.trim() || storeSettings.brandDescription,
      ctaText: newSlide.ctaText.trim() || 'Explore Collection',
      ctaLink: newSlide.ctaLink.trim() || '#shop',
      categoryFilter: newSlide.categoryFilter || 'All',
      overlayOpacity: newSlide.overlayOpacity || 75,
      enabled: true,
      order: slides.length,
    };

    const nextSlides = [...slides, created];
    updateSlidesList(nextSlides);
    setNewSlide({
      imageUrl: '',
      mobileImageUrl: '',
      badge: 'Seasonal Showcase',
      title: '',
      subtitle: '',
      ctaText: 'Explore Collection',
      ctaLink: '#shop',
      categoryFilter: 'All',
      overlayOpacity: 75,
    });
    setIsAddingSlide(false);
    onBanner({
      type: 'success',
      message: 'New hero slide added! Click "Save Hero Slideshow" to publish across the storefront.',
    });
  };

  const handleResetDefaultSlides = () => {
    const defaults = DEFAULT_HERO_SLIDES.map((s, idx) => ({ ...s, order: idx }));
    updateSlidesList(defaults);
    onBanner({
      type: 'info',
      message:
        'Restored the 3 default Indian Ishq Collection slides. Click "Save Hero Slideshow" to confirm.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Global Controls */}
      <div
        className="p-5 sm:p-6 rounded-xl border space-y-5"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                Image-First Storefront Hero
              </span>
            </div>
            <h3
              className="font-serif text-xl sm:text-2xl font-bold mt-0.5"
              style={{ color: 'var(--text-main)' }}
            >
              Hero Slideshow & Banner Management
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Configure full-bleed hero fashion slides, overlay headings, CTA buttons, slide order,
              and auto-rotation persisted to Firebase Firestore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddingSlide((prev) => !prev)}
              className="px-3.5 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              style={{
                backgroundColor: isAddingSlide ? 'var(--surface-elevated)' : 'var(--secondary)',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingSlide ? 'Cancel New Slide' : 'Add Hero Slide'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSaveSettings()}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Hero Slideshow'}</span>
            </button>
          </div>
        </div>

        {/* Global Carousel Behavior Bar */}
        <div
          className="p-4 rounded-xl border grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center justify-between md:justify-start gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={storeSettings.heroAutoplay}
                onChange={(e) =>
                  onChangeSettings({
                    ...storeSettings,
                    heroAutoplay: e.target.checked,
                  })
                }
                className="accent-current w-4 h-4"
              />
              <div>
                <span
                  className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: 'var(--text-main)' }}
                >
                  {storeSettings.heroAutoplay ? (
                    <Play className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Pause className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span>Auto-Rotate Slideshow</span>
                </span>
                <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>
                  Pauses automatically when customer hovers or swipes
                </span>
              </div>
            </label>
          </div>

          <div>
            <label
              htmlFor="hero-interval-select"
              className="block text-[11px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Slide Rotation Speed
            </label>
            <select
              id="hero-interval-select"
              value={storeSettings.heroIntervalMs || 5000}
              onChange={(e) =>
                onChangeSettings({
                  ...storeSettings,
                  heroIntervalMs: Number(e.target.value),
                })
              }
              className="w-full p-2 rounded-lg border text-xs font-medium"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            >
              <option value={3500}>Fast (3.5 seconds)</option>
              <option value={5000}>Standard Editorial (5 seconds)</option>
              <option value={7000}>Relaxed (7 seconds)</option>
              <option value={10000}>Slow Showcase (10 seconds)</option>
            </select>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--primary)' }}>{activeCount}</strong> of{' '}
              <strong>{slides.length}</strong> slides active
            </div>
            <button
              type="button"
              onClick={handleResetDefaultSlides}
              className="px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
              title="Reset to the 3 default Indian Ishq Collection ethnic wear slides"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Add New Slide Form Drawer */}
        {isAddingSlide && (
          <form
            onSubmit={handleCreateSlide}
            className="p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <h4
                className="font-serif text-lg font-semibold flex items-center gap-2"
                style={{ color: 'var(--primary)' }}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Add New Hero Slide</span>
              </h4>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Slide #{slides.length + 1}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-slide-image-url"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Desktop Slide Image URL *
                </label>
                <input
                  id="new-slide-image-url"
                  type="url"
                  value={newSlide.imageUrl.startsWith('data:') ? '' : newSlide.imageUrl}
                  onChange={(e) => setNewSlide({ ...newSlide, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-file-upload"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Or Upload Desktop Banner Image
                </label>
                <input
                  id="new-slide-file-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleNewSlideImageUpload('imageUrl', e)}
                  className="w-full min-w-0 p-2 border rounded-lg text-xs cursor-pointer"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-mobile-image-url"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Mobile Portrait Image URL (Optional — falls back to Desktop)
                </label>
                <input
                  id="new-slide-mobile-image-url"
                  type="url"
                  value={newSlide.mobileImageUrl.startsWith('data:') ? '' : newSlide.mobileImageUrl}
                  onChange={(e) => setNewSlide({ ...newSlide, mobileImageUrl: e.target.value })}
                  placeholder="Optional portrait image URL for mobile..."
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-mobile-file-upload"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Or Upload Mobile Portrait Image (Optional)
                </label>
                <input
                  id="new-slide-mobile-file-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleNewSlideImageUpload('mobileImageUrl', e)}
                  className="w-full min-w-0 p-2 border rounded-lg text-xs cursor-pointer"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-badge"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Top Kicker / Badge Text
                </label>
                <input
                  id="new-slide-badge"
                  type="text"
                  value={newSlide.badge}
                  onChange={(e) => setNewSlide({ ...newSlide, badge: e.target.value })}
                  placeholder="e.g. The Festive Edit · 2026"
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-title"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Hero Overlay Heading *
                </label>
                <input
                  id="new-slide-title"
                  type="text"
                  value={newSlide.title}
                  onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                  placeholder="e.g. Royal Banarasi Katan Silk Drapes"
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="new-slide-subtitle"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Short Overlay Description (1–2 lines)
                </label>
                <input
                  id="new-slide-subtitle"
                  type="text"
                  value={newSlide.subtitle}
                  onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                  placeholder="Handwoven pure silk sarees with intricate gold zari work for wedding celebrations."
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-cta-text"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  CTA Button Label
                </label>
                <input
                  id="new-slide-cta-text"
                  type="text"
                  value={newSlide.ctaText}
                  onChange={(e) => setNewSlide({ ...newSlide, ctaText: e.target.value })}
                  placeholder="e.g. Explore Collection"
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="new-slide-category"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  CTA Target Category Filter
                </label>
                <select
                  id="new-slide-category"
                  value={newSlide.categoryFilter}
                  onChange={(e) => setNewSlide({ ...newSlide, categoryFilter: e.target.value })}
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingSlide(false)}
                className="px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
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
                disabled={uploadingSlideId?.startsWith('new') || false}
                className="px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Add Slide to Carousel
              </button>
            </div>
          </form>
        )}

        {/* Slide Cards List */}
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="p-4 sm:p-5 rounded-xl border transition-all min-w-0 overflow-hidden"
              style={{
                backgroundColor: slide.enabled ? 'var(--surface-elevated)' : 'var(--surface)',
                borderColor: slide.enabled ? 'var(--border)' : 'var(--border)',
                opacity: slide.enabled ? 1 : 0.72,
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left: Live Visual Preview & Order Controls */}
                <div className="lg:col-span-4 space-y-3 min-w-0">
                  <div
                    className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border bg-black"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <img
                      src={slide.imageUrl}
                      alt={slide.title || `Slide ${index + 1}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_HERO_SLIDES[0].imageUrl;
                      }}
                      className="w-full h-full object-cover object-top"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none"
                      style={{ opacity: (slide.overlayOpacity ?? 75) / 100 }}
                    />

                    {/* Slide Number & Status Tag */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                      <span className="px-2 py-0.5 rounded bg-black/65 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                        Slide #{index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {slide.mobileImageUrl && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold uppercase tracking-wider">
                            +Mobile
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            slide.enabled
                              ? 'bg-emerald-600/90 text-white'
                              : 'bg-neutral-700/90 text-neutral-200'
                          }`}
                        >
                          {slide.enabled ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                    </div>

                    {/* Mini Live Overlay Preview */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white pointer-events-none">
                      {slide.badge && (
                        <span className="text-[9px] uppercase tracking-widest text-amber-300 font-semibold block truncate">
                          {slide.badge}
                        </span>
                      )}
                      <p className="font-serif text-sm font-semibold leading-snug line-clamp-1">
                        {slide.title}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-white text-neutral-900">
                        {slide.ctaText || 'Explore Collection'}
                      </span>
                    </div>
                  </div>

                  {/* Slide Action Toolbar: Move Up, Move Down, Toggle Active, Delete */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveSlide(index, 'up')}
                        aria-label={`Move slide ${index + 1} up`}
                        title="Move Slide Up"
                        className="p-2 rounded-lg border text-xs disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === slides.length - 1}
                        onClick={() => handleMoveSlide(index, 'down')}
                        aria-label={`Move slide ${index + 1} down`}
                        title="Move Slide Down"
                        className="p-2 rounded-lg border text-xs disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateSlideField(slide.id, 'enabled', !slide.enabled)}
                        aria-label={
                          slide.enabled
                            ? `Disable slide ${index + 1}`
                            : `Enable slide ${index + 1}`
                        }
                        className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderColor: 'var(--border)',
                          color: slide.enabled ? 'var(--primary)' : 'var(--text-muted)',
                        }}
                      >
                        {slide.enabled ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSlide(slide.id)}
                        aria-label={`Remove slide ${index + 1}`}
                        title="Remove Slide"
                        className="p-2 rounded-lg border text-xs cursor-pointer"
                        style={{
                          backgroundColor: 'var(--error-bg)',
                          borderColor: 'var(--error-border)',
                          color: 'var(--error-text)',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Slide Content & Image Fields */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-badge-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Kicker / Badge
                    </label>
                    <input
                      id={`slide-badge-${slide.id}`}
                      type="text"
                      value={slide.badge || ''}
                      onChange={(e) => handleUpdateSlideField(slide.id, 'badge', e.target.value)}
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-title-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Overlay Heading
                    </label>
                    <input
                      id={`slide-title-${slide.id}`}
                      type="text"
                      value={slide.title}
                      onChange={(e) => handleUpdateSlideField(slide.id, 'title', e.target.value)}
                      className="w-full min-w-0 p-2 border rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="sm:col-span-2 min-w-0">
                    <label
                      htmlFor={`slide-subtitle-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Overlay Short Description
                    </label>
                    <input
                      id={`slide-subtitle-${slide.id}`}
                      type="text"
                      value={slide.subtitle}
                      onChange={(e) =>
                        handleUpdateSlideField(slide.id, 'subtitle', e.target.value)
                      }
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-cta-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      CTA Button Label
                    </label>
                    <input
                      id={`slide-cta-${slide.id}`}
                      type="text"
                      value={slide.ctaText}
                      onChange={(e) => handleUpdateSlideField(slide.id, 'ctaText', e.target.value)}
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-cat-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Target Category on Click
                    </label>
                    <select
                      id={`slide-cat-${slide.id}`}
                      value={slide.categoryFilter || 'All'}
                      onChange={(e) =>
                        handleUpdateSlideField(slide.id, 'categoryFilter', e.target.value)
                      }
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-link-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      CTA Destination Anchor / URL
                    </label>
                    <input
                      id={`slide-link-${slide.id}`}
                      type="text"
                      value={slide.ctaLink || '#shop'}
                      onChange={(e) => handleUpdateSlideField(slide.id, 'ctaLink', e.target.value)}
                      placeholder="#shop or #categories"
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-opacity-${slide.id}`}
                      className="flex items-center justify-between text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <span>Overlay Contrast</span>
                      <span className="tabular-nums">{slide.overlayOpacity ?? 75}%</span>
                    </label>
                    <input
                      id={`slide-opacity-${slide.id}`}
                      type="range"
                      min={30}
                      max={90}
                      step={5}
                      value={slide.overlayOpacity ?? 75}
                      onChange={(e) =>
                        handleUpdateSlideField(slide.id, 'overlayOpacity', Number(e.target.value))
                      }
                      className="w-full accent-current cursor-pointer mt-1.5"
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-img-url-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Desktop Image URL
                    </label>
                    <input
                      id={`slide-img-url-${slide.id}`}
                      type="url"
                      value={slide.imageUrl.startsWith('data:') ? '' : slide.imageUrl}
                      onChange={(e) =>
                        handleUpdateSlideField(slide.id, 'imageUrl', e.target.value)
                      }
                      placeholder={
                        slide.imageUrl.startsWith('data:')
                          ? 'Custom uploaded image active (paste URL to replace)'
                          : 'https://...'
                      }
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-img-upload-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Upload Desktop Image
                    </label>
                    <label
                      htmlFor={`slide-img-upload-${slide.id}`}
                      className="w-full min-w-0 p-2 border rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                      <span className="truncate">
                        {uploadingSlideId === `${slide.id}-imageUrl`
                          ? 'Optimizing...'
                          : 'Upload Desktop Image'}
                      </span>
                      <input
                        id={`slide-img-upload-${slide.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSlideImageUpload(slide.id, 'imageUrl', e)}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-mobile-img-url-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Mobile Portrait Image URL (Optional)
                    </label>
                    <input
                      id={`slide-mobile-img-url-${slide.id}`}
                      type="url"
                      value={
                        slide.mobileImageUrl && slide.mobileImageUrl.startsWith('data:')
                          ? ''
                          : slide.mobileImageUrl || ''
                      }
                      onChange={(e) =>
                        handleUpdateSlideField(slide.id, 'mobileImageUrl', e.target.value)
                      }
                      placeholder={
                        slide.mobileImageUrl?.startsWith('data:')
                          ? 'Custom mobile image uploaded'
                          : 'Defaults to desktop image if blank'
                      }
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <label
                      htmlFor={`slide-mobile-img-upload-${slide.id}`}
                      className="block text-[11px] font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Upload Mobile Image (Optional)
                    </label>
                    <label
                      htmlFor={`slide-mobile-img-upload-${slide.id}`}
                      className="w-full min-w-0 p-2 border rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                      <span className="truncate">
                        {uploadingSlideId === `${slide.id}-mobileImageUrl`
                          ? 'Optimizing...'
                          : 'Upload Mobile Image'}
                      </span>
                      <input
                        id={`slide-mobile-img-upload-${slide.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSlideImageUpload(slide.id, 'mobileImageUrl', e)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Save Bar */}
        <div
          className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Changes are saved to Firebase Firestore and reflected immediately on the homepage hero.
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSaveSettings()}
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest cursor-pointer disabled:opacity-50 shadow-sm"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--btn-text)',
            }}
          >
            {isSaving ? 'Saving Slideshow...' : 'Save Hero Slideshow'}
          </button>
        </div>
      </div>
    </div>
  );
};
