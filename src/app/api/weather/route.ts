import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

const COUNTRY_MAP: Record<string, string> = {
  VIDP: 'India', VABB: 'India', VOBL: 'India', VOMM: 'India', VOHS: 'India', VECC: 'India',
  OMDB: 'United Arab Emirates', OTHH: 'Qatar', OMAA: 'United Arab Emirates',
  WSSS: 'Singapore', VHHH: 'Hong Kong', RJTT: 'Japan', RKSI: 'South Korea', VTBS: 'Thailand', YSSY: 'Australia',
  EGLL: 'United Kingdom', LFPG: 'France', EHAM: 'Netherlands', EDDF: 'Germany', LTFM: 'Turkey',
  KJFK: 'United States', KORD: 'United States', KLAX: 'United States', KATL: 'United States', CYYZ: 'Canada'
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get('icao')?.trim().toUpperCase();
  const listOnly = searchParams.get('list');

  try {
    if (listOnly === 'true') {
      // Attempt to fetch from Supabase
      const { data: airports, error } = await supabase
        .from('airports_runways')
        .select('icao');
      
      let uniqueIcaos: string[] = [];
      if (!error && airports && airports.length > 0) {
        uniqueIcaos = Array.from(new Set(airports.map(a => a.icao)));
      } else {
        // Fallback to all keys in COUNTRY_MAP if DB query is empty
        uniqueIcaos = Object.keys(COUNTRY_MAP);
      }
      
      const formattedList = uniqueIcaos.map(code => ({
        icao: code,
        country: COUNTRY_MAP[code] || 'International Hubs'
      }));

      return NextResponse.json({ airports: formattedList });
    }

    if (!icao || icao.length < 3) {
      return NextResponse.json({ error: 'Valid ICAO identifier required' }, { status: 400 });
    }

    const noaaRes = await fetch(
      `https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`,
      { cache: 'no-store' }
    );

    if (!noaaRes.ok) {
      return NextResponse.json({ error: `NOAA API error: ${noaaRes.status}` }, { status: 502 });
    }

    const metarData = await noaaRes.json();
    if (!metarData || metarData.length === 0) {
      return NextResponse.json({ error: `No active METAR found for ${icao}` }, { status: 404 });
    }

    const metar = metarData[0];

    const { data: runways, error: dbError } = await supabase
      .from('airports_runways')
      .select('runway_ident, heading_deg, length_ft')
      .eq('icao', icao);

    if (dbError) console.error('Supabase error:', dbError.message);

    return NextResponse.json({
      metar,
      runways: runways || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}