import React, { useState, useEffect, useMemo } from 'react';
import { SHIPPING_RATES, PREFECTURES, COOL_FEES, type Size } from '../../data/shipping';

interface PriceOption {
  label: string;
  price: number;
  size: number; // 60 | 80 ... handled as number
}

interface EstimateCalculatorProps {
  options: PriceOption[];
  defaultCool?: boolean;
  productName?: string;
  /** 'standard': 佐川宅配便（都道府県×サイズ×クール便）/ 'clickpost': 全国一律固定送料 */
  shippingMode?: 'standard' | 'clickpost';
  /** clickpost時の固定送料（デフォルト185円） */
  clickpostFee?: number;
}

export default function EstimateCalculator({
  options,
  defaultCool = false,
  productName,
  shippingMode = 'standard',
  clickpostFee = 185,
}: EstimateCalculatorProps) {
  const isClickpost = shippingMode === 'clickpost';

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('東京都');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [isCool, setIsCool] = useState<boolean>(isClickpost ? false : defaultCool);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [coolFeeAmount, setCoolFeeAmount] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);

  const selectedOption = options[selectedOptionIndex];
  const sagawaLink = "https://www.sagawa-exp.co.jp/send/fare/faretable03.html?_ga=2.73288595.1464715402.1770612007-66129190.1763209062";

  // Calculate fees when dependencies change
  useEffect(() => {
    if (!selectedOption) return;

    // Clickpost mode: 全国一律固定送料、クール便なし
    if (isClickpost) {
      setShippingFee(clickpostFee);
      setCoolFeeAmount(0);
      return;
    }

    if (!selectedPrefecture) return;

    // 1. Find Region
    const rate = SHIPPING_RATES.find(r => r.prefectures.includes(selectedPrefecture));
    if (!rate) {
      setShippingFee(null);
      return;
    }

    // 2. Get Base Shipping Fee for Size
    const sizeKey = selectedOption.size as Size;
    let baseFee = rate.prices[sizeKey];
    if (baseFee === undefined) {
      const sizes: Size[] = [60, 80, 100, 140, 160];
      const foundSize = sizes.find(s => s >= selectedOption.size);
      if (foundSize) {
        baseFee = rate.prices[foundSize];
      } else {
        baseFee = rate.prices[160];
      }
    }

    setShippingFee(baseFee);

    // 3. Cool Fee
    if (isCool) {
      const cool = COOL_FEES[sizeKey] || (COOL_FEES[140]);
      setCoolFeeAmount(cool);
    } else {
      setCoolFeeAmount(0);
    }

  }, [selectedPrefecture, selectedOption, isCool, isClickpost, clickpostFee]);

  // Calculate Total
  useEffect(() => {
    if (shippingFee !== null && selectedOption) {
      setTotalPrice(selectedOption.price + shippingFee + coolFeeAmount);
    } else {
      setTotalPrice(null);
    }
  }, [shippingFee, coolFeeAmount, selectedOption]);

  // 問い合わせフォームへの遷移URL（見積もり状態を保持）
  const inquiryUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: 'estimate',
      ...(productName ? { product: productName } : {}),
      ...(selectedOption ? { boxSize: selectedOption.label } : {}),
      ...(selectedOption ? { unitPrice: String(selectedOption.price) } : {}),
      ...(isClickpost
        ? { shippingMode: 'clickpost', shipping: String(clickpostFee) }
        : { prefecture: selectedPrefecture, cool: isCool ? 'true' : 'false' }),
      ...(totalPrice !== null ? { total: String(totalPrice) } : {}),
    });
    return `/contact?${params.toString()}`;
  }, [productName, selectedOption, selectedPrefecture, isCool, totalPrice, isClickpost, clickpostFee]);

  return (
    <div className="bg-stone-white/95 backdrop-blur-sm shadow-lab-lg border-t-4 border-eolica-green transition-all duration-300">
      {/* Header / Toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-6 cursor-pointer flex justify-between items-center hover:bg-warm-gray-50/50 transition-colors"
      >
        <h3 className="font-mono text-xs tracking-widest text-warm-gray-500 flex items-center gap-2">
          ESTIMATE & SHIPPING <span className="font-serif">ー送料・簡易見積もりー</span>
        </h3>
        <span className={`font-mono text-xs text-old-copper transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {/* Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6">
          <div className={`grid grid-cols-1 ${isClickpost ? '' : 'md:grid-cols-2'} gap-6 mb-6`}>
            {/* Step 1: Prefecture (standard モードのみ。clickpost は全国一律) */}
            {!isClickpost && (
              <div className="space-y-2">
                <label className="block font-mono text-xs text-warm-gray-500">
                  お届け先（都道府県）
                </label>
                <div className="relative">
                  <select
                    value={selectedPrefecture}
                    onChange={(e) => setSelectedPrefecture(e.target.value)}
                    className="w-full appearance-none bg-white border border-warm-gray-200 px-4 py-3 pr-8 rounded-none font-serif text-dark-slate focus:outline-none focus:border-eolica-green transition-colors cursor-pointer"
                  >
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-warm-gray-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Product/Size */}
            <div className="space-y-2">
              <label className="block font-mono text-xs text-warm-gray-500">
                商品サイズ・種類
              </label>
              <div className="relative">
                <select
                  value={selectedOptionIndex}
                  onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
                  className="w-full appearance-none bg-white border border-warm-gray-200 px-4 py-3 pr-8 rounded-none font-serif text-dark-slate focus:outline-none focus:border-eolica-green transition-colors cursor-pointer"
                >
                  {options.map((opt, idx) => (
                    <option key={idx} value={idx}>
                      {opt.label} ({opt.price.toLocaleString()}円)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-warm-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Cool Option (standard モードのみ) */}
          {!isClickpost && (
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isCool}
                    onChange={(e) => setIsCool(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none border border-warm-gray-300 bg-white checked:bg-old-copper checked:border-old-copper transition-all duration-200"
                  />
                  <svg
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white transition-opacity duration-200"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-serif text-dark-slate block group-hover:text-old-copper transition-colors">
                    クール便を利用する（推奨）
                  </span>
                  <span className="text-xs text-warm-gray-500 block mt-1">
                    ※夏季（6〜9月）や気温の高い日は品質保持のため利用をおすすめします
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Result */}
          <div className="bg-warm-gray-50/50 p-6 border border-warm-gray-100 mb-6">
            <div className="space-y-2 mb-4 border-b border-warm-gray-200 pb-4">
              <div className="flex justify-between text-sm text-warm-gray-600 font-serif">
                <span>商品代金</span>
                <span>{selectedOption?.price.toLocaleString()}円</span>
              </div>
              <div className="flex justify-between text-sm text-warm-gray-600 font-serif">
                <span>{isClickpost ? '送料（クリックポスト・全国一律）' : `送料 (${selectedPrefecture})`}</span>
                <span>{shippingFee ? `${shippingFee.toLocaleString()}円` : '---'}</span>
              </div>
              {isCool && (
                <div className="flex justify-between text-sm text-old-copper font-serif">
                  <span>クール便加算</span>
                  <span>+{coolFeeAmount.toLocaleString()}円</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-baseline">
              <span className="font-mono text-xs tracking-widest text-warm-gray-500">TOTAL</span>
              <div className="text-right">
                <span className="font-mono text-3xl text-eolica-green font-medium">
                  {totalPrice ? `${totalPrice.toLocaleString()}` : '---'}
                </span>
                <span className="text-xs text-warm-gray-500 font-mono ml-1">JPY (inc. tax)</span>
              </div>
            </div>
            <p className="text-[10px] text-right text-warm-gray-400 mt-2">
              ※目安金額です。実際の決済時と異なる場合があります。
            </p>
          </div>

          {/* CTA: 見積もり状態を保持してフォームへ */}
          <a
            href={inquiryUrl}
            className="block w-full text-center px-6 py-4 mb-6 text-xs tracking-widest uppercase font-mono border-2 border-eolica-green text-eolica-green hover:bg-eolica-green hover:text-white transition-all duration-300"
          >
            この内容で問い合わせる →
          </a>

          {/* Shipping Info Footer */}
          <div className="border-t border-warm-gray-200 pt-4">
            <div className="text-xs text-warm-gray-500 space-y-2">
              {isClickpost ? (
                <>
                  <p>
                    発送方法: <span className="font-mono text-wet-soil">クリックポスト</span>（全国一律・郵便ポスト投函）
                  </p>
                  <p>
                    ※厚さ3cmまでの専用ハードケースで発送／お受け取り時のご在宅不要／到着日時の指定はできません。
                  </p>
                </>
              ) : (
                <>
                  <p>
                    発送元: <span className="font-mono text-wet-soil">福島県</span>（佐川急便・通常宅配便）
                  </p>
                  <p>
                    ※サイズ・地域により異なります。詳細は
                    <a
                      href={sagawaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-old-copper hover:underline ml-1"
                    >
                      佐川急便料金表（福島県発）
                    </a>
                    をご確認ください。
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
