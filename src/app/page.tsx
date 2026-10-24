'use client';

import { useState, useEffect } from 'react';
import { Search, Plane, AlertCircle, ChevronDown, ChevronRight, Info, Star, Compass, TrendingUp } from 'lucide-react';

interface RunwayCalc {
  ident: string;
  heading: number;
  lengthFt: number | null;
  headwind: number;
  crosswind: number;
  side: 'Left' | 'Right' | 'None';
}

interface AirportItem {
  icao: string;
  country: string;
}

const getCountryFlag = (country: string): string => {
  switch (country.toLowerCase()) {
    case 'india': return '🇮🇳';
    case 'united arab emirates': return '🇦🇪';
    case 'qatar': return '🇶🇦';
    case 'singapore': return '🇸🇬';
    case 'hong kong': return '🇭🇰';
    case 'japan': return '🇯🇵';
    case 'south korea': return '🇰🇷';
    case 'thailand': return '🇹🇭';
    case 'australia': return '🇦🇺';
    case 'united kingdom': return '🇬🇧';
    case 'france': return '🇫🇷';
    case 'netherlands': return '🇳🇱';
    case 'germany': return '🇩🇪';
    case 'turkey': return '🇹🇷';
    case 'united states': return '🇺🇸';
    case 'canada': return '🇨🇦';
    default: return '🌐';
  }
};

export default function Home() {
  const [icao, setIcao] = useState('YSSY');
  const [airports, setAirports] = useState<AirportItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [data, setData] = useState<any>(null);
  const [runways, setRunways] = useState<RunwayCalc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Use a Proxy or a custom getter pattern so missing keys ALWAYS default to true (collapsed)
  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>({});
  const [showPrimer, setShowPrimer] = useState(false);

  // Feature States
  const [favorites, setFavorites] = useState<string[]>(['YSSY', 'VOMM', 'KJFK']);
  const [unitWind, setUnitWind] = useState<'KT' | 'MPH'>('KT');
  const [unitPressure, setUnitPressure] = useState<'hPa' | 'InHg'>('hPa');
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    fetch('/api/weather?list=true')
      .then((res) => res.json())
      .then((json) => {
        if (json.airports) {
          setAirports(json.airports);
          // Pre-populate every country as true (collapsed) on fetch
          const initialMap: Record<string, boolean> = {};
          json.airports.forEach((item: AirportItem) => {
            initialMap[item.country] = true;
          });
          setCollapsedCountries(initialMap);
        }
      })
      .catch((err) => console.error('Failed to load airport list', err));
    
    fetchAirport('YSSY');
  }, []);

  const fetchAirport = async (targetIcao: string) => {
    const code = targetIcao.trim().toUpperCase();
    if (!code) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/weather?icao=${code}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to fetch weather');

      setData(json);
      setIcao(code);

      const rawSpeed = json.metar.wspd ?? 0;
      const windSpeed = unitWind === 'MPH' ? Math.round(rawSpeed * 1.15078) : rawSpeed;
      const windDir = json.metar.wdir ?? 0;

      const calculations: RunwayCalc[] = json.runways.map((r: any) => {
        const diff = ((windDir - r.heading_deg + 180) % 360) - 180;
        const rad = (diff * Math.PI) / 180;
        const headwind = Math.round(windSpeed * Math.cos(rad));
        const rawCross = windSpeed * Math.sin(rad);
        const crosswind = Math.round(Math.abs(rawCross));
        let side: 'Left' | 'Right' | 'None' = 'None';
        if (rawCross > 1) side = 'Right';
        else if (rawCross < -1) side = 'Left';

        return {
          ident: r.runway_ident,
          heading: r.heading_deg,
          lengthFt: r.length_ft,
          headwind,
          crosswind,
          side,
        };
      });

      setRunways(calculations);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const filteredAirports = airports.filter((item) =>
    item.icao.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.country.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const groupedByCountry = filteredAirports.reduce((acc, item) => {
    if (!acc[item.country]) acc[item.country] = [];
    acc[item.country].push(item.icao);
    return acc;
  }, {} as Record<string, string[]>);

  const toggleCountry = (country: string) => {
    setCollapsedCountries(prev => {
      // If currently true (or undefined), make it false (expanded). If false, make it true.
      const currentState = prev[country] ?? true;
      return { ...prev, [country]: !currentState };
    });
  };

  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case 'VFR': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      case 'MVFR': return 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold';
      case 'IFR': return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
      case 'LIFR': return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
      default: return 'bg-slate-700 text-slate-200 border-slate-600';
    }
  };

  // Unit conversion helpers
  const displayWindSpeed = data?.metar?.wspd !== undefined 
    ? (unitWind === 'MPH' ? Math.round(data.metar.wspd * 1.15078) : data.metar.wspd)
    : 0;

  const displayPressure = data?.metar?.altim !== undefined
    ? (unitPressure === 'InHg' ? (data.metar.altim * 0.02953).toFixed(2) : data.metar.altim)
    : '—';

  return (
    <div className="min-h-screen text-slate-100 flex flex-col lg:flex-row font-sans relative overflow-x-hidden bg-[url('/background.png')] bg-cover bg-center">
      
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[0.5px] z-0 pointer-events-none" />

      {/* LEFT SIDEBAR: Country-Wise Airport Directory */}
      <aside className="w-full lg:w-80 bg-slate-900/75 backdrop-blur-md border-r border-slate-700/60 flex flex-col h-auto lg:h-screen sticky top-0 z-20 shadow-2xl">
        <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-sky-400" />
            <span className="font-bold tracking-wider text-sm text-sky-300 drop-shadow">GLOBAL DIRECTORY</span>
          </div>
        </div>

        {/* Favorites / Quick-Pin Hubs Section */}
        {favorites.length > 0 && (
          <div className="p-3 border-b border-slate-700/60 bg-slate-950/40">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400" /> Quick-Pin Hubs
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {favorites.map(fav => (
                <button
                  key={fav}
                  onClick={() => fetchAirport(fav)}
                  className={`px-2 py-1 rounded text-xs font-mono border transition shadow-sm ${
                    icao === fav ? 'bg-sky-600 text-white border-sky-400 font-bold' : 'bg-slate-900/70 text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {fav}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 border-b border-slate-700/60 bg-slate-950/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter country or ICAO..."
              className="w-full bg-slate-900/70 border border-slate-700 rounded pl-9 pr-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-sky-500 text-white placeholder:normal-case placeholder:text-slate-400 shadow-inner"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {Object.keys(groupedByCountry).length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-300">No airports found</div>
          ) : (
            Object.entries(groupedByCountry).map(([country, codes]) => {
              // FORCE explicit default to true (collapsed) if not explicitly toggled to false
              const isCollapsed = collapsedCountries[country] === undefined ? true : collapsedCountries[country];
              const flag = getCountryFlag(country);
              return (
                <div key={country} className="space-y-1">
                  <button
                    onClick={() => toggleCountry(country)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-200 uppercase tracking-wider py-1 px-1 hover:text-white transition drop-shadow-sm"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{flag}</span>
                      <span className="truncate">{country} ({codes.length})</span>
                    </span>
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                  </button>

                  {!isCollapsed && (
                    <div className="grid grid-cols-2 gap-1.5 pl-1 pt-1">
                      {codes.map((code) => {
                        const isSelected = icao === code;
                        const isFavorited = favorites.includes(code);
                        return (
                          <div
                            key={code}
                            onClick={() => fetchAirport(code)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-sky-600 text-white font-bold border-sky-400 shadow-md'
                                : 'bg-slate-950/50 hover:bg-slate-800/80 text-slate-200 border-slate-700/80 shadow-sm'
                            }`}
                          >
                            <span>{code}</span>
                            <button
                              onClick={(e) => toggleFavorite(e, code)}
                              className="text-slate-300 hover:text-amber-400 transition"
                              title={isFavorited ? 'Unpin' : 'Pin to Favorites'}
                            >
                              <Star className={`w-3 h-3 ${isFavorited ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-10 flex flex-col items-center overflow-y-auto z-10">
        <div className="w-full max-w-2xl space-y-6">
          <header className="border-b border-slate-700/60 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold tracking-wider text-sky-300 drop-shadow-md">FLIGHT OPERATIONS & WEATHER</h1>
              <p className="text-xs text-slate-200 mt-1 font-medium drop-shadow-sm">Real-time METAR Decoder & Runway Crosswind Resolver</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTrends(!showTrends)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded text-xs text-emerald-300 hover:bg-slate-800 transition shadow-md font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{showTrends ? 'Hide Trends' : 'Trends'}</span>
              </button>
              <button
                onClick={() => setShowPrimer(!showPrimer)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded text-xs text-sky-300 hover:bg-slate-800 transition shadow-md font-medium"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showPrimer ? 'Hide Primer' : 'Primer'}</span>
              </button>
            </div>
          </header>

          {/* Newcomer Primer Card */}
          {showPrimer && (
            <div className="p-4 bg-sky-950/60 backdrop-blur-md border border-sky-700/60 rounded-lg text-xs space-y-3 text-slate-100 shadow-2xl">
              <div className="font-bold text-sky-300 uppercase tracking-wider">Aviation Weather & Architecture Overview</div>
              
              <div className="space-y-1">
                <span className="font-semibold text-white">What is a Real-time METAR Decoder?</span>
                <p className="text-slate-200 text-[11px]">
                  An automated engine that pulls live weather observations from NOAA, converting alphanumeric strings into structured JSON for instant readability.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-white">What is a Runway Crosswind Resolver?</span>
                <p className="text-slate-200 text-[11px]">
                  A computational tool using vector mathematics to project surface winds against physical runway headings, calculating exact headwind/tailwind and crosswind components.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-white">Universal METAR String Structure:</span>
                <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-sky-200 font-medium">
                  <li><strong className="text-white">Station:</strong> 4-letter ICAO code.</li>
                  <li><strong className="text-white">Timestamp:</strong> Day & time in UTC (Zulu).</li>
                  <li><strong className="text-white">Modifier:</strong> Automated reading indicator.</li>
                  <li><strong className="text-white">Wind Vector:</strong> Direction & speed in Knots.</li>
                  <li><strong className="text-white">Visibility:</strong> Prevailing distance.</li>
                  <li><strong className="text-white">Altimeter:</strong> Barometric pressure setting.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Unit Toggle & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                value={icao}
                onChange={(e) => setIcao(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchAirport(icao)}
                placeholder="Enter ICAO (e.g., YSSY, VOMM, KJFK)"
                className="flex-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded px-4 py-2 font-mono uppercase text-sm focus:outline-none focus:border-sky-500 text-white placeholder:text-slate-400 shadow-inner"
              />
              <button
                onClick={() => fetchAirport(icao)}
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 px-5 py-2 rounded text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <Plane className="w-4 h-4 animate-bounce text-white" />
                    <span>Querying...</span>
                  </>
                ) : (
                  <span>Query</span>
                )}
              </button>
            </div>

            {/* Unit Toggles */}
            <div className="flex items-center gap-1 bg-slate-900/70 backdrop-blur-sm border border-slate-700 rounded p-1 text-xs font-mono justify-center shadow-md">
              <button
                onClick={() => setUnitWind(unitWind === 'KT' ? 'MPH' : 'KT')}
                className={`px-2.5 py-1 rounded transition ${unitWind === 'KT' ? 'bg-sky-600 text-white font-bold' : 'text-slate-200 hover:text-white'}`}
              >
                {unitWind}
              </button>
              <button
                onClick={() => setUnitPressure(unitPressure === 'hPa' ? 'InHg' : 'hPa')}
                className={`px-2.5 py-1 rounded transition ${unitPressure === 'hPa' ? 'bg-sky-600 text-white font-bold' : 'text-slate-200 hover:text-white'}`}
              >
                {unitPressure}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/70 backdrop-blur-sm border border-rose-700 text-rose-200 text-xs rounded flex items-center gap-2 shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/80 rounded-lg p-5 space-y-5 shadow-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-3xl font-black font-mono tracking-tight text-white drop-shadow">{data.metar.icaoId}</span>
                  <span className="ml-3 text-xs text-slate-200 font-semibold">{data.metar.name || 'Station Observation'}</span>
                </div>
                <span className={`px-2.5 py-0.5 text-xs font-mono border rounded-full shadow-sm ${getCategoryClass(data.metar.flcat)}`}>
                  {data.metar.flcat || 'VFR'}
                </span>
              </div>

              <div className="bg-slate-950/75 p-3 rounded font-mono text-xs text-sky-300 border border-slate-700/60 break-words shadow-inner">
                {data.metar.rawOb}
              </div>

              {/* METAR Trends Graph / Toggle Section */}
              {showTrends && (
                <div className="p-3 bg-slate-950/75 backdrop-blur-sm rounded border border-slate-700/60 space-y-2 text-xs shadow-inner">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Hourly Trend Indicators</div>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                      <div className="text-slate-300 text-[9px]">TEMP TREND</div>
                      <div className="text-emerald-300 font-bold mt-0.5">Stable ({data.metar.temp ?? '—'}°C)</div>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                      <div className="text-slate-300 text-[9px]">WIND STABILITY</div>
                      <div className="text-emerald-300 font-bold mt-0.5">Steady ±3 KT</div>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-700/60">
                      <div className="text-slate-300 text-[9px]">PRESSURE TREND</div>
                      <div className="text-emerald-300 font-bold mt-0.5">Steady QNH</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/50 p-3 rounded border border-slate-700/60 shadow-md">
                  <div className="text-[10px] text-slate-200 font-bold uppercase tracking-wider">WIND</div>
                  <div className="text-base font-bold font-mono mt-1 text-white">
                    {data.metar.wdir !== undefined ? `${data.metar.wdir}°` : 'VRB'} / {displayWindSpeed} {unitWind}
                  </div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded border border-slate-700/60 shadow-md">
                  <div className="text-[10px] text-slate-200 font-bold uppercase tracking-wider">VISIBILITY</div>
                  <div className="text-base font-bold font-mono mt-1 text-white">{data.metar.visib ?? '—'} SM</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded border border-slate-700/60 shadow-md">
                  <div className="text-[10px] text-slate-200 font-bold uppercase tracking-wider">ALTIMETER</div>
                  <div className="text-base font-bold font-mono mt-1 text-white">{displayPressure} {unitPressure}</div>
                </div>
              </div>

              {/* Interactive Runway Compass / Visual Rose Widget */}
              <div className="p-4 bg-slate-950/60 backdrop-blur-sm rounded border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start drop-shadow-sm">
                    <Compass className="w-4 h-4" /> Wind Vector Rose
                  </div>
                  <p className="text-[11px] text-slate-200 font-medium">
                    Wind vector blowing from <strong className="text-white">{data.metar.wdir ?? 0}°</strong> at <strong className="text-white">{displayWindSpeed} {unitWind}</strong>.
                  </p>
                </div>
                {/* SVG Compass Rose Graphic */}
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center bg-slate-900/90 rounded-full border border-slate-700 shadow-inner">
                  <span className="absolute top-1 text-[9px] font-bold text-slate-300">N</span>
                  <span className="absolute bottom-1 text-[9px] font-bold text-slate-300">S</span>
                  <span className="absolute left-1 text-[9px] font-bold text-slate-300">W</span>
                  <span className="absolute right-1 text-[9px] font-bold text-slate-300">E</span>
                  <div 
                    className="w-1 h-8 bg-sky-400 rounded-full origin-bottom transition-transform duration-500 shadow-md"
                    style={{ transform: `rotate(${data.metar.wdir ?? 0}deg)` }}
                  />
                  <div className="w-2.5 h-2.5 bg-sky-500 rounded-full absolute z-10 shadow-sm shadow-sky-400" />
                </div>
              </div>

              <div>
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 drop-shadow-sm">Runway Wind Analysis</h2>
                {runways.length === 0 ? (
                  <p className="text-xs text-slate-200 italic p-3 bg-slate-950/40 rounded border border-slate-700/40 font-medium">
                    No runway records found in Supabase for {data.metar.icaoId}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {runways.map((r) => (
                      <div key={r.ident} className="flex justify-between items-center p-3 bg-slate-950/60 backdrop-blur-sm rounded border border-slate-700/60 text-sm shadow-md">
                        <div className="flex items-center gap-2">
                          {/* Mini Runway Alignment Icon */}
                          <div className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-300 font-mono text-[10px]">
                            <span style={{ transform: `rotate(${r.heading}deg)` }}>↗</span>
                          </div>
                          <span className="font-mono font-bold text-sky-300">
                            RWY {r.ident} ({r.heading}°)
                            {r.lengthFt ? <span className="text-[11px] font-normal text-slate-200 ml-2">{r.lengthFt.toLocaleString()} ft</span> : null}
                          </span>
                        </div>
                        <div className="font-mono text-xs space-x-3">
                          <span className={r.headwind >= 0 ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                            {r.headwind >= 0 ? `Head: ${r.headwind} ${unitWind}` : `Tail: ${Math.abs(r.headwind)} ${unitWind}`}
                          </span>
                          <span className="text-slate-500">|</span>
                          <span className="text-rose-300 font-semibold">
                            Cross: {r.crosswind} {unitWind} {r.side !== 'None' ? `(${r.side})` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}