import React, { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config/site';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
  name: string;
  email: string;
  inquiryType: string;
  message: string;
  productInfo: string;
  desiredDate: string;
  _honeypot: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  inquiryType: '',
  message: '',
  productInfo: '',
  desiredDate: '',
  _honeypot: '',
};

// 商品ページの見積もり計算機から引き継ぐ情報（読み取り専用）
// フィールド名は contact_form.gs の FIELD_LABEL_MAP と揃えてあるため、
// そのままサブミット時のキーとして使用する
interface EstimateInfo {
  productUrl?: string;
  boxSize?: string;
  quantity?: string;
  unitPrice?: string;
  shippingMode?: string;
  prefecture?: string;
  coolOption?: string;
  productSubtotal?: number;
  shippingFee?: number;
  coolFee?: number;
  totalEstimate?: number;
}

const formatYen = (n: number) => `${n.toLocaleString()}円`;

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [estimateInfo, setEstimateInfo] = useState<EstimateInfo | null>(null);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const inquiryTypes = SITE_CONFIG.contactForm.inquiryTypes;

  // URLパラメータから見積もり情報を取り込む（見積もり計算機からの遷移）
  // - 商品名は productInfo（編集可能）にプリフィル
  // - 価格内訳・箱サイズ等は estimateInfo（読み取り専用表示 + 隠しフィールドとしてサブミット）
  // - メッセージ欄は顧客の自由入力用としてプレースホルダのみ表示
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const product = params.get('product');
    const productType = params.get('type');

    if (!product && !productType) return;

    const num = (key: string) => {
      const v = params.get(key);
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const str = (key: string) => params.get(key) || undefined;

    const info: EstimateInfo = {
      productUrl: str('productUrl'),
      boxSize: str('boxSize'),
      quantity: str('quantity'),
      unitPrice: str('unitPrice'),
      shippingMode: str('shippingMode'),
      prefecture: str('prefecture'),
      coolOption: str('coolOption'),
      productSubtotal: num('productSubtotal'),
      shippingFee: num('shippingFee'),
      coolFee: num('coolFee'),
      totalEstimate: num('totalEstimate'),
    };
    const hasAnyInfo = Object.values(info).some((v) => v !== undefined && v !== '');

    setFormData((prev) => ({
      ...prev,
      inquiryType: productType === 'estimate' ? 'estimate' : prev.inquiryType,
      productInfo: product || prev.productInfo,
    }));
    if (hasAnyInfo) setEstimateInfo(info);
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'お名前を入力してください';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = '正しいメールアドレスを入力してください';
    }

    if (!formData.inquiryType) {
      newErrors.inquiryType = 'お問い合わせ種別を選択してください';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'メッセージを入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: bot fills hidden field -> silently "succeed"
    if (formData._honeypot) {
      setStatus('success');
      return;
    }

    if (!validate()) return;

    setStatus('submitting');

    try {
      const submitParams: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        inquiryType: formData.inquiryType,
        message: formData.message.trim(),
      };

      if (formData.inquiryType === 'estimate') {
        if (formData.productInfo.trim()) submitParams.productInfo = formData.productInfo.trim();
        if (formData.desiredDate) submitParams.desiredDate = formData.desiredDate;

        // 見積もり計算機から引き継いだ価格内訳をフィールド化して送信
        // → GAS 側 (contact_form.gs) で FIELD_LABEL_MAP により日本語ラベル化される
        if (estimateInfo) {
          if (estimateInfo.productUrl) submitParams.productUrl = estimateInfo.productUrl;
          if (estimateInfo.quantity) submitParams.quantity = estimateInfo.quantity;
          if (estimateInfo.unitPrice) submitParams.unitPrice = estimateInfo.unitPrice;
          if (estimateInfo.boxSize) submitParams.boxSize = estimateInfo.boxSize;
          if (estimateInfo.prefecture) submitParams.prefecture = estimateInfo.prefecture;
          if (estimateInfo.shippingMode) submitParams.shippingMode = estimateInfo.shippingMode;
          if (estimateInfo.coolOption) submitParams.coolOption = estimateInfo.coolOption;
          if (estimateInfo.productSubtotal !== undefined) {
            submitParams.productSubtotal = formatYen(estimateInfo.productSubtotal);
          }
          if (estimateInfo.shippingFee !== undefined) {
            submitParams.shippingFee = formatYen(estimateInfo.shippingFee);
          }
          if (estimateInfo.coolFee !== undefined) {
            submitParams.coolFee = formatYen(estimateInfo.coolFee);
          }
          if (estimateInfo.totalEstimate !== undefined) {
            submitParams.totalEstimate = `${formatYen(estimateInfo.totalEstimate)}（税込・送料込）`;
          }
        }
      }

      await fetch(SITE_CONFIG.contactForm.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams(submitParams),
      });

      // no-cors: response is opaque, treat as success if no network error
      setStatus('success');
      setFormData(initialFormData);

      // GA4: contact form submit event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'contact_form_submit', {
          inquiry_type: formData.inquiryType,
        });
      }
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setFormData(initialFormData);
    setEstimateInfo(null);
    setErrors({});
  };

  // Success state
  if (status === 'success') {
    return (
      <div className="bg-stone-white/95 backdrop-blur-sm shadow-lab p-8">
        <div className="bg-eolica-green/10 border border-eolica-green/30 p-6 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-eolica-green"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h3 className="font-serif text-xl text-wet-soil mb-2">
            お問い合わせを受け付けました
          </h3>
          <p className="text-warm-gray-600 text-sm font-serif mb-6">
            内容を確認の上、折り返しご連絡いたします。
          </p>
          <button
            onClick={handleReset}
            className="inline-block px-8 py-3 text-xs tracking-widest uppercase font-mono border-2 border-old-copper text-old-copper hover:bg-old-copper hover:text-white transition-all duration-300"
          >
            New Inquiry
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    'w-full bg-white border px-4 py-3 rounded-none font-serif text-dark-slate focus:outline-none focus:border-eolica-green transition-colors';
  const labelClass = 'block font-mono text-xs text-warm-gray-500 tracking-wide mb-2';
  const errorClass = 'text-xs text-red-600 mt-1 font-serif';

  return (
    <div className="bg-stone-white/95 backdrop-blur-sm shadow-lab p-8">
      {/* Error banner */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 p-4 mb-6">
          <p className="text-sm text-red-700 font-serif">
            送信に失敗しました。時間をおいて再度お試しください。
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="contact-name" className={labelClass}>
              お名前 <span className="text-old-copper">*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="山田 太郎"
              className={`${inputClass} ${errors.name ? 'border-red-400' : 'border-warm-gray-200'}`}
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="contact-email" className={labelClass}>
              メールアドレス <span className="text-old-copper">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              className={`${inputClass} ${errors.email ? 'border-red-400' : 'border-warm-gray-200'}`}
            />
            {errors.email && <p className={errorClass}>{errors.email}</p>}
          </div>
        </div>

        {/* Inquiry Type */}
        <div className="space-y-1 mb-6">
          <label htmlFor="contact-type" className={labelClass}>
            お問い合わせ種別 <span className="text-old-copper">*</span>
          </label>
          <div className="relative">
            <select
              id="contact-type"
              name="inquiryType"
              value={formData.inquiryType}
              onChange={handleChange}
              className={`${inputClass} appearance-none pr-8 cursor-pointer ${errors.inquiryType ? 'border-red-400' : 'border-warm-gray-200'}`}
            >
              <option value="">選択してください</option>
              {inquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-warm-gray-500">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          {errors.inquiryType && <p className={errorClass}>{errors.inquiryType}</p>}
        </div>

        {/* Estimate-specific fields */}
        {formData.inquiryType === 'estimate' && (
          <>
            <div className="space-y-1 mb-6">
              <label htmlFor="productInfo" className="block text-sm font-serif text-wet-soil mb-2">
                ご希望商品
              </label>
              <input
                type="text"
                id="productInfo"
                name="productInfo"
                value={formData.productInfo}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-stone-white border border-warm-gray-200 text-sm font-serif text-wet-soil focus:outline-none focus:border-old-copper transition-colors"
                placeholder="例: カンパニュラのドライフラワー（ヘッド）30個"
              />
            </div>

            {/* 見積もり計算機から引き継いだ内容（読み取り専用） */}
            {estimateInfo && (
              <div className="mb-6 bg-warm-gray-50/70 border border-warm-gray-200 p-5">
                <p className="font-mono text-xs tracking-widest text-eolica-green mb-3">
                  ESTIMATE CARRIED OVER <span className="font-serif text-warm-gray-500">ー商品ページから見積もり内容を引き継いでいます ー</span>
                </p>
                <dl className="text-xs font-serif text-warm-gray-700 space-y-1.5">
                  {estimateInfo.boxSize && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-warm-gray-500">箱サイズ</dt>
                      <dd className="text-right">{estimateInfo.boxSize}</dd>
                    </div>
                  )}
                  {estimateInfo.quantity && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-warm-gray-500">数量</dt>
                      <dd className="text-right">
                        {estimateInfo.quantity}
                        {estimateInfo.unitPrice && (
                          <span className="text-warm-gray-400 ml-2">（単価 {estimateInfo.unitPrice}）</span>
                        )}
                      </dd>
                    </div>
                  )}
                  {estimateInfo.prefecture && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-warm-gray-500">お届け先</dt>
                      <dd className="text-right">{estimateInfo.prefecture}</dd>
                    </div>
                  )}
                  {estimateInfo.coolOption && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-warm-gray-500">クール便</dt>
                      <dd className="text-right">{estimateInfo.coolOption}</dd>
                    </div>
                  )}
                  {estimateInfo.shippingMode && !estimateInfo.prefecture && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-warm-gray-500">発送方法</dt>
                      <dd className="text-right">{estimateInfo.shippingMode}</dd>
                    </div>
                  )}

                  {(estimateInfo.productSubtotal !== undefined ||
                    estimateInfo.shippingFee !== undefined ||
                    estimateInfo.coolFee !== undefined ||
                    estimateInfo.totalEstimate !== undefined) && (
                    <div className="pt-3 mt-2 border-t border-warm-gray-200 space-y-1.5">
                      {estimateInfo.productSubtotal !== undefined && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-warm-gray-500">商品代金</dt>
                          <dd className="text-right font-mono">{formatYen(estimateInfo.productSubtotal)}</dd>
                        </div>
                      )}
                      {estimateInfo.shippingFee !== undefined && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-warm-gray-500">送料</dt>
                          <dd className="text-right font-mono">{formatYen(estimateInfo.shippingFee)}</dd>
                        </div>
                      )}
                      {estimateInfo.coolFee !== undefined && (
                        <div className="flex justify-between gap-4 text-old-copper">
                          <dt>クール便加算</dt>
                          <dd className="text-right font-mono">+{formatYen(estimateInfo.coolFee)}</dd>
                        </div>
                      )}
                      {estimateInfo.totalEstimate !== undefined && (
                        <div className="flex justify-between gap-4 pt-1 mt-1 border-t border-warm-gray-200 items-baseline">
                          <dt className="font-mono tracking-widest text-warm-gray-500">TOTAL</dt>
                          <dd className="text-right font-mono text-eolica-green text-base">
                            {formatYen(estimateInfo.totalEstimate)}
                            <span className="text-[10px] text-warm-gray-400 ml-1">(税込・送料込)</span>
                          </dd>
                        </div>
                      )}
                    </div>
                  )}
                </dl>
                <p className="text-[10px] text-warm-gray-400 mt-3">
                  ※この内容は送信時に自動で添付されます。条件を変更したい場合は下記メッセージ欄にご記入ください。
                </p>
              </div>
            )}

            <div className="space-y-1 mb-6">
              <label htmlFor="desiredDate" className="block text-sm font-serif text-wet-soil mb-2">
                到着希望日
              </label>
              <input
                type="date"
                id="desiredDate"
                name="desiredDate"
                value={formData.desiredDate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-stone-white border border-warm-gray-200 text-sm font-serif text-wet-soil focus:outline-none focus:border-old-copper transition-colors"
              />
            </div>
          </>
        )}

        {/* Message */}
        <div className="space-y-1 mb-8">
          <label htmlFor="contact-message" className={labelClass}>
            メッセージ <span className="text-old-copper">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={5}
            placeholder="お問い合わせ内容をご記入ください"
            className={`${inputClass} resize-y min-h-[120px] ${errors.message ? 'border-red-400' : 'border-warm-gray-200'}`}
          />
          {errors.message && <p className={errorClass}>{errors.message}</p>}
        </div>

        {/* Honeypot (hidden from humans, bots fill it) */}
        <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
          <input
            type="text"
            name="_honeypot"
            value={formData._honeypot}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* 返信についてのご案内 */}
        <div className="bg-warm-gray-50 border border-warm-gray-200 p-4 mb-6 text-sm font-serif text-warm-gray-600 leading-relaxed">
          <p className="mb-2">
            送信後、自動返信メールをお届けします。その後3日以内に{' '}
            <span className="font-semibold text-wet-soil">farmeolica@gmail.com</span>{' '}
            よりご返信いたします。
          </p>
          <p>
            3日を過ぎてもご返信が届かない場合は、システム不具合や迷惑メールへの振り分けの可能性がございます。
            迷惑メールフォルダをご確認いただくか、InstagramなどSNSのDMよりご連絡いただけると助かります。
          </p>
        </div>

        {/* Submit */}
        <div className="text-center">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className={`inline-block px-12 py-3 text-xs tracking-widest uppercase font-mono border-2 border-old-copper transition-all duration-300 ${
              status === 'submitting'
                ? 'opacity-70 cursor-not-allowed text-old-copper'
                : 'text-old-copper hover:bg-old-copper hover:text-white'
            }`}
          >
            {status === 'submitting' ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Sending...
              </span>
            ) : (
              'Send Message →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
