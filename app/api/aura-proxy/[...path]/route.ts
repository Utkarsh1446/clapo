import { NextRequest, NextResponse } from 'next/server';

/**
 * Aura API Proxy
 *
 * Forwards all requests from /api/aura-proxy/* to https://server.blazeswap.io/api/aura/*
 * This avoids CORS issues and keeps the backend URL centralized
 */

const BACKEND_API_BASE = 'https://server.blazeswap.io/api/aura';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_API_BASE}/${path}${searchParams ? `?${searchParams}` : ''}`;

    console.log('🔄 Aura Proxy GET:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Aura API Error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Aura API Proxy Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Aura API proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    const url = `${BACKEND_API_BASE}/${path}`;

    console.log('🔄 Aura Proxy POST:', url, body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Aura API Error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Aura API Proxy Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Aura API proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    const url = `${BACKEND_API_BASE}/${path}`;

    console.log('🔄 Aura Proxy PUT:', url, body);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Aura API Error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Aura API Proxy Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Aura API proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const url = `${BACKEND_API_BASE}/${path}`;

    console.log('🔄 Aura Proxy DELETE:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Aura API Error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Aura API Proxy Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Aura API proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
