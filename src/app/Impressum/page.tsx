import React from 'react';
import Link from 'next/link';
import { T, TextBlock } from '@/components/site-text/T';
import { legal } from '@/content/texts/legal';

// Abschnitte sind im Admin-Editor bearbeitbar (src/content/texts/legal.ts).
const SECTION_CLASSES = {
  h2: 'text-xl font-semibold mb-3 text-amber-900',
  h3: 'text-lg font-semibold mb-3 text-amber-800',
  p: 'text-gray-700 leading-relaxed',
  ul: 'list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4',
  a: 'text-amber-600 hover:text-amber-800 underline',
};

const SECTIONS = [
  legal['impressum.responsible'],
  legal['impressum.contact'],
  legal['impressum.vat'],
  legal['impressum.editorial'],
  legal['impressum.odr'],
  legal['impressum.consumer'],
];

export default function Impressum() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-4"><T t={legal['impressum.title']} /></h1>
            <p className="text-amber-700 text-lg"><T t={legal['impressum.subtitle']} /></p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
            <h2 className="text-2xl font-semibold mb-6 text-amber-900"><T t={legal['impressum.heading']} /></h2>

            <div className="space-y-6">
              {SECTIONS.map((section) => (
                <TextBlock key={section.key} t={section} classNames={SECTION_CLASSES} />
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <T t={legal['back']} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
