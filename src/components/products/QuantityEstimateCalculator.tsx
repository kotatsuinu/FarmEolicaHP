import React, { useState, useEffect, useMemo } from 'react';
import { SHIPPING_RATES, PREFECTURES, COOL_FEES, type Size } from '../../data/shipping';

interface PriceTier {
  minQuantity: number;
  unitPrice: number;
}

interface BoxOption {
  size: string;
  boxSize: number;
  maxStems: number;
  maxLength?: number;
}

interface QuantityEstimateCalculatorProps {
  priceTiers: PriceTier[];
  boxOptions: BoxOption[];
  unit?: string;
  defaultCool?: boolean;
}

export default function QuantityEstimateCalculator({
  priceTiers,
  boxOptions,
  unit = '本',
  defaultCool = false,
}: QuantityEstimateCalculatorProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(priceTiers[0]?.minQuantity || 10);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string>('東京都');
  const [isCool, setIsCool] = useState<boolean>(defaultCool);

  const selectedBox = boxOptions[selectedBoxIndex];
  const sagawaLink = "https://www.sagawa-exp.co.jp/send/fare/faretable03.html?_ga=2.73288595.1464715402.1770612007-66129190.1763209062";

  // Sort tiers by minQuantity descending for lookup
  const sortedTiers = useMemo(
    () => [...priceTiers].sort((a, b) => b.minQuantity - a.minQuantity),
    [priceTiers]
  );

  // Determine current tier based on quantity
  const currentTier = useMemo(() => {
    return sortedTiers.find(t => quantity >= t.minQuantity) || sortedTiers[sortedTiers.length - 1];
  }, [quantity, sortedTiers]);

  const unitPrice = currentTier?.unitPrice || 0;
  const productPrice = quantity * unitPrice;
  const isOverCapacity = selectedBox && quantity > selectedBox.maxStems;

  // Shipping fee calculation
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [coolFeeAmount, setCoolFeeAmount] = useState<number>(0);

  useEffect(() => {
    if (!selectedPrefecture || !selectedBox) return;

    const rate = SHIPPING_RATES.find(r => r.prefectures.includes(selectedPrefecture));
    if (!rate) {
      setShippingFee(null);
      return;
    }

    const sizeKey = selectedBox.boxSize as Size;
    let baseFee = rate.prices[sizeKey];
    if (baseFee === undefined) {
      const sizes: Size[] = [60, 80, 100, 140, 160];
      const foundSize = sizes.find(s => s >= selectedBox.boxSize);
      baseFee = foundSize ? rate.prices[foundSize] : rate.prices[160];
    }
    setShippingFee(baseFee);

    if (isCool) {
      const cool = COOL_FEES[sizeKey] || COOL_FEES[140];
      setCoolFeeAmount(cool);
    } else {
      setCoolFeeAmount(0);
    }
  }, [selectedPrefecture, selectedBox, isCool]);

  const totalPrice = shippingFee !== null ? productPrice + shippingFee + coolFeeAmount : null;

  // Format tier label for display
  const tierLabel = useMemo(() => {
    const sorted = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity);
    const idx = sorted.findIndex(t => t.unitPrice === currentTier?.unitPrice);
    const tier = sorted[idx];
    const nextTier = sorted[idx + 1];
    if (!tier) return '';
    if (nextTier) {
      return `${tier.minQuantity}〜${nextTier.minQuantity - 1}${unit}`;
    }
    return `${tier.minQuantity}${unit}〜`;
  }, [priceTiers, currentTier, unit]);

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
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6">
          {/* Step 1: Quantity + Box Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="block font-mono text-xs text-warm-gray-500">
                ご希望本数
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setQuantity(v);
                }}
                className="w-full bg-white border border-warm-gray-200 px-4 py-3 rounded-none font-mono text-dark-slate focus:outline-none focus:border-eolica-green transition-colors"
                placeholder="本数を入力"
              />
              <p className="text-xs text-warm-gray-400 font-serif">
                適用単価: <span className="text-old-copper font-mono font-medium">{unitPrice}円/{unit}</span>
                <span className="ml-1 text-warm-gray-400">（{tierLabel}）</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-mono text-xs text-warm-gray-500">
                ダンボールサイズ
              </label>
              <div className="relative">
                <select
                  value={selectedBoxIndex}
                  onChange={(e) => setSelectedBoxIndex(Number(e.target.value))}
                  className="w-full appearance-none bg-white border border-warm-gray-200 px-4 py-3 pr-8 rounded-none font-serif text-dark-slate focus:outline-none focus:border-eolica-green transition-colors cursor-pointer"
                >
                  {boxOptions.map((opt, idx) => (
                    <option key={idx} value={idx}>
                      {opt.size}（{opt.maxLength ? `${opt.maxLength}cm・` : ''}目安 {opt.maxStems}{unit}まで）
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

          {/* Over-capacity warning */}
          {isOverCapacity && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-serif">
              <span className="font-mono text-xs font-medium">注意: </span>
              {selectedBox.size}の目安上限は{selectedBox.maxStems}{unit}です。
              本数が多い場合はより大きなサイズをご検討いただくか、お問い合わせください。
            </div>
          )}

          {/* Step 2: Prefecture + Cool */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

            <div className="space-y-2">
              <label className="block font-mono text-xs text-warm-gray-500">&nbsp;</label>
              <label className="flex items-start gap-3 cursor-pointer group pt-1">
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
                    ※夏季（6〜9月）は品質保持のためおすすめします
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Result */}
          <div className="bg-warm-gray-50/50 p-6 border border-warm-gray-100 mb-6">
            <div className="space-y-2 mb-4 border-b border-warm-gray-200 pb-4">
              <div className="flex justify-between text-sm text-warm-gray-600 font-serif">
                <span>商品代金（{quantity}{unit} × {unitPrice}円）</span>
                <span>{productPrice.toLocaleString()}円</span>
              </div>
              <div className="flex justify-between text-sm text-warm-gray-600 font-serif">
                <span>送料（{selectedPrefecture}・{selectedBox?.size}）</span>
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

          {/* Shipping Info Footer */}
          <div className="border-t border-warm-gray-200 pt-4">
            <div className="text-xs text-warm-gray-500 space-y-2">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
