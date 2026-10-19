import React, { useState } from 'react';
import {
  type StoreSettings,
  type HomepageSectionConfig,
  type StoreTestimonial,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_CUSTOM_COLORS,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_PROMO_BANNER,
  DEFAULT_TESTIMONIALS,
  sanitizeHomepageSections,
  reorderHomepageSections,
} from '../utils/ecommerce';
import { COORDINATED_THEMES, resolveThemeById } from '../utils/themes';
import { uploadImageDirect } from '../services/api';
import { HeroSlideshowManager } from './HeroSlideshowManager';
import {
  Palette,
  Layout,
  Sparkles,
  ShoppingBag,
  PanelBottom,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
  Upload,
  Plus,
  Trash2,
  Type,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface StoreCustomizationProps {
  storeSettings: StoreSettings;
  isSaving: boolean;
  onChangeSettings: (updated: StoreSettings) => void;
  onSaveSettings: (e?: React.FormEvent, customSettings?: StoreSettings) => Promise<void>;
  onSelectPresetTheme?: (themeId: string) => void;
  onBanner: (banner: { type: 'success' | 'error' | 'info'; message: string }) => void;
}

type CustomizationSubTab = 'brand' | 'layout' | 'slideshow' | 'catalog' | 'headerFooter';

export const StoreCustomization: React.FC<StoreCustomizationProps> = ({
  storeSettings,
  isSaving,
  onChangeSettings,
  onSaveSettings,
  onSelectPresetTheme,
  onBanner,
}) => {
  const [subTab, setSubTab] = useState<CustomizationSubTab>('brand');
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [newTestimonial, setNewTestimonial] = useState<{
    customerName: string;
    location: string;
    quote: string;
    productBought: string;
    rating: number;
  }>({
    customerName: '',
    location: '',
    quote: '',
    productBought: '',
    rating: 5,
  });

  const sections = sanitizeHomepageSections(
    storeSettings.homepageSections,
    DEFAULT_HOMEPAGE_SECTIONS
  );
  const customColors = storeSettings.customColors || DEFAULT_CUSTOM_COLORS;
  const promoBanner = storeSettings.promoBanner || DEFAULT_PROMO_BANNER;
  const testimonials = storeSettings.testimonials || DEFAULT_TESTIMONIALS;

  const handleAssetUpload = async (
    target: 'logo' | 'favicon' | 'promo',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAsset(target);
    try {
      const dataUrl = await uploadImageDirect(file);
      if (target === 'logo') {
        onChangeSettings({ ...storeSettings, logoUrl: dataUrl });
      } else if (target === 'favicon') {
        onChangeSettings({ ...storeSettings, faviconUrl: dataUrl });
      } else if (target === 'promo') {
        onChangeSettings({
          ...storeSettings,
          promoBanner: { ...promoBanner, imageUrl: dataUrl },
        });
      }
      onBanner({
        type: 'info',
        message: 'Image uploaded! Click "Save Customization" to publish changes.',
      });
    } catch (err: unknown) {
      onBanner({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload image.',
      });
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const nextSections = reorderHomepageSections(sections, index, targetIndex);
    onChangeSettings({
      ...storeSettings,
      homepageSections: nextSections,
    });
  };

  const handleToggleSection = (sectionId: HomepageSectionConfig['id']) => {
    const enabledCount = sections.filter((s) => s.enabled).length;
    const targetSec = sections.find((s) => s.id === sectionId);
    if (targetSec?.enabled && enabledCount <= 1) {
      onBanner({
        type: 'error',
        message: 'At least one homepage section must remain visible.',
      });
      return;
    }
    const nextSections = sections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    onChangeSettings({
      ...storeSettings,
      homepageSections: nextSections,
    });
  };

  const handleResetSections = () => {
    onChangeSettings({
      ...storeSettings,
      homepageSections: DEFAULT_HOMEPAGE_SECTIONS.map((s, idx) => ({ ...s, order: idx })),
    });
    onBanner({
      type: 'info',
      message: 'Restored default homepage section order. Click "Save Customization" to apply.',
    });
  };

  const handleAddTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.customerName.trim() || !newTestimonial.quote.trim()) {
      onBanner({
        type: 'error',
        message: 'Please enter both the customer name and their review quote.',
      });
      return;
    }
    const created: StoreTestimonial = {
      id: `test-${Date.now()}`,
      customerName: newTestimonial.customerName.trim(),
      location: newTestimonial.location.trim() || 'India',
      quote: newTestimonial.quote.trim(),
      productBought: newTestimonial.productBought.trim(),
      rating: newTestimonial.rating || 5,
    };
    onChangeSettings({
      ...storeSettings,
      testimonials: [...testimonials, created],
    });
    setNewTestimonial({
      customerName: '',
      location: '',
      quote: '',
      productBought: '',
      rating: 5,
    });
    onBanner({
      type: 'success',
      message: 'Customer testimonial added! Enable the Testimonials section above and click Save.',
    });
  };

  const handleDeleteTestimonial = (id: string) => {
    onChangeSettings({
      ...storeSettings,
      testimonials: testimonials.filter((t) => t.id !== id),
    });
  };

  const activePreset = resolveThemeById(storeSettings.themeId);
  const previewPrimary = storeSettings.customColorsEnabled
    ? customColors.primary
    : activePreset.light.primary;
  const previewAccent = storeSettings.customColorsEnabled
    ? customColors.accent
    : activePreset.light.accent;
  const previewBg = storeSettings.customColorsEnabled ? customColors.bg : activePreset.light.bg;
  const previewSurface = storeSettings.customColorsEnabled
    ? customColors.surface
    : activePreset.light.surface;
  const previewText = storeSettings.customColorsEnabled
    ? customColors.textMain
    : activePreset.light.textMain;
  const previewBtnBg = storeSettings.customColorsEnabled
    ? customColors.buttonBg
    : activePreset.light.primary;
  const previewBtnText = storeSettings.customColorsEnabled
    ? customColors.buttonText
    : activePreset.light.btnText;
  const previewBorder = storeSettings.customColorsEnabled
    ? customColors.border
    : activePreset.light.border;

  const previewRadius =
    storeSettings.borderRadiusStyle === 'sharp'
      ? '0px'
      : storeSettings.borderRadiusStyle === 'subtle'
      ? '6px'
      : storeSettings.borderRadiusStyle === 'pill'
      ? '20px'
      : '12px';

  const previewBtnRadius =
    storeSettings.buttonStyle === 'pill' || storeSettings.borderRadiusStyle === 'pill'
      ? '9999px'
      : storeSettings.borderRadiusStyle === 'sharp'
      ? '0px'
      : '8px';

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      {/* Top Header & Sub-Navigation Bar */}
      <div
        className="p-4 sm:p-6 rounded-xl border space-y-4 min-w-0"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                No-Code Storefront Studio
              </span>
            </div>
            <h3
              className="font-serif text-xl sm:text-2xl font-bold mt-0.5"
              style={{ color: 'var(--text-main)' }}
            >
              Store Customization & Layout Studio
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Customize brand identity, colors, typography, homepage section ordering, hero
              slideshow, and catalog display rules without editing source code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onChangeSettings({ ...DEFAULT_STORE_SETTINGS });
                onBanner({
                  type: 'info',
                  message:
                    'Loaded default Indian Ishq Collection customization. Click "Save Customization" to publish.',
                });
              }}
              className="px-3.5 py-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
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
              <span>{isSaving ? 'Saving...' : 'Save Customization'}</span>
            </button>
          </div>
        </div>

        {/* 5 Organized Sub-Section Pills */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Store customization sections"
        >
          {[
            { id: 'brand', label: 'A. Brand, Colors & Fonts', icon: Palette },
            { id: 'layout', label: 'B. Homepage Layout & Sections', icon: Layout },
            { id: 'slideshow', label: 'C. Hero Slideshow', icon: Sparkles },
            { id: 'catalog', label: 'D. Product & Catalog Display', icon: ShoppingBag },
            { id: 'headerFooter', label: 'E. Header & Footer Controls', icon: PanelBottom },
          ].map((item) => {
            const Icon = item.icon;
            const active = subTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(item.id as CustomizationSubTab)}
                className="px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                style={{
                  backgroundColor: active ? 'var(--primary)' : 'var(--surface-elevated)',
                  color: active ? 'var(--btn-text)' : 'var(--text-main)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SUB-SECTION A: BRAND IDENTITY, COLORS, TYPOGRAPHY & LIVE PREVIEW
         ===================================================================== */}
      {subTab === 'brand' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
          {/* Left 7 Cols: Controls */}
          <div className="lg:col-span-7 space-y-6 min-w-0">
            {/* 1. Brand Identity, Logo & Favicon */}
            <div
              className="p-5 rounded-xl border space-y-4 min-w-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                1. Brand Identity, Logo & Favicon
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label
                    htmlFor="cust-store-name"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Store / Brand Name
                  </label>
                  <input
                    id="cust-store-name"
                    type="text"
                    value={storeSettings.storeName}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, storeName: e.target.value })
                    }
                    className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <label
                    htmlFor="cust-tagline"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Brand Tagline
                  </label>
                  <input
                    id="cust-tagline"
                    type="text"
                    value={storeSettings.tagline}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, tagline: e.target.value })
                    }
                    className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="cust-brand-desc"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Brand Description
                </label>
                <textarea
                  id="cust-brand-desc"
                  rows={2}
                  value={storeSettings.brandDescription}
                  onChange={(e) =>
                    onChangeSettings({ ...storeSettings, brandDescription: e.target.value })
                  }
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs leading-relaxed"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              {/* Logo Upload & Favicon Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-2 min-w-0">
                  <label
                    htmlFor="cust-logo-url"
                    className="block text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Brand Logo (Header & Footer)
                  </label>
                  <input
                    id="cust-logo-url"
                    type="url"
                    value={storeSettings.logoUrl.startsWith('data:') ? '' : storeSettings.logoUrl}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, logoUrl: e.target.value })
                    }
                    placeholder="https://... or upload below"
                    className="w-full min-w-0 p-2 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="cust-logo-upload"
                      className="flex-1 p-2 border rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                      <span className="truncate">
                        {uploadingAsset === 'logo' ? 'Uploading...' : 'Upload Logo'}
                      </span>
                      <input
                        id="cust-logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetUpload('logo', e)}
                        className="sr-only"
                      />
                    </label>
                    {storeSettings.logoUrl && (
                      <button
                        type="button"
                        onClick={() => onChangeSettings({ ...storeSettings, logoUrl: '' })}
                        className="px-2.5 py-2 rounded-lg border text-xs cursor-pointer"
                        style={{
                          backgroundColor: 'var(--error-bg)',
                          borderColor: 'var(--error-border)',
                          color: 'var(--error-text)',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 min-w-0">
                  <label
                    htmlFor="cust-favicon-url"
                    className="block text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Browser Tab Favicon (Optional)
                  </label>
                  <input
                    id="cust-favicon-url"
                    type="url"
                    value={
                      storeSettings.faviconUrl?.startsWith('data:')
                        ? ''
                        : storeSettings.faviconUrl || ''
                    }
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, faviconUrl: e.target.value })
                    }
                    placeholder="https://... or upload icon"
                    className="w-full min-w-0 p-2 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="cust-favicon-upload"
                      className="flex-1 p-2 border rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                      <span className="truncate">
                        {uploadingAsset === 'favicon' ? 'Uploading...' : 'Upload Favicon'}
                      </span>
                      <input
                        id="cust-favicon-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetUpload('favicon', e)}
                        className="sr-only"
                      />
                    </label>
                    {storeSettings.faviconUrl && (
                      <button
                        type="button"
                        onClick={() => onChangeSettings({ ...storeSettings, faviconUrl: '' })}
                        className="px-2.5 py-2 rounded-lg border text-xs cursor-pointer"
                        style={{
                          backgroundColor: 'var(--error-bg)',
                          borderColor: 'var(--error-border)',
                          color: 'var(--error-text)',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Theme Palette Presets & Custom Color Tokens */}
            <div
              className="p-5 rounded-xl border space-y-4 min-w-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  className="font-serif text-lg font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  2. Curated Theme Palettes & Custom Colors
                </h4>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Applies across all pages & modals
                </span>
              </div>

              {/* 6 Curated Palette Swatches */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COORDINATED_THEMES.map((theme) => {
                  const selected = storeSettings.themeId === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        onChangeSettings({
                          ...storeSettings,
                          themeId: theme.id,
                          customColors: {
                            primary: theme.light.primary,
                            accent: theme.light.accent,
                            bg: theme.light.bg,
                            surface: theme.light.surface,
                            textMain: theme.light.textMain,
                            buttonBg: theme.light.primary,
                            buttonText: theme.light.btnText,
                            border: theme.light.border,
                          },
                        });
                        onSelectPresetTheme?.(theme.id);
                      }}
                      className="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 min-w-0"
                      style={{
                        backgroundColor: selected ? 'var(--surface-elevated)' : 'var(--surface)',
                        borderColor: selected ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {theme.name}
                        </span>
                        {selected && (
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.primary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.accent }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.secondary }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/15"
                          style={{ backgroundColor: theme.swatches.bg }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Default Appearance Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <label
                    htmlFor="cust-appearance-mode"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Default Theme Mode for Visitors
                  </label>
                  <select
                    id="cust-appearance-mode"
                    value={storeSettings.defaultAppearance || 'system'}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        defaultAppearance: e.target.value as 'system' | 'light' | 'dark',
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="system">Auto (Match Visitor Device Light/Dark)</option>
                    <option value="light">Light Mode Default</option>
                    <option value="dark">Dark Mode Default</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label
                    className="w-full p-2.5 rounded-lg border flex items-center gap-2.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-elevated)',
                      borderColor: storeSettings.customColorsEnabled
                        ? 'var(--primary)'
                        : 'var(--border)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={storeSettings.customColorsEnabled}
                      onChange={(e) =>
                        onChangeSettings({
                          ...storeSettings,
                          customColorsEnabled: e.target.checked,
                        })
                      }
                      className="accent-current w-4 h-4"
                    />
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                      Enable Custom Hex Color Overrides
                    </span>
                  </label>
                </div>
              </div>

              {/* Fine-Grained Color Pickers */}
              {storeSettings.customColorsEnabled && (
                <div
                  className="p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {(
                    [
                      { key: 'primary', label: 'Brand / Primary' },
                      { key: 'accent', label: 'Accent / Gold' },
                      { key: 'bg', label: 'Page Background' },
                      { key: 'surface', label: 'Card Surface' },
                      { key: 'textMain', label: 'Primary Text' },
                      { key: 'buttonBg', label: 'Button Fill' },
                      { key: 'buttonText', label: 'Button Text' },
                      { key: 'border', label: 'Card Border' },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="min-w-0">
                      <label
                        htmlFor={`color-${item.key}`}
                        className="block text-[11px] font-semibold uppercase mb-1 truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {item.label}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          id={`color-${item.key}`}
                          type="color"
                          value={customColors[item.key]}
                          onChange={(e) =>
                            onChangeSettings({
                              ...storeSettings,
                              customColors: {
                                ...customColors,
                                [item.key]: e.target.value,
                              },
                            })
                          }
                          className="w-8 h-8 rounded border cursor-pointer shrink-0 p-0.5 bg-transparent"
                          style={{ borderColor: 'var(--border)' }}
                        />
                        <input
                          type="text"
                          value={customColors[item.key]}
                          aria-label={`${item.label} hex code`}
                          onChange={(e) =>
                            onChangeSettings({
                              ...storeSettings,
                              customColors: {
                                ...customColors,
                                [item.key]: e.target.value,
                              },
                            })
                          }
                          className="w-full min-w-0 p-1.5 border rounded text-[11px] font-mono"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text-main)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Typography, Font Sizes, Border Radius & Button Styles */}
            <div
              className="p-5 rounded-xl border space-y-4 min-w-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <h4
                  className="font-serif text-lg font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  3. Typography, Border Radius & Button Styles
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cust-heading-font"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Heading Font Family
                  </label>
                  <select
                    id="cust-heading-font"
                    value={storeSettings.headingFont}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        headingFont: e.target.value as StoreSettings['headingFont'],
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="Cormorant Garamond">Cormorant Garamond (Editorial Serif)</option>
                    <option value="Playfair Display">Playfair Display (Luxury Couture Serif)</option>
                    <option value="Georgia">Georgia (Classic Heritage Serif)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean Sans)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cust-body-font"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Body Font Family
                  </label>
                  <select
                    id="cust-body-font"
                    value={storeSettings.bodyFont}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        bodyFont: e.target.value as StoreSettings['bodyFont'],
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Geometric)</option>
                    <option value="Noto Sans">Noto Sans (Crisp Humanist Sans)</option>
                    <option value="System UI">System UI (Native Fast Sans)</option>
                    <option value="Georgia">Georgia (Classic Editorial Serif)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cust-heading-scale"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Heading Font Size Scale
                  </label>
                  <select
                    id="cust-heading-scale"
                    value={storeSettings.headingScale}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        headingScale: e.target.value as StoreSettings['headingScale'],
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="compact">Compact & Refined</option>
                    <option value="standard">Standard Editorial (Recommended)</option>
                    <option value="large">Large & Dramatic</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cust-body-scale"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Body Text Size Scale
                  </label>
                  <select
                    id="cust-body-scale"
                    value={storeSettings.bodyScale}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        bodyScale: e.target.value as StoreSettings['bodyScale'],
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="compact">Compact (14px Base)</option>
                    <option value="standard">Standard (16px Base)</option>
                    <option value="large">Comfortable Reading (17px Base)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cust-border-radius"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Card & Surface Border Radius
                  </label>
                  <select
                    id="cust-border-radius"
                    value={storeSettings.borderRadiusStyle}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        borderRadiusStyle: e.target.value as StoreSettings['borderRadiusStyle'],
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="sharp">Sharp Editorial (0px)</option>
                    <option value="subtle">Subtle Tailored (6px)</option>
                    <option value="rounded">Soft Boutique Rounded (12px)</option>
                    <option value="pill">Generous Curved (20px)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cust-button-style"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Primary CTA Button Style
                  </label>
                  <select
                    id="cust-button-style"
                    value={storeSettings.buttonStyle}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        buttonStyle: e.target.value as StoreSettings['buttonStyle'],
                      })
                    }
                    className="w-full p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="solid">Solid Filled Button</option>
                    <option value="pill">Rounded Pill Capsule</option>
                    <option value="outline">Architectural Outline</option>
                    <option value="soft">Soft Tinted Surface</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Real-Time Visual Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4 min-w-0">
            <div
              data-testid="customization-live-preview"
              className="p-5 rounded-xl border space-y-4 shadow-sm overflow-hidden"
              style={{
                backgroundColor: previewBg,
                borderColor: previewBorder,
                color: previewText,
              }}
            >
              <div
                className="flex items-center justify-between pb-3 border-b text-[11px] font-semibold uppercase tracking-widest"
                style={{ borderColor: previewBorder, color: previewAccent }}
              >
                <span>Live Brand & Token Preview</span>
                <span>{storeSettings.headingFont}</span>
              </div>

              {/* Simulated Store Header */}
              <div
                className="p-3 border flex items-center justify-between gap-2"
                style={{
                  backgroundColor: previewSurface,
                  borderColor: previewBorder,
                  borderRadius: previewRadius,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {storeSettings.logoUrl && (
                    <img
                      src={storeSettings.logoUrl}
                      alt="Preview logo"
                      className="w-7 h-7 object-cover rounded shrink-0"
                    />
                  )}
                  <span
                    className="font-bold text-base truncate"
                    style={{
                      fontFamily: `'${storeSettings.headingFont}', Georgia, serif`,
                      color: previewPrimary,
                    }}
                  >
                    {storeSettings.storeName || 'Indian Ishq Collection'}
                  </span>
                </div>
                <span
                  className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider shrink-0"
                  style={{
                    backgroundColor: previewBtnBg,
                    color: previewBtnText,
                    borderRadius: previewBtnRadius,
                  }}
                >
                  Bag (2)
                </span>
              </div>

              {/* Simulated Editorial Card */}
              <div
                className="p-4 border space-y-3"
                style={{
                  backgroundColor: previewSurface,
                  borderColor: previewBorder,
                  borderRadius: previewRadius,
                  fontFamily: `'${storeSettings.bodyFont}', sans-serif`,
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest block"
                  style={{ color: previewAccent }}
                >
                  Festive Edit · Chanderi Silk
                </span>
                <h5
                  className="text-xl font-semibold leading-snug"
                  style={{
                    fontFamily: `'${storeSettings.headingFont}', Georgia, serif`,
                    color: previewText,
                  }}
                >
                  {storeSettings.tagline || 'Timeless Indian silhouettes, woven with ishq.'}
                </h5>
                <p className="text-xs opacity-80 leading-relaxed line-clamp-2">
                  {storeSettings.brandDescription}
                </p>
                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="font-bold text-sm tabular-nums" style={{ color: previewPrimary }}>
                    ₹1,899
                  </span>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor:
                        storeSettings.buttonStyle === 'outline'
                          ? 'transparent'
                          : storeSettings.buttonStyle === 'soft'
                          ? previewBg
                          : previewBtnBg,
                      color:
                        storeSettings.buttonStyle === 'outline' ||
                        storeSettings.buttonStyle === 'soft'
                          ? previewPrimary
                          : previewBtnText,
                      border: `1px solid ${previewPrimary}`,
                      borderRadius: previewBtnRadius,
                    }}
                  >
                    Add to Bag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-SECTION B: HOMEPAGE LAYOUT & SECTION MANAGER
         ===================================================================== */}
      {subTab === 'layout' && (
        <div className="space-y-6 min-w-0">
          {/* 1. Section Visibility & Ordering */}
          <div
            className="p-5 rounded-xl border space-y-4 min-w-0"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h4
                  className="font-serif text-lg font-semibold"
                  style={{ color: 'var(--text-main)' }}
                >
                  1. Homepage Section Visibility & Order
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Enable, disable, or reorder sections. Essential navigation, shopping bag checkout,
                  and legal footer links are permanently protected.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetSections}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Default Order</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  data-testid={`homepage-section-row-${sec.id}`}
                  className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors min-w-0"
                  style={{
                    backgroundColor: sec.enabled ? 'var(--surface-elevated)' : 'var(--surface)',
                    borderColor: sec.enabled ? 'var(--border)' : 'var(--border)',
                    opacity: sec.enabled ? 1 : 0.68,
                  }}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span
                      className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tabular-nums"
                      style={{
                        backgroundColor: sec.enabled ? 'var(--primary)' : 'var(--surface-elevated)',
                        color: sec.enabled ? 'var(--btn-text)' : 'var(--text-muted)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs sm:text-sm font-semibold"
                          style={{ color: 'var(--text-main)' }}
                        >
                          {sec.label}
                        </span>
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: sec.enabled ? 'var(--primary)' : 'var(--text-muted)' }}
                        >
                          · {sec.enabled ? 'Visible on Homepage' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {sec.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSection(idx, 'up')}
                      aria-label={`Move ${sec.label} up`}
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
                      disabled={idx === sections.length - 1}
                      onClick={() => handleMoveSection(idx, 'down')}
                      aria-label={`Move ${sec.label} down`}
                      className="p-2 rounded-lg border text-xs disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSection(sec.id)}
                      aria-label={`${sec.enabled ? 'Hide' : 'Show'} ${sec.label}`}
                      className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: sec.enabled ? 'var(--primary)' : 'var(--surface)',
                        color: sec.enabled ? 'var(--btn-text)' : 'var(--text-secondary)',
                        borderColor: sec.enabled ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      {sec.enabled ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Section Headings & Promotional Banner Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <div
              className="p-5 rounded-xl border space-y-4 min-w-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                2. Section Titles & Story Copy
              </h4>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="cust-cat-title"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Featured Categories Heading
                  </label>
                  <input
                    id="cust-cat-title"
                    type="text"
                    value={storeSettings.categoriesTitle}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, categoriesTitle: e.target.value })
                    }
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
                    htmlFor="cust-best-title"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Bestsellers & Catalog Heading
                  </label>
                  <input
                    id="cust-best-title"
                    type="text"
                    value={storeSettings.bestsellersTitle}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, bestsellersTitle: e.target.value })
                    }
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
                    htmlFor="cust-new-title"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    New Arrivals Section Heading
                  </label>
                  <input
                    id="cust-new-title"
                    type="text"
                    value={storeSettings.newArrivalsTitle}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, newArrivalsTitle: e.target.value })
                    }
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
                    htmlFor="cust-story-quote"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Brand Story Pull-Quote
                  </label>
                  <input
                    id="cust-story-quote"
                    type="text"
                    value={storeSettings.storyQuote}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, storyQuote: e.target.value })
                    }
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
                    htmlFor="cust-story-heading"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Brand Story Main Heading
                  </label>
                  <input
                    id="cust-story-heading"
                    type="text"
                    value={storeSettings.storyHeading}
                    onChange={(e) =>
                      onChangeSettings({ ...storeSettings, storyHeading: e.target.value })
                    }
                    className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Promotional Banner Configuration */}
            <div
              className="p-5 rounded-xl border space-y-4 min-w-0"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <h4
                className="font-serif text-lg font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                3. Promotional Campaign Banner
              </h4>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="promo-badge"
                      className="block text-xs font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Campaign Kicker
                    </label>
                    <input
                      id="promo-badge"
                      type="text"
                      value={promoBanner.badge}
                      onChange={(e) =>
                        onChangeSettings({
                          ...storeSettings,
                          promoBanner: { ...promoBanner, badge: e.target.value },
                        })
                      }
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
                      htmlFor="promo-cta"
                      className="block text-xs font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      CTA Button Text
                    </label>
                    <input
                      id="promo-cta"
                      type="text"
                      value={promoBanner.ctaText}
                      onChange={(e) =>
                        onChangeSettings({
                          ...storeSettings,
                          promoBanner: { ...promoBanner, ctaText: e.target.value },
                        })
                      }
                      className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="promo-heading"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Promotional Heading
                  </label>
                  <input
                    id="promo-heading"
                    type="text"
                    value={promoBanner.heading}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        promoBanner: { ...promoBanner, heading: e.target.value },
                      })
                    }
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
                    htmlFor="promo-subtext"
                    className="block text-xs font-semibold uppercase mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Promotional Details
                  </label>
                  <textarea
                    id="promo-subtext"
                    rows={2}
                    value={promoBanner.subtext}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        promoBanner: { ...promoBanner, subtext: e.target.value },
                      })
                    }
                    className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="promo-img-url"
                      className="block text-xs font-semibold uppercase mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Banner Image URL
                    </label>
                    <input
                      id="promo-img-url"
                      type="url"
                      value={promoBanner.imageUrl.startsWith('data:') ? '' : promoBanner.imageUrl}
                      onChange={(e) =>
                        onChangeSettings({
                          ...storeSettings,
                          promoBanner: { ...promoBanner, imageUrl: e.target.value },
                        })
                      }
                      className="w-full min-w-0 p-2 border rounded-lg text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <label
                      htmlFor="promo-img-upload"
                      className="w-full p-2 border rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                      <span className="truncate">
                        {uploadingAsset === 'promo' ? 'Uploading...' : 'Upload Promo Image'}
                      </span>
                      <input
                        id="promo-img-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAssetUpload('promo', e)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Genuine Customer Testimonials Manager */}
          <div
            className="p-5 rounded-xl border space-y-4 min-w-0"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
            }}
          >
            <h4
              className="font-serif text-lg font-semibold"
              style={{ color: 'var(--text-main)' }}
            >
              4. Customer Testimonials & Newsletter Copy
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cust-news-heading"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Newsletter Section Heading
                </label>
                <input
                  id="cust-news-heading"
                  type="text"
                  value={storeSettings.newsletterHeading}
                  onChange={(e) =>
                    onChangeSettings({ ...storeSettings, newsletterHeading: e.target.value })
                  }
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
                  htmlFor="cust-news-subtext"
                  className="block text-xs font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Newsletter Subtext
                </label>
                <input
                  id="cust-news-subtext"
                  type="text"
                  value={storeSettings.newsletterSubtext}
                  onChange={(e) =>
                    onChangeSettings({ ...storeSettings, newsletterSubtext: e.target.value })
                  }
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            {/* Existing Testimonials List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border flex flex-col justify-between gap-2 min-w-0"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {t.customerName} · {t.location}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTestimonial(t.id)}
                        aria-label={`Delete testimonial from ${t.customerName}`}
                        className="p-1 rounded cursor-pointer"
                        style={{ color: 'var(--error-text)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      “{t.quote}”
                    </p>
                  </div>
                  {t.productBought && (
                    <span className="text-[10px] font-medium truncate" style={{ color: 'var(--accent)' }}>
                      Verified Piece: {t.productBought}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Add Testimonial Form */}
            <form
              onSubmit={handleAddTestimonial}
              className="p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <label
                  htmlFor="new-test-name"
                  className="block text-[11px] font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Customer Name
                </label>
                <input
                  id="new-test-name"
                  type="text"
                  value={newTestimonial.customerName}
                  onChange={(e) =>
                    setNewTestimonial({ ...newTestimonial, customerName: e.target.value })
                  }
                  placeholder="e.g. Kavita Nair"
                  className="w-full min-w-0 p-2 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="new-test-city"
                  className="block text-[11px] font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  City
                </label>
                <input
                  id="new-test-city"
                  type="text"
                  value={newTestimonial.location}
                  onChange={(e) =>
                    setNewTestimonial({ ...newTestimonial, location: e.target.value })
                  }
                  placeholder="e.g. Hyderabad"
                  className="w-full min-w-0 p-2 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="new-test-quote"
                  className="block text-[11px] font-semibold uppercase mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Review Quote
                </label>
                <input
                  id="new-test-quote"
                  type="text"
                  value={newTestimonial.quote}
                  onChange={(e) => setNewTestimonial({ ...newTestimonial, quote: e.target.value })}
                  placeholder="Genuine customer feedback..."
                  className="w-full min-w-0 p-2 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--btn-text)',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Review</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-SECTION C: HERO SLIDESHOW
         ===================================================================== */}
      {subTab === 'slideshow' && (
        <HeroSlideshowManager
          storeSettings={storeSettings}
          isSaving={isSaving}
          onChangeSettings={onChangeSettings}
          onSaveSettings={onSaveSettings}
          onBanner={onBanner}
        />
      )}

      {/* =====================================================================
          SUB-SECTION D: PRODUCT & CATALOG DISPLAY SETTINGS
         ===================================================================== */}
      {subTab === 'catalog' && (
        <div
          className="p-5 sm:p-6 rounded-xl border space-y-6 min-w-0"
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
              Product Card & Catalog Grid Customization
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Control how products, prices, stock badges, and shipping thresholds appear across the
              storefront.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="cust-grid-cols"
                className="block text-xs font-semibold uppercase mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Desktop Product Grid Layout
              </label>
              <select
                id="cust-grid-cols"
                value={storeSettings.gridColumnsDesktop || 4}
                onChange={(e) =>
                  onChangeSettings({
                    ...storeSettings,
                    gridColumnsDesktop: Number(e.target.value) === 3 ? 3 : 4,
                  })
                }
                className="w-full p-2.5 border rounded-lg text-xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              >
                <option value={4}>4 Columns (Standard Boutique Grid)</option>
                <option value={3}>3 Columns (Large Editorial Portrait Cards)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="cust-free-shipping"
                className="block text-xs font-semibold uppercase mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Free Shipping Threshold (₹)
              </label>
              <input
                id="cust-free-shipping"
                type="number"
                min={0}
                value={storeSettings.freeShippingThreshold ?? 1999}
                onChange={(e) =>
                  onChangeSettings({
                    ...storeSettings,
                    freeShippingThreshold: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full p-2.5 border rounded-lg text-xs tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cust-shipping-fee"
                className="block text-xs font-semibold uppercase mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Standard Shipping Fee below Threshold (₹)
              </label>
              <input
                id="cust-shipping-fee"
                type="number"
                min={0}
                value={storeSettings.standardShippingFee ?? 99}
                onChange={(e) =>
                  onChangeSettings({
                    ...storeSettings,
                    standardShippingFee: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full p-2.5 border rounded-lg text-xs tabular-nums"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(
              [
                {
                  key: 'showStockCount',
                  title: 'Show Stock Count on Cards',
                  desc: 'Displays "8 in stock" next to product price',
                },
                {
                  key: 'showDiscountPrice',
                  title: 'Show Strikethrough Compare Price',
                  desc: 'Displays original price alongside sale price',
                },
                {
                  key: 'showFabricInfo',
                  title: 'Show Fabric & Craft Subtitle',
                  desc: 'Displays textile details below product title',
                },
                {
                  key: 'showWishlistButton',
                  title: 'Show Wishlist Heart Icon',
                  desc: 'Allows customers to save pieces to wishlist',
                },
                {
                  key: 'showWhatsappInquiry',
                  title: 'Show WhatsApp Piece Inquiry',
                  desc: 'Direct WhatsApp inquiry button in Product Modal',
                },
                {
                  key: 'whatsappOrderEnabled',
                  title: 'Enable WhatsApp Checkout Option',
                  desc: 'Allows customers to share order summary on WhatsApp',
                },
              ] as const
            ).map((toggle) => (
              <label
                key={toggle.key}
                className="p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: storeSettings[toggle.key] ? 'var(--primary)' : 'var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(storeSettings[toggle.key])}
                  onChange={(e) =>
                    onChangeSettings({
                      ...storeSettings,
                      [toggle.key]: e.target.checked,
                    })
                  }
                  className="mt-0.5 accent-current"
                />
                <div>
                  <span
                    className="block text-xs font-semibold"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {toggle.title}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {toggle.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-SECTION E: HEADER, ANNOUNCEMENT & FOOTER CONTROLS
         ===================================================================== */}
      {subTab === 'headerFooter' && (
        <div
          className="p-5 sm:p-6 rounded-xl border space-y-6 min-w-0"
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
              Header Announcement Bar & Footer Sections
            </h4>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Control top banner messaging, header theme controls, and footer blocks. Essential
              navigation and legal contact details remain permanently enabled.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label
                className="p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  borderColor: storeSettings.announcementEnabled
                    ? 'var(--primary)'
                    : 'var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={storeSettings.announcementEnabled !== false}
                  onChange={(e) =>
                    onChangeSettings({
                      ...storeSettings,
                      announcementEnabled: e.target.checked,
                    })
                  }
                  className="accent-current w-4 h-4"
                />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                  Show Top Announcement Bar
                </span>
              </label>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  aria-label="Announcement bar text"
                  value={storeSettings.announcementText}
                  onChange={(e) =>
                    onChangeSettings({ ...storeSettings, announcementText: e.target.value })
                  }
                  placeholder="Complimentary express shipping on orders above ₹1,999..."
                  className="w-full min-w-0 p-2.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {(
                [
                  {
                    key: 'showThemeSelectorInHeader',
                    title: 'Visitor Theme Selector in Header',
                    desc: 'Allows shoppers to switch colour palettes live',
                  },
                  {
                    key: 'showFooterSocial',
                    title: 'Show Social Media Icons in Footer',
                    desc: 'Instagram, Facebook, and Twitter/X links',
                  },
                  {
                    key: 'showFooterHours',
                    title: 'Show Boutique Business Hours',
                    desc: 'Monday–Saturday & Sunday schedule in footer',
                  },
                  {
                    key: 'showFooterMap',
                    title: 'Show Flagship Location & Google Maps',
                    desc: 'Physical address and directions link in footer',
                  },
                  {
                    key: 'showFooterPolicies',
                    title: 'Show Shipping & Return Policy Row',
                    desc: 'Summary of delivery and exchange policies in footer',
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--surface-elevated)',
                    borderColor: storeSettings[item.key] ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(storeSettings[item.key])}
                    onChange={(e) =>
                      onChangeSettings({
                        ...storeSettings,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="mt-0.5 accent-current"
                  />
                  <div>
                    <span
                      className="block text-xs font-semibold"
                      style={{ color: 'var(--text-main)' }}
                    >
                      {item.title}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div
              className="p-3.5 rounded-xl border flex items-center gap-2.5 text-xs"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
              <span>
                Essential navigation, shopping bag, checkout flows, and customer support contact
                links are protected and always remain accessible to shoppers.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
