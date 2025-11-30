import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { networkInterfaces } from 'os';

export const GET: RequestHandler = async () => {
  try {
    const nets = networkInterfaces();
    const results: string[] = [];

    // Look for local network IP addresses
    for (const name of Object.keys(nets)) {
      const netInfo = nets[name];
      if (!netInfo) continue;

      for (const net of netInfo) {
        // Skip internal (loopback) and non-IPv4 addresses
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
        if (net.family === familyV4Value && !net.internal) {
          results.push(net.address);
        }
      }
    }

    // Prefer 192.168.x.x addresses (most common home networks)
    const preferred = results.find(ip => ip.startsWith('192.168.')) || results[0];

    if (!preferred) {
      return json({
        success: false,
        error: 'No local network IP found'
      }, { status: 404 });
    }

    return json({
      success: true,
      ip: preferred,
      allIps: results
    });

  } catch (error) {
    console.error('Error detecting network info:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
