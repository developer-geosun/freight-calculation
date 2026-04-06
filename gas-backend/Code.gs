const SHEETS = {
  REQUESTS: 'requests',
  POINTS: 'request_points',
};

function doGet() {
  return jsonResponse_({ ok: true, service: 'freight-gas-backend' });
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    validatePayload_(payload);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestsSheet = getOrCreateSheet_(ss, SHEETS.REQUESTS, [
      'request_id',
      'created_at',
      'email',
      'phone',
      'preferred_start_date',
      'route_comment',
      'distance_km',
      'points_count',
      'route_text',
      'source',
      'lang',
      'user_agent'
    ]);
    const pointsSheet = getOrCreateSheet_(ss, SHEETS.POINTS, [
      'request_id',
      'point_order',
      'point_type',
      'address',
      'lat',
      'lng',
      'country',
      'is_border',
      'segment_distance_km_to_next'
    ]);

    const requestId = String(payload.clientRequestId || Utilities.getUuid());
    const routeText = (payload.route || (payload.points || []).map(function(p) { return p.order + '. ' + (p.address || ''); }).join(' -> '));
    requestsSheet.appendRow([
      requestId,
      String(payload.timestamp || new Date().toISOString()),
      String(payload.email || ''),
      String(payload.phone || ''),
      String(payload.preferredStartDate || ''),
      String(payload.routeComment || ''),
      toNumber_(payload.distanceKm),
      (payload.points || []).length,
      routeText,
      String(payload.source || 'freight-calculation-web'),
      String(payload.lang || ''),
      String(payload.userAgent || '')
    ]);

    const points = payload.points || [];
    if (points.length > 0) {
      const rows = points.map(function(p) {
        return [
          requestId,
          toNumber_(p.order),
          String(p.type || ''),
          String(p.address || ''),
          toNumber_(p.lat),
          toNumber_(p.lng),
          String(p.country || '').toLowerCase(),
          Boolean(p.isBorder),
          toNullableNumber_(p.segmentDistanceKmToNext)
        ];
      });
      pointsSheet.getRange(pointsSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return jsonResponse_({ ok: true, requestId: requestId });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : 'Unknown error'
    });
  }
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) throw new Error('Valid email is required');
  if (!payload.phone || !/^\+?[\d\s\-()]{7,20}$/.test(String(payload.phone))) throw new Error('Valid phone is required');
  if (!Array.isArray(payload.points) || payload.points.length < 2) throw new Error('At least 2 route points are required');
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function toNumber_(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNumber_(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
