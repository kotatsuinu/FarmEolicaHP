import React, { useState } from 'react';
import { SITE_CONFIG } from '../config/site';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
  name: string;
  email: string;
  inquiryType: string;
  message: string;
  _honeypot: string;
}

const initialFormData: FormData = {
  name: '',
  email: '',
  inquiryType: '',
  message: '',
  _honeypot: '',
};

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const inquiryTypes = SITE_CONFIG.contactForm.inquiryTypes;

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
      await fetch(SITE_CONFIG.contactForm.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          inquiryType: formData.inquiryType,
          message: formData.message.trim(),
        }),
      });

      // no-cors: response is opaque, treat as success if no network error
      setStatus('success');
      setFormData(initialFormData);
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setFormData(initialFormData);
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
