import React, { useState } from 'react';
import {
  type StoreSettings,
  type HeroSlide,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_HERO_SLIDES,
  sanitizeHeroSlides,
  reorderHeroSlides,
} from '../utils/ecommerce';
import {
  COORDINATED_THEMES,
  resolveThemeById,
  applyThemeToDocument,
} from '../utils/themes';
import { uploadImageDirect } from '../services/api';
import {
  Image as ImageIcon,
  Palette,
  Store,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  CheckCircle2,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Play,
  Pause,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface StoreCustomizationProps {
  storeSettings: StoreSettings;
  activeThemeId?: string;
  isSaving: boolean;
  onChangeSettings: (updated: StoreSettings) => void;
  onSaveSettings: (e?: React.FormEvent, customSettings?: StoreSettings) => Promise<void>;
  onCancelChanges?: () => void;
  onSelectPresetTheme?: (themeId: string, mode?: 'light' | 'dark' | 'system') => void;
  onBanner: (banner: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

type CustomizeAreaId = 'homepage' | 'appearance' | 'info';

const DESTINATION_OPTIONS = [
  { value: 'All', label: 'All Outfits (Full Shop)' },
  { value: 'Kurtis', label: 'Kurtis Collection' },
  { value: 'Sarees', label: 'Sarees Collection' },
  { value: 'Suits', label: 'Suit Sets Collection' },
  { value: 'Festive', label: 'Festive Wear Collection' },
];

export const StoreCustomization: React.FC<StoreCustomizationProps> = ({
  storeSettings,
  activeThemeId,
  isSaving,
  onChangeSettings,
  onSaveSettings,
  onCancelChanges,
  onSelectPresetTheme,
  onBanner,
}) => {
  const [activeArea, setActiveArea] = useState<CustomizeAreaId>('homepage');
  const [previewSlideIndex, setPreviewSlideIndex] = useState<number>(0);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
  const [isAddingSlide, setIsAddingSlide] = useState<boolean>(false);
  const [confirmDeleteSlideId, setConfirmDeleteSlideId] = useState<string | null>(null);
  const [confirmResetTheme, setConfirmResetTheme] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  const [newSlideDraft, setNewSlideDraft] = useState<{
    imageUrl: string;
    title: string;
    subtitle: string;
    ctaText: string;
    categoryFilter: string;
  }>({
    imageUrl: '',
    title: '',
    subtitle: '',
    ctaText: 'Shop Collection',
    categoryFilter: 'All',
  });

  const slides = sanitizeHeroSlides(storeSettings.heroSlides, DEFAULT_HERO_SLIDES);
  const enabledSlides = slides.filter((s) => s.enabled);
  const safePreviewSlide =
    enabledSlides[previewSlideIndex % Math.max(1, enabledSlides.length)] ||
    slides[0] ||
    DEFAULT_HERO_SLIDES[0];

  const activeThemeObj = resolveThemeById(activeThemeId || storeSettings.themeId || 'burgundy');
  const currentAppearance = storeSettings.defaultAppearance || 'light';

  const updateField = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    onChangeSettings({
      ...storeSettings,
      [key]: value,
    });
  };

  // --- AREA A: HOMEPAGE SLIDESHOW HANDLERS ---
  const updateSlides = (nextSlides: HeroSlide[]) => {
    const normalized = nextSlides.map((s, idx) => ({
      ...s,
      order: idx,
      overlayOpacity: typeof s.overlayOpacity === 'number' ? s.overlayOpacity : 65,
    }));
    onChangeSettings({
      ...storeSettings,
      heroSlides: normalized,
    });
  };

  const handleSlideChange = (
    slideId: string,
    field: keyof HeroSlide,
    value: string | boolean | number
  ) => {
    const next = slides.map((s) => {
      if (s.id !== slideId) return s;
      const updated = { ...s, [field]: value };
      if (field === 'categoryFilter') {
        updated.ctaLink = '#shop';
      }
      return updated;
    });
    updateSlides(next);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = reorderHeroSlides(slides, index, targetIndex);
    updateSlides(reordered);
  };

  const handleRemoveSlideConfirmed = (slideId: string) => {
    if (slides.length <= 1) {
      onBanner({
        type: 'error',
        message: 'Your homepage needs at least one cover slide.',
      });
      setConfirmDeleteSlideId(null);
      return;
    }
    const remaining = slides.filter((s) => s.id !== slideId);
    if (!remaining.some((s) => s.enabled) && remaining.length > 0) {
      remaining[0].enabled = true;
    }
    updateSlides(remaining);
    setConfirmDeleteSlideId(null);
    onBanner({
      type: 'info',
      message: 'Slide removed. Tap "Save Changes" to update your store.',
    });
  };

  const handleSlideImageUpload = async (
    slideId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlideId(slideId);
    try {
      const uploadedUrl = await uploadImageDirect(file);
      if (slideId === 'new-slide') {
        setNewSlideDraft((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      } else {
        handleSlideChange(slideId, 'imageUrl', uploadedUrl);
      }
      onBanner({
        type: 'success',
        message: 'Cover photo uploaded! Tap "Save Changes" to publish.',
      });
    } catch {
      onBanner({
        type: 'error',
        message: 'Could not upload photo. Please try a smaller image.',
      });
    } finally {
      setUploadingSlideId(null);
      e.target.value = '';
    }
  };

  const handleAddSlide = () => {
    if (!newSlideDraft.imageUrl.trim()) {
      onBanner({
        type: 'error',
        message: 'Please upload a photo or paste an image link for the new slide.',
      });
      return;
    }
    if (!newSlideDraft.title.trim()) {
      onBanner({
        type: 'error',
        message: 'Please enter a heading for the new slide.',
      });
      return;
    }

    const created: HeroSlide = {
      id: `slide-${Date.now()}`,
      imageUrl: newSlideDraft.imageUrl.trim(),
      badge: 'Featured Collection',
      title: newSlideDraft.title.trim(),
      subtitle:
        newSlideDraft.subtitle.trim() ||
        'Handcrafted Indian silhouettes woven with artisanal detail.',
      ctaText: newSlideDraft.ctaText.trim() || 'Shop Collection',
      ctaLink: '#shop',
      categoryFilter: newSlideDraft.categoryFilter || 'All',
      enabled: true,
      order: slides.length,
      overlayOpacity: 65,
    };

    updateSlides([...slides, created]);
    setNewSlideDraft({
      imageUrl: '',
      title: '',
      subtitle: '',
      ctaText: 'Shop Collection',
      categoryFilter: 'All',
    });
    setIsAddingSlide(false);
    onBanner({
      type: 'success',
      message: 'New slide added! Tap "Save Changes" to publish it to your homepage.',
    });
  };

  // --- AREA B: COLORS & APPEARANCE HANDLERS ---
  const handleSelectThemeCard = (themeId: string) => {
    const themeObj = resolveThemeById(themeId);
    const nextSettings: StoreSettings = {
      ...storeSettings,
      themeId: themeObj.id,
      customColorsEnabled: false,
    };
    onChangeSettings(nextSettings);
    onSelectPresetTheme?.(themeObj.id, nextSettings.defaultAppearance || 'light');

    const effectiveMode =
      nextSettings.defaultAppearance === 'dark' ? 'dark' : 'light';
    applyThemeToDocument(themeObj, effectiveMode, nextSettings);
  };

  const handleSelectAppearanceMode = (mode: 'light' | 'dark' | 'system') => {
    const nextSettings: StoreSettings = {
      ...storeSettings,
      defaultAppearance: mode,
    };
    onChangeSettings(nextSettings);
    onSelectPresetTheme?.(activeThemeObj.id, mode);

    const isDark =
      mode === 'dark' ||
      (mode === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    applyThemeToDocument(activeThemeObj, isDark ? 'dark' : 'light', nextSettings);
  };

  const handleResetThemeToDefault = async () => {
    const defaultTheme = resolveThemeById('burgundy');
    const resetSettings: StoreSettings = {
      ...storeSettings,
      themeId: 'burgundy',
      defaultAppearance: 'light',
      customColorsEnabled: false,
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Plus Jakarta Sans',
      headingScale: 'standard',
      bodyScale: 'standard',
      borderRadiusStyle: 'rounded',
      buttonStyle: 'solid',
    };
    onChangeSettings(resetSettings);
    onSelectPresetTheme?.('burgundy', 'light');
    applyThemeToDocument(defaultTheme, 'light', resetSettings);
    setConfirmResetTheme(false);
    await onSaveSettings(undefined, resetSettings);
    onBanner({
      type: 'success',
      message: 'Colors & appearance reset to Default (Elegant Burgundy · Light Mode).',
    });
  };

  // --- AREA C: LOGO UPLOAD HANDLER ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const uploaded = await uploadImageDirect(file);
      updateField('logoUrl', uploaded);
      onBanner({
        type: 'success',
        message: 'Store logo uploaded! Tap "Save Changes" below.',
      });
    } catch {
      onBanner({
        type: 'error',
        message: 'Could not upload logo image. Please try another file.',
      });
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const AREAS: {
    id: CustomizeAreaId;
    label: string;
    shortDesc: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'homepage',
      label: 'Homepage',
      shortDesc: 'Hero cover photos, headings & buttons',
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      id: 'appearance',
      label: 'Colors & Appearance',
      shortDesc: '6 boutique color themes & light/dark mode',
      icon: <Palette className="w-4 h-4" />,
    },
    {
      id: 'info',
      label: 'Store Information',
      shortDesc: 'Name, logo, WhatsApp, address & policies',
      icon: <Store className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      {/* Header & 3 Simple Customization Areas Switcher */}
      <div
        className="p-4 sm:p-5 rounded-xl border space-y-4"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3
              className="font-serif text-xl sm:text-2xl font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              Customize Your Store
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Choose what you want to update below, then tap Save Changes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onCancelChanges && (
              <button
                type="button"
                onClick={onCancelChanges}
                className="px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSaveSettings(undefined, storeSettings)}
              className="px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase cursor-pointer disabled:opacity-50 shadow-sm"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--btn-text)',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* 3 Area Selector Cards (Easy to tap on mobile phone) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {AREAS.map((area) => {
            const active = activeArea === area.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setActiveArea(area.id)}
                className="p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3"
                style={{
                  backgroundColor: active ? 'var(--primary)' : 'var(--surface)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                  color: active ? 'var(--btn-text)' : 'var(--text-main)',
                }}
              >
                <div
                  className="p-2 rounded-lg shrink-0 mt-0.5"
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'var(--surface-elevated)',
                    color: active ? 'var(--btn-text)' : 'var(--primary)',
                  }}
                >
                  {area.icon}
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{area.label}</span>
                  <span
                    className="block text-[11px] leading-snug mt-0.5"
                    style={{
                      color: active ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                    }}
                  >
                    {area.shortDesc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* AREA A: HOMEPAGE (Hero Cover Images, Headings, Slideshow Mode & CTA)  */}
      {/* ===================================================================== */}
      {activeArea === 'homepage' && (
        <div key="homepage" className="space-y-6 animate-fadeIn">
          {/* 1. Live Homepage Banner Preview */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-3"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4
                  className="font-serif text-lg font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  Homepage Cover Preview
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  This is how your main banner looks at the top of the website.
                </p>
              </div>
              {enabledSlides.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {enabledSlides.map((s, idx) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPreviewSlideIndex(idx)}
                      className="px-2.5 py-1 rounded text-xs font-semibold border cursor-pointer"
                      style={{
                        backgroundColor:
                          previewSlideIndex % enabledSlides.length === idx
                            ? 'var(--primary)'
                            : 'var(--surface-elevated)',
                        color:
                          previewSlideIndex % enabledSlides.length === idx
                            ? 'var(--btn-text)'
                            : 'var(--text-main)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      Slide {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Preview Box */}
            <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border bg-neutral-900">
              <img
                src={safePreviewSlide.imageUrl}
                alt={safePreviewSlide.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(15,10,12,0.82) 0%, rgba(15,10,12,0.4) 55%, rgba(15,10,12,0.15) 100%)',
                }}
              />
              <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end text-white max-w-xl">
                {safePreviewSlide.badge && (
                  <span className="text-[11px] uppercase tracking-widest text-amber-200 font-semibold mb-1">
                    {safePreviewSlide.badge}
                  </span>
                )}
                <h5 className="font-serif text-xl sm:text-2xl font-semibold leading-tight">
                  {safePreviewSlide.title || 'Your Slide Heading'}
                </h5>
                <p className="text-xs sm:text-sm text-white/90 mt-1 line-clamp-2">
                  {safePreviewSlide.subtitle || 'Your short description appears here.'}
                </p>
                <div className="mt-3">
                  <span
                    className="inline-block px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--btn-text)',
                    }}
                  >
                    {safePreviewSlide.ctaText || 'Shop Collection'} →
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Automatic vs Manual Slideshow Mode */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-3"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                Slideshow Movement
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Choose whether slides change automatically or only when the customer taps next.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  onChangeSettings({
                    ...storeSettings,
                    heroAutoplay: true,
                    heroIntervalMs: 5000,
                  })
                }
                className="p-3.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer"
                style={{
                  backgroundColor:
                    storeSettings.heroAutoplay !== false
                      ? 'var(--surface-elevated)'
                      : 'var(--surface)',
                  borderColor:
                    storeSettings.heroAutoplay !== false ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <div
                  className="p-2.5 rounded-lg shrink-0"
                  style={{
                    backgroundColor:
                      storeSettings.heroAutoplay !== false ? 'var(--primary)' : 'var(--surface-elevated)',
                    color:
                      storeSettings.heroAutoplay !== false ? 'var(--btn-text)' : 'var(--text-muted)',
                  }}
                >
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <span
                    className="block text-xs font-semibold"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Automatic Slideshow (Recommended)
                  </span>
                  <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Smoothly changes slides every 5 seconds
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChangeSettings({
                    ...storeSettings,
                    heroAutoplay: false,
                  })
                }
                className="p-3.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer"
                style={{
                  backgroundColor:
                    storeSettings.heroAutoplay === false
                      ? 'var(--surface-elevated)'
                      : 'var(--surface)',
                  borderColor:
                    storeSettings.heroAutoplay === false ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <div
                  className="p-2.5 rounded-lg shrink-0"
                  style={{
                    backgroundColor:
                      storeSettings.heroAutoplay === false ? 'var(--primary)' : 'var(--surface-elevated)',
                    color:
                      storeSettings.heroAutoplay === false ? 'var(--btn-text)' : 'var(--text-muted)',
                  }}
                >
                  <Pause className="w-4 h-4" />
                </div>
                <div>
                  <span
                    className="block text-xs font-semibold"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Manual Slideshow
                  </span>
                  <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Changes only when customer swipes or taps arrows
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Manage Hero Slides */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4
                  className="font-serif text-lg font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  Homepage Hero Slides ({slides.length})
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Change cover photos, edit headings, reorder slides, or add a new slide.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingSlide(!isAddingSlide)}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingSlide ? 'Close New Slide Form' : 'Add New Slide'}</span>
              </button>
            </div>

            {/* Add New Slide Box */}
            {isAddingSlide && (
              <div
                className="p-4 sm:p-5 rounded-xl border-2 space-y-4"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--primary)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h5
                    className="font-serif text-base font-semibold"
                    style={{ color: 'var(--text-main)' }}
                  >
                    Add New Homepage Slide
                  </h5>
                  <button
                    type="button"
                    onClick={() => setIsAddingSlide(false)}
                    className="text-xs underline cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                      1. Cover Image *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <label
                        className="px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                          borderColor: 'var(--primary)',
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploadingSlideId === 'new-slide'
                            ? 'Uploading...'
                            : 'Upload Photo from Phone / Device'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSlideImageUpload('new-slide', e)}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        value={
                          newSlideDraft.imageUrl.startsWith('data:')
                            ? ''
                            : newSlideDraft.imageUrl
                        }
                        onChange={(e) =>
                          setNewSlideDraft((prev) => ({ ...prev, imageUrl: e.target.value }))
                        }
                        placeholder="Or paste an image link (https://...)"
                        className="flex-1 w-full p-2.5 rounded-lg border text-xs"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                      2. Slide Heading *
                    </label>
                    <input
                      type="text"
                      value={newSlideDraft.title}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="e.g. Festive Silk & Chanderi Edit"
                      className="w-full p-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                      3. Short Description
                    </label>
                    <input
                      type="text"
                      value={newSlideDraft.subtitle}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({ ...prev, subtitle: e.target.value }))
                      }
                      placeholder="e.g. Handpicked ethnic wear for weddings and celebrations."
                      className="w-full p-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                      4. Shopping Button Text
                    </label>
                    <input
                      type="text"
                      value={newSlideDraft.ctaText}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({ ...prev, ctaText: e.target.value }))
                      }
                      placeholder="e.g. Shop Collection"
                      className="w-full p-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-main)' }}>
                      5. Where Button Takes Customer
                    </label>
                    <select
                      value={newSlideDraft.categoryFilter}
                      onChange={(e) =>
                        setNewSlideDraft((prev) => ({
                          ...prev,
                          categoryFilter: e.target.value,
                        }))
                      }
                      className="w-full p-2.5 rounded-lg border text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      {DESTINATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
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
                    type="button"
                    onClick={handleAddSlide}
                    className="px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--btn-text)',
                    }}
                  >
                    Add Slide to Homepage
                  </button>
                </div>
              </div>
            )}

            {/* Existing Slides List */}
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="p-4 sm:p-5 rounded-xl border space-y-4"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: slide.enabled ? 'var(--border)' : 'var(--warning-border)',
                    opacity: slide.enabled ? 1 : 0.78,
                  }}
                >
                  {/* Slide Top Bar: Number, Move Up/Down, Show/Hide, Remove */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'var(--btn-text)',
                        }}
                      >
                        Slide {index + 1}
                      </span>
                      <span
                        className="text-xs font-semibold truncate max-w-[180px] sm:max-w-xs"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {slide.title || 'Untitled Slide'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveSlide(index, 'up')}
                        aria-label={`Move Slide ${index + 1} up`}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>Up</span>
                      </button>

                      <button
                        type="button"
                        disabled={index === slides.length - 1}
                        onClick={() => handleMoveSlide(index, 'down')}
                        aria-label={`Move Slide ${index + 1} down`}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>Down</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSlideChange(slide.id, 'enabled', !slide.enabled)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer"
                        style={{
                          backgroundColor: slide.enabled
                            ? 'var(--success-bg)'
                            : 'var(--surface-elevated)',
                          borderColor: slide.enabled
                            ? 'var(--success-border)'
                            : 'var(--border)',
                          color: slide.enabled ? 'var(--success-text)' : 'var(--text-muted)',
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

                      {confirmDeleteSlideId === slide.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveSlideConfirmed(slide.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                          >
                            Confirm Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteSlideId(null)}
                            className="px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer"
                            style={{
                              backgroundColor: 'var(--surface-elevated)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-main)',
                            }}
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSlideId(slide.id)}
                          aria-label={`Remove Slide ${index + 1}`}
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer"
                          style={{
                            backgroundColor: 'var(--error-bg)',
                            borderColor: 'var(--error-border)',
                            color: 'var(--error-text)',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slide Content Form */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Cover Photo Thumbnail + Change Photo Button */}
                    <div className="md:col-span-4 space-y-2">
                      <div
                        className="relative w-full h-36 rounded-lg overflow-hidden border bg-neutral-100"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <img
                          src={slide.imageUrl}
                          alt={slide.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <label
                        className="w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          borderColor: 'var(--border)',
                          color: 'var(--primary)',
                        }}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {uploadingSlideId === slide.id ? 'Uploading...' : 'Change Cover Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSlideImageUpload(slide.id, e)}
                          className="hidden"
                        />
                      </label>

                      <input
                        type="url"
                        aria-label={`Slide ${index + 1} image link`}
                        value={slide.imageUrl.startsWith('data:') ? '' : slide.imageUrl}
                        onChange={(e) => handleSlideChange(slide.id, 'imageUrl', e.target.value)}
                        placeholder="Or paste image link..."
                        className="w-full p-2 rounded-lg border text-[11px]"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-main)',
                        }}
                      />
                    </div>

                    {/* Slide Heading, Description & Button Controls */}
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Slide Heading
                        </label>
                        <input
                          type="text"
                          value={slide.title}
                          onChange={(e) => handleSlideChange(slide.id, 'title', e.target.value)}
                          placeholder="e.g. Handcrafted Indian Silhouettes"
                          className="w-full p-2.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Slide Description
                        </label>
                        <textarea
                          rows={2}
                          value={slide.subtitle}
                          onChange={(e) => handleSlideChange(slide.id, 'subtitle', e.target.value)}
                          placeholder="Short description shown under the heading"
                          className="w-full p-2.5 rounded-lg border text-xs leading-relaxed"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Shopping Button Text
                        </label>
                        <input
                          type="text"
                          value={slide.ctaText}
                          onChange={(e) => handleSlideChange(slide.id, 'ctaText', e.target.value)}
                          placeholder="e.g. Explore Kurtis"
                          className="w-full p-2.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          className="block text-xs font-semibold mb-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          Button Destination
                        </label>
                        <select
                          value={slide.categoryFilter || 'All'}
                          onChange={(e) =>
                            handleSlideChange(slide.id, 'categoryFilter', e.target.value)
                          }
                          className="w-full p-2.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        >
                          {DESTINATION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AREA B: COLORS & APPEARANCE (6 Preset Themes + Light/Dark + Preview)  */}
      {/* ===================================================================== */}
      {activeArea === 'appearance' && (
        <div key="appearance" className="space-y-6 animate-fadeIn">
          {/* 1. Six Preset Ethnic Boutique Themes */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4
                  className="font-serif text-lg font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  Choose Store Color Theme
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tap any theme card below to immediately update your website colors.
                </p>
              </div>

              {confirmResetTheme ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--warning-text)' }}>
                    Reset colors to Burgundy default?
                  </span>
                  <button
                    type="button"
                    onClick={handleResetThemeToDefault}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'var(--btn-text)',
                    }}
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetTheme(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetTheme(true)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {COORDINATED_THEMES.map((theme) => {
                const isSelected = activeThemeObj.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectThemeCard(theme.id)}
                    className="p-4 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                    style={{
                      backgroundColor: theme.swatches.bg,
                      borderColor: isSelected ? theme.swatches.primary : '#e5ded8',
                    }}
                  >
                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-serif text-base font-bold"
                          style={{ color: theme.light.textMain }}
                        >
                          {theme.name}
                        </span>
                        {isSelected && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                            style={{
                              backgroundColor: theme.swatches.primary,
                              color: '#ffffff',
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </div>

                      <p
                        className="text-xs leading-snug"
                        style={{ color: theme.light.textSecondary }}
                      >
                        {theme.description}
                      </p>
                    </div>

                    {/* Visual Color Swatches + Sample Button Preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/10 w-full">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-6 h-6 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.primary }}
                          title="Main brand color"
                        />
                        <span
                          className="w-6 h-6 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.accent }}
                          title="Gold/Accent color"
                        />
                        <span
                          className="w-6 h-6 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.secondary }}
                          title="Soft card highlight"
                        />
                      </div>

                      <span
                        className="px-2.5 py-1 rounded text-[10px] font-semibold"
                        style={{
                          backgroundColor: theme.swatches.primary,
                          color: '#ffffff',
                        }}
                      >
                        {isSelected ? 'Selected' : 'Apply Theme'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Light / Dark Mode Appearance */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-3"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                Light or Dark Background
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Choose a bright daytime look, a rich dark evening look, or match the customer&apos;s phone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'light' as const,
                  label: 'Light Mode',
                  desc: 'Warm, bright boutique background',
                  icon: <Sun className="w-4 h-4" />,
                },
                {
                  id: 'dark' as const,
                  label: 'Dark Mode',
                  desc: 'Rich, dark luxury background',
                  icon: <Moon className="w-4 h-4" />,
                },
                {
                  id: 'system' as const,
                  label: 'Match Customer Phone',
                  desc: 'Adjusts automatically to device',
                  icon: <Monitor className="w-4 h-4" />,
                },
              ].map((opt) => {
                const active = currentAppearance === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectAppearanceMode(opt.id)}
                    className="p-3.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--surface-elevated)' : 'var(--surface)',
                      borderColor: active ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    <div
                      className="p-2 rounded-lg shrink-0"
                      style={{
                        backgroundColor: active ? 'var(--primary)' : 'var(--surface-elevated)',
                        color: active ? 'var(--btn-text)' : 'var(--text-main)',
                      }}
                    >
                      {opt.icon}
                    </div>
                    <div>
                      <span
                        className="block text-xs font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {opt.label}
                      </span>
                      <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {opt.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Live Theme Preview */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-3"
            style={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Live Color Preview ({activeThemeObj.name})
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
                Active on Storefront
              </span>
            </div>

            <div
              className="p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <span
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  {storeSettings.storeName || 'Indian Ishq Collection'}
                </span>
                <h5
                  className="font-serif text-lg font-semibold mt-0.5"
                  style={{ color: 'var(--text-main)' }}
                >
                  Handcrafted Festive Kurta Set
                </h5>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Pure Chanderi Silk · ₹1,899
                </p>
              </div>
              <span
                className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider shrink-0"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                Add to Bag
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AREA C: STORE INFORMATION (Simple Forms with Clear Labels & Examples) */}
      {/* ===================================================================== */}
      {activeArea === 'info' && (
        <div key="info" className="space-y-5 animate-fadeIn">
          {/* 1. Store Name, Tagline & Logo */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                1. Store Name, Tagline & Logo
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Shown at the top of your website and in the footer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cust-store-name"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Store Name
                </label>
                <input
                  id="cust-store-name"
                  type="text"
                  value={storeSettings.storeName}
                  onChange={(e) => updateField('storeName', e.target.value)}
                  placeholder="Example: Indian Ishq Collection"
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="cust-store-tagline"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Tagline
                </label>
                <input
                  id="cust-store-tagline"
                  type="text"
                  value={storeSettings.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="Example: Timeless Indian silhouettes, woven with ishq."
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            {/* Store Logo */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <label
                htmlFor="cust-logo-url"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-main)' }}
              >
                Store Logo (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {storeSettings.logoUrl && (
                  <div className="flex items-center gap-2 shrink-0">
                    <img
                      src={storeSettings.logoUrl}
                      alt="Store logo"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <button
                      type="button"
                      onClick={() => updateField('logoUrl', '')}
                      className="text-xs underline cursor-pointer"
                      style={{ color: 'var(--error-text)' }}
                    >
                      Remove Logo
                    </button>
                  </div>
                )}

                <label
                  className="px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                    color: 'var(--primary)',
                  }}
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>

                <input
                  id="cust-logo-url"
                  type="url"
                  value={storeSettings.logoUrl.startsWith('data:') ? '' : storeSettings.logoUrl}
                  onChange={(e) => updateField('logoUrl', e.target.value)}
                  placeholder="Or paste logo image link (https://...)"
                  className="flex-1 w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Phone, WhatsApp, Address & Google Maps */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                2. Contact Details & Boutique Location
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Helps customers call, WhatsApp, or visit your store.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cust-phone"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Phone Number
                </label>
                <input
                  id="cust-phone"
                  type="text"
                  value={storeSettings.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="Example: +91 98765 43210"
                  className="w-full p-2.5 rounded-lg border text-xs tabular-nums"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="cust-whatsapp"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Merchant WhatsApp Number
                </label>
                <input
                  id="cust-whatsapp"
                  type="text"
                  value={storeSettings.whatsapp}
                  onChange={(e) => updateField('whatsapp', e.target.value)}
                  placeholder="e.g. 98765 43210 (or +91)"
                  className="w-full p-2.5 rounded-lg border text-xs tabular-nums"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Default India (+91) country code. Saved in Firebase store settings.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="cust-address"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Business Address
                </label>
                <input
                  id="cust-address"
                  type="text"
                  value={storeSettings.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Example: Shop 14, Johari Bazar, Pink City, Jaipur, Rajasthan 302003"
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="cust-maps"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Google Maps Link
                </label>
                <input
                  id="cust-maps"
                  type="url"
                  value={storeSettings.mapsUrl}
                  onChange={(e) => updateField('mapsUrl', e.target.value)}
                  placeholder="Example: https://maps.google.com/?q=Johari+Bazar+Jaipur"
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. Delivery Information & Return Policy */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                3. Delivery & Return Policy
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Shown on product pages and in the website footer so customers can shop with confidence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cust-delivery"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Delivery Information
                </label>
                <textarea
                  id="cust-delivery"
                  rows={3}
                  value={storeSettings.deliveryPolicy}
                  onChange={(e) => updateField('deliveryPolicy', e.target.value)}
                  placeholder="Example: Free delivery across India on orders above ₹1,999. Dispatched within 24–48 hours."
                  className="w-full p-2.5 rounded-lg border text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="cust-returns"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Return and Exchange Policy
                </label>
                <textarea
                  id="cust-returns"
                  rows={3}
                  value={storeSettings.returnPolicy}
                  onChange={(e) => updateField('returnPolicy', e.target.value)}
                  placeholder="Example: Easy 7-day returns and size exchanges on unworn items with original tags."
                  className="w-full p-2.5 rounded-lg border text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 4. Social Media Links */}
          <div
            className="p-4 sm:p-5 rounded-xl border space-y-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                4. Social Media Links (Optional)
              </h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Paste your social profile links so customers can follow your boutique.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="cust-instagram"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Instagram Link
                </label>
                <input
                  id="cust-instagram"
                  type="url"
                  value={storeSettings.instagramUrl}
                  onChange={(e) => updateField('instagramUrl', e.target.value)}
                  placeholder="Example: https://instagram.com/indianishq"
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="cust-facebook"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Facebook Link
                </label>
                <input
                  id="cust-facebook"
                  type="url"
                  value={storeSettings.facebookUrl}
                  onChange={(e) => updateField('facebookUrl', e.target.value)}
                  placeholder="Example: https://facebook.com/indianishq"
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="cust-twitter"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--text-main)' }}
                >
                  Twitter / X Link
                </label>
                <input
                  id="cust-twitter"
                  type="url"
                  value={storeSettings.twitterUrl}
                  onChange={(e) => updateField('twitterUrl', e.target.value)}
                  placeholder="Example: https://x.com/indianishq"
                  className="w-full p-2.5 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save & Cancel Bar */}
      <div
        className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          All changes are saved to your live store immediately when you tap Save Changes.
        </span>
        <div className="flex items-center gap-2.5 ml-auto">
          {onCancelChanges && (
            <button
              type="button"
              onClick={onCancelChanges}
              className="px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSaveSettings(undefined, storeSettings)}
            className="px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow-sm"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--btn-text)',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
