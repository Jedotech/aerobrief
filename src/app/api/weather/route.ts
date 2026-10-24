import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get('list');
    const icao = searchParams.get('icao');

    if (list === 'true') {
      const { data, error } = await supabase
        .from('airports')
        .select('icao, country');

      if (error) throw error;
      return NextResponse.json({ airports: data || [] });
    }

    if (icao) {
      const code = icao.trim().toUpperCase();
      
      // Fetch station METAR observation
      const metarRes = await fetch(`https://aviationweather.gov/api/data/metar?ids=${code}&format=json`, {
        headers: { 'User-Agent': 'AeroBrief/1.0' }
      });
      
      const metarData = await metarRes.json();
      const metar = Array.isArray(metarData) && metarData.length > 0 ? metarData[0] : null;

      if (!metar) {
        return NextResponse.json({ error: `No METAR data found for ${code}` }, { status: 404 });
      }

      // Fetch runways from Supabase
      const { data: runways, error: rwyError } = await supabase
        .from('runways')
        .select('*')
        .eq('airport_icao', code);

      if (rwyError) {
        console.error('Supabase runway fetch error:', rwyError);
      }

      return NextResponse.json({
        metar,
        runways: runways || []
      });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}