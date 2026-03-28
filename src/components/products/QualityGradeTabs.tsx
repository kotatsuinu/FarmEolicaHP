import { useState } from 'react';

interface GradeOption {
  label: string;
  description: string;
  sampleSrcs: string[];
}

interface QualityGrade {
  code: string;
  label: string;
  description: string;
  criteria: { item: string; value: string }[];
  sampleSrcs: string[];
  options?: GradeOption[];
}

interface Props {
  grades: QualityGrade[];
}

function ScrollGallery({ images, label }: { images: string[]; label: string }) {
  if (!images || images.length === 0) return null;

  return (
    <div className="overflow-x-auto -mx-6 px-6 md:-mx-8 md:px-8">
      <div className="flex gap-3 min-w-max pb-3">
        {images.map((src, i) => (
          <div
            key={i}
            className="w-48 h-48 md:w-56 md:h-56 flex-shrink-0 bg-stone-100 overflow-hidden"
          >
            <img
              src={src}
              alt={`${label} サンプル ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
      {images.length > 2 && (
        <p className="font-mono text-[10px] text-stone-400 mt-1">
          ← スクロールして{images.length}枚のサンプルを確認できます
        </p>
      )}
    </div>
  );
}

export default function QualityGradeTabs({ grades }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!grades || grades.length === 0) return null;

  const active = grades[activeIndex];

  return (
    <div className="bg-stone-50/95 backdrop-blur-sm shadow-lg">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 md:px-8 md:pt-8">
        <p className="font-mono text-xs tracking-widest text-stone-500 mb-4">
          QUALITY GRADES <span className="font-serif">ー独自品質規格ー</span>
        </p>
      </div>

      {/* Tab Bar */}
      <div className="px-6 md:px-8 overflow-x-auto">
        <div className="flex gap-1 min-w-max border-b border-stone-200">
          {grades.map((grade, i) => (
            <button
              key={grade.code}
              onClick={() => setActiveIndex(i)}
              className={`
                px-4 py-3 font-mono text-sm tracking-wide transition-all duration-200
                border-b-2 -mb-px whitespace-nowrap
                ${i === activeIndex
                  ? 'border-emerald-700 text-emerald-800 font-medium'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }
              `}
            >
              {grade.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="py-6 md:py-8 space-y-6">
        {/* Description + Criteria */}
        <div className="px-6 md:px-8">
          <h4 className="font-serif text-xl text-stone-800 mb-3">
            {active.label}
          </h4>
          <p className="font-serif text-sm text-stone-600 leading-relaxed mb-6">
            {active.description}
          </p>

          {/* Criteria Table */}
          <dl className="space-y-2 mb-6">
            {active.criteria.map((c) => (
              <div
                key={c.item}
                className="flex justify-between items-baseline border-b border-stone-200 pb-2"
              >
                <dt className="font-mono text-xs text-stone-500">{c.item}</dt>
                <dd className="font-serif text-sm text-stone-700">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Sample Gallery */}
        <div>
          <div className="px-6 md:px-8 mb-3">
            <p className="font-mono text-xs text-stone-500">
              {active.label} のサンプル — こういった品質のものを束ねています
            </p>
          </div>
          <ScrollGallery images={active.sampleSrcs} label={active.label} />
        </div>

        {/* Options (e.g. やや先進み) */}
        {active.options && active.options.length > 0 && (
          <div className="border-t border-stone-200 pt-6">
            {active.options.map((opt) => (
              <div key={opt.label}>
                <div className="px-6 md:px-8 mb-3">
                  <h5 className="font-mono text-xs tracking-widest text-stone-500 mb-2">
                    OPTION: <span className="font-serif text-sm text-stone-700">{active.label}（{opt.label}）</span>
                  </h5>
                  <p className="font-serif text-sm text-stone-600 leading-relaxed mb-3">
                    {opt.description}
                  </p>
                </div>
                <ScrollGallery images={opt.sampleSrcs} label={`${active.label}（${opt.label}）`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
