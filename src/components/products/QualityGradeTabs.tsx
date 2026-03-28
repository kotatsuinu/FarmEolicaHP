import { useState } from 'react';

interface QualityGrade {
  code: string;
  label: string;
  imageSrc?: string;
  description: string;
  criteria: { item: string; value: string }[];
}

interface Props {
  grades: QualityGrade[];
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
      <div className="p-6 md:p-8">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Photo */}
          <div className="aspect-square bg-stone-100 overflow-hidden">
            {active.imageSrc ? (
              <img
                src={active.imageSrc}
                alt={`${active.label}の品質例`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                <svg className="w-16 h-16 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-mono text-sm">写真準備中</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h4 className="font-serif text-xl text-stone-800 mb-2">
              {active.label}
            </h4>
            <p className="font-serif text-sm text-stone-600 leading-relaxed mb-6">
              {active.description}
            </p>

            {/* Criteria Table */}
            <dl className="space-y-3">
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
        </div>
      </div>
    </div>
  );
}
