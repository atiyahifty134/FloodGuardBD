import React from 'react';

const TIPS = [
  {
    bn: 'জরুরি ব্যাগে শুকনো খাবার, বিশুদ্ধ পানি, মোমবাতি, টর্চলাইট ও প্রয়োজনীয় ওষুধ প্রস্তুত রাখুন।',
    en: 'Prepare an emergency bag with dry food, clean water, candles, a flashlight, and essential medicine.'
  },
  {
    bn: 'গুরুত্বপূর্ণ কাগজপত্র (এনআইডি, জমির দলিল) একটি ওয়াটারপ্রুফ ব্যাগে সংরক্ষণ করুন।',
    en: 'Keep important documents (NID, land papers) in a waterproof bag.'
  },
  {
    bn: 'বৈদ্যুতিক সংযোগ ও গ্যাস লাইন বন্ধ রাখুন যদি পানি ঘরে প্রবেশের আশঙ্কা থাকে।',
    en: 'Turn off electrical connections and gas lines if water may enter your home.'
  },
  {
    bn: 'গবাদি পশু ও মূল্যবান জিনিসপত্র উঁচু ও নিরাপদ স্থানে সরিয়ে নিন।',
    en: 'Move livestock and valuables to higher, safer ground.'
  },
  {
    bn: 'স্থানীয় প্রশাসন ও রেডিওর মাধ্যমে সর্বশেষ বন্যা সতর্কতা সম্পর্কে অবগত থাকুন।',
    en: 'Stay informed on the latest flood warnings via local authorities and radio.'
  },
  {
    bn: 'পরিবারের সবার সাথে একটি নির্দিষ্ট মিলনস্থল ও যোগাযোগের পরিকল্পনা ঠিক করে রাখুন।',
    en: 'Agree on a family meeting point and communication plan in advance.'
  }
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12.5L10 17.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EmergencyGuide() {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Preparedness Guide</span>
          <h2 style={{ marginTop: 2 }}>বন্যা প্রস্তুতি নির্দেশিকা</h2>
        </div>
      </div>
      <div className="panel-body">
        <div className="guide-list">
          {TIPS.map((tip, idx) => (
            <div className="guide-item" key={idx}>
              <span className="icon">
                <CheckIcon />
              </span>
              <div className="guide-item-text">
                {tip.bn}
                <span className="en">{tip.en}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
