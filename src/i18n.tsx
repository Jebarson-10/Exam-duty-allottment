// Bilingual UI layer (English / தமிழ்) for the Erode Exam Duty Portal.
// The language choice is persisted per browser and toggled from the header.

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'en' | 'ta';

const LANG_STORAGE_KEY = 'erode_portal_lang';

// [English, Tamil]
type Entry = [string, string];

export const STRINGS: Record<string, Entry> = {
  // ── Official header bar ──
  'gov.line': ['GOVERNMENT OF TAMIL NADU · DEPARTMENT OF SCHOOL EDUCATION', 'தமிழ்நாடு அரசு · பள்ளிக் கல்வித் துறை'],
  'gov.portal': ['Chief Educational Officer (CEO), Erode District — Exam Duty Automation Portal', 'தலைமைக் கல்வி அதிகாரி (CEO), ஈரோடு மாவட்டம் — தேர்வுப் பணி ஒதுக்கீட்டு இணையதளம்'],
  'status.online': ['Cloud Synced · D1', 'மேகக் களஞ்சியம் ஒத்திசைந்தது · D1'],
  'status.offline': ['Local-First Mode', 'உள்ளூர் தரவு முறை'],
  'status.syncing': ['Syncing to Cloud…', 'மேகக் களஞ்சியத்தில் பதிவேற்றம்…'],
  'status.checking': ['Connecting…', 'இணைக்கிறது…'],
  'btn.ingest': ['Ingest Master File', 'தரவுப் பதிவேற்றம்'],
  'btn.lang': ['தமிழ்', 'English'],

  // ── Navigation ──
  'nav.dashboard': ['Dashboard', 'முதன்மைத் திரை'],
  'nav.ingest': ['Smart File Ingestion (Excel/PDF)', 'தானியங்கி தரவு பதிவேற்றம் (Excel/PDF)'],
  'nav.history': ['Duty History Ledger', 'பணி வரலாற்றுப் பதிவேடு'],
  'nav.map': ['GPS Coordinate Capture', 'GPS ஆள்கூறு பதிவு'],
  'nav.theory': ['Theory Allotment', 'கோட்பாட்டுத் தேர்வு ஒதுக்கீடு'],
  'nav.practical': ['Practical Allotment', 'செயல்முறைத் தேர்வு ஒதுக்கீடு'],
  'nav.hall': ['Hall Invigilation', 'அரங்க கண்காணிப்பு'],
  'nav.schools': ['Schools Registry', 'பள்ளிகள் பட்டியல்'],
  'nav.centres': ['Exam Centres', 'தேர்வு மையங்கள்'],
  'nav.teachers': ['Faculty Database', 'ஆசிரியர் தரவுத்தளம்'],
  'nav.reports': ['Official Orders & PDF', 'அதிகாரப்பூர்வ ஆணைகள் & PDF'],
  'nav.audit': ['Audit & Cloud Backup', 'தணிக்கை & மேக காப்பு'],

  // ── Dashboard ──
  'dash.badge': ['Erode CEO Office Examination Command Center', 'ஈரோடு CEO அலுவலகத் தேர்வுக் கட்டுப்பாட்டு மையம்'],
  'dash.h1': ['State Board Public Examinations Duty Allotment System', 'அரசு வாரியப் பொதுத் தேர்வுகள் பணி ஒதுக்கீட்டு அமைப்பு'],
  'dash.para': [
    'Automating Theory Duty (HMs/Chief/DO), Practical Laboratories, and Hall Invigilation across {blocks} Educational Blocks with strict ≤ 10 km distance, 2-year no-repeat, and equitable fairness rules.',
    'கடும் 10 கி.மீ. இடைத்தூர விதி, 2-ஆண்டு மறு-பணி தடை மற்றும் நியாயமான சமபங்கு விதிகளுடன், {blocks} கல்வி வட்டங்களில் கோட்பாட்டுப் பணி (தலைமை ஆசிரியர்/முதன்மை/துறை அதிகாரி), செயல்முறைத் தேர்வு மற்றும் அரங்க கண்காணிப்பு பணிகளை தானியங்கியாக்குகிறது.',
  ],
  'dash.activeCycle': ['Active Exam Cycle:', 'நடப்பு தேர்வுக் காலம்:'],
  'dash.to': ['to', 'முதல்'],
  'dash.centres': ['Exam Centres', 'தேர்வு மையங்கள்'],
  'dash.centresSub': ['Across {blocks} blocks', '{blocks} வட்டங்களில்'],
  'dash.schools': ['Schools Master', 'பள்ளிகள்'],
  'dash.schoolsSub': ['Govt & Aided HSS', 'அரசு & நிதியுதவி மேல்நிலைப் பள்ளிகள்'],
  'dash.faculty': ['Faculty Pool', 'ஆசிரியர் பட்டியல்'],
  'dash.exempted': ['{n} staff exempted', '{n} பேர் விதிவிலக்கு'],
  'dash.compliance': ['Distance Compliance', 'இடைத்தூர இணக்கம்'],
  'dash.within10': ['Within 10 km limit', '10 கி.மீ. வரம்பிற்குள்'],
  'dash.module': ['Module {n}', 'பகுதி {n}'],
  'dash.theoryTitle': ['Theory Duty Engine', 'கோட்பாட்டுப் பணி இயந்திரம்'],
  'dash.theoryDesc': ['Chief Superintendents & Department Officers with HM own-school exclusions and seniority fallback.', 'தலைமை ஆசிரியர் சொந்தப் பள்ளி விலக்கு மற்றும் மூத்த தரவரிசை மாற்று வழியுடன் முதன்மை கண்காணிப்பாளர் & துறை அதிகாரிகள்.'],
  'dash.practicalTitle': ['Practical Duty Engine', 'செயல்முறைத் தேர்வு இயந்திரம்'],
  'dash.practicalDesc': ['50-student batch splits, parallel FN/AN sessions, and automatic paired role swapping.', '50 மாணவர் தொகுதிப் பிரிப்பு, இணை FN/AN அமர்வுகள், மற்றும் தானியங்கி இணை பங்கு மாற்றம்.'],
  'dash.hallTitle': ['Hall Invigilation Engine', 'அரங்க கண்காணிப்பு இயந்திரம்'],
  'dash.hallDesc': ['1 invigilator per 20 students + 10% standby pool with 2-year no-repeat and exemption filters.', '20 மாணவர்களுக்கு 1 கண்காணிப்பாளர் + 10% கூடுதல் பணியாளர், 2-ஆண்டு தடை மற்றும் விதிவிலக்கு வடிகட்டலுடன்.'],
  'dash.launchTheory': ['Launch Theory Wizard', 'கோட்பாட்டு வழிகாட்டியைத் தொடங்கு'],
  'dash.launchPractical': ['Launch Practical Wizard', 'செயல்முறை வழிகாட்டியைத் தொடங்கு'],
  'dash.launchHall': ['Launch Hall Wizard', 'அரங்க வழிகாட்டியைத் தொடங்கு'],
  'dash.allotted': ['{n} Allotted', '{n} ஒதுக்கப்பட்டது'],
  'dash.examiners': ['{n} Examiners', '{n} தேர்வாளர்கள்'],
  'dash.staff': ['{n} Staff', '{n} பணியாளர்கள்'],
  'dash.emptyTitle': ['Ready for Master Data Ingestion', 'முதன்மைத் தரவு பதிவேற்றத்திற்கு தயார்'],
  'dash.emptyBtn': ['Upload Master Excel / PDF Files', 'Excel / PDF கோப்புகளைப் பதிவேற்று'],
  'dash.loading': ['Connecting to district master database…', 'மாவட்ட முதன்மைத் தரவுத்தளத்துடன் இணைக்கிறது…'],

  // ── Footer ──
  'footer.line': ['© 2026 Chief Educational Officer, Erode District · Department of School Education, Govt. of Tamil Nadu.', '© 2026 தலைமைக் கல்வி அதிகாரி, ஈரோடு மாவட்டம் · பள்ளிக் கல்வித் துறை, தமிழ்நாடு அரசு.'],
  'footer.cost': ['Monthly Cost: Rs. 0', 'மாதச் செலவு: ரூ. 0'],

  // ── Ingestion view ──
  'ing.badge': ['Smart Document Ingestion & Auto-Geocoding Engine', 'தானியங்கி ஆவண பதிவேற்றம் & தானியங்கி GPS இடங்குறிப்பு இயந்திரம்'],
  'ing.h1': ['Universal Excel, CSV & PDF Roster Ingestion', 'எல்லா வகை Excel, CSV & PDF பட்டியல் பதிவேற்றம்'],
  'ing.dropTitle': ['Drag & Drop or Select Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf) File', 'Excel (.xlsx, .xls), CSV (.csv) அல்லது PDF (.pdf) கோப்பினை இழுத்து விடுக அல்லதுத் தேர்ந்தெடுக்கவும்'],
  'ing.select': ['Select Document to Ingest', 'கோப்பினைத் தேர்ந்து பதிவேற்று'],
  'ing.reviewTitle': ['Review Column Mappings', 'நெடுவரிசை இணைப்புகளைச் சரிபார்க்கவும்'],
  'ing.reviewSub': ['Please confirm or adjust the auto-detected column mappings before parsing the data.', 'தரவினைப் பகுப்பதற்கு முன் தானியங்கியாகக் கண்டறியப்பட்ட நெடுவரிசை இணைப்புகளை உறுதிப்படுத்துக அல்லதுத் திருத்துக.'],
  'ing.confirm': ['Confirm Mapping & Parse', 'இணைப்பை உறுதிப்படுத்தி பகுப்பாய்வு செய்'],
  'ing.entityType': ['Entity Type:', 'தரவு வகை:'],
  'ing.mappedTo': ['Mapped To', 'இணைக்கப்பட்ட புலம்'],
  'ing.header': ['Original Header', 'அசல் தலைப்பு'],
  'ing.sample': ['Sample Values', 'மாதிரி மதிப்புகள்'],
  'ing.confidence': ['Confidence', 'நம்பகத்தன்மை'],
  'ing.skip': ['🚫 Skip this column', '🚫 இந்த நெடுவரிசையைத் தவிர்'],
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      return saved === 'ta' ? 'ta' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // storage unavailable — choice lasts for this session only
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang === 'ta' ? 'ta' : 'en';
  }, [lang]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const entry = STRINGS[key];
    let text = entry ? entry[lang === 'ta' ? 1 : 0] : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
